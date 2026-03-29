package br.com.madeireira.modules.fiscal.application

import br.com.madeireira.modules.fiscal.api.dto.NfListItemResponse
import br.com.madeireira.modules.fiscal.api.dto.VendaPendenteNfResponse
import br.com.madeireira.modules.fiscal.domain.model.AmbienteNf
import br.com.madeireira.modules.fiscal.domain.model.ModeloNf
import br.com.madeireira.modules.fiscal.domain.model.NfEmitida
import br.com.madeireira.modules.fiscal.domain.model.StatusNf
import br.com.madeireira.modules.fiscal.infrastructure.NfRepository
import br.com.madeireira.modules.produto.infrastructure.ProdutoRepository
import br.com.madeireira.modules.venda.application.VendaService
import br.com.madeireira.modules.venda.infrastructure.VendaRepository
import java.time.Instant
import java.util.UUID

class NfeService(
    private val nfRepo: NfRepository,
    private val vendaRepo: VendaRepository,
    private val produtoRepo: ProdutoRepository,
    private val vendaService: VendaService,
    private val emissor: NfEmissaoPort = NfEmissaoStub(),
) {
    // ── Listagem ──────────────────────────────────────────────────────────────

    suspend fun listar(limit: Int = 100): List<NfListItemResponse> {
        val nfs = nfRepo.findAll(limit)
        val vendaIds = nfs.mapNotNull { it.vendaId }.distinct()
        val vendas = vendaIds
            .mapNotNull { id -> vendaRepo.findVendaById(id)?.let { id to it } }
            .toMap()

        return nfs.map { nf ->
            val venda = nf.vendaId?.let { vendas[it] }
            nf.toResponse(vendaNumero = venda?.numero)
        }
    }

    suspend fun listarPendentes(limit: Int = 50): List<VendaPendenteNfResponse> {
        val idsComNf = nfRepo.vendaIdsComNf(excluirStatus = setOf(StatusNf.CANCELADA))
        return vendaRepo.findAll(500)
            .filter { (venda, _) ->
                venda.status.name == "CONFIRMADO" && venda.id !in idsComNf
            }
            .take(limit)
            .map { (venda, clienteNome) ->
                VendaPendenteNfResponse(
                    vendaId        = venda.id.toString(),
                    vendaNumero    = venda.numero,
                    clienteNome    = clienteNome,
                    valorTotal     = venda.valorTotal.toPlainString(),
                    formaPagamento = venda.formaPagamento?.name,
                    createdAt      = venda.createdAt.toString(),
                )
            }
    }

    // ── Emissão ───────────────────────────────────────────────────────────────

    suspend fun emitir(vendaId: UUID): NfListItemResponse {
        val venda = vendaRepo.findVendaById(vendaId)
            ?: throw NoSuchElementException("Venda não encontrada: $vendaId")

        require(venda.status.name == "CONFIRMADO") {
            "Venda ${venda.numero} não está confirmada (status: ${venda.status})"
        }

        val nfExistente = nfRepo.findByVendaId(vendaId)
        if (nfExistente != null && nfExistente.statusSefaz != StatusNf.CANCELADA) {
            throw IllegalStateException(
                "Já existe NF ${nfExistente.numero}/${nfExistente.serie} para a venda ${venda.numero} " +
                "(status: ${nfExistente.statusSefaz})"
            )
        }

        val serie  = "001"
        val numero = nfRepo.proximoNumero(serie)
        val itens  = vendaRepo.findItensByVendaId(vendaId)
        val nfItens = itens.map { item ->
            val produto = produtoRepo.findById(item.produtoId)
                ?: throw NoSuchElementException("Produto não encontrado: ${item.produtoId}")
            vendaService.montarNfItem(item = item, produto = produto, numeroItem = item.numeroLinha)
        }

        val now = Instant.now()
        val request = NfEmissaoRequest(
            vendaId      = vendaId,
            vendaNumero  = venda.numero,
            dataEmissao  = now,
            serie        = serie,
            numero       = numero,
            itens        = nfItens,
            valorTotal   = venda.valorTotal,
        )

        val resultado = emissor.emitir(request)

        val nf = NfEmitida(
            id                    = UUID.randomUUID(),
            vendaId               = vendaId,
            tipoOperacao          = "SAIDA_VENDA",
            modelo                = ModeloNf.NF55,
            numero                = numero,
            serie                 = serie,
            chaveAcesso           = resultado.chaveAcesso,
            statusSefaz           = resultado.status,
            ambiente              = AmbienteNf.HOMOLOGACAO,
            dataEmissao           = now,
            dataAutorizacao       = if (resultado.status == StatusNf.AUTORIZADA) now else null,
            protocoloAutorizacao  = if (resultado.status == StatusNf.AUTORIZADA) resultado.protocolo else null,
            xmlAutorizado         = resultado.xml,
            motivoRejeicao        = resultado.motivoRejeicao,
            chaveCorrelacao       = UUID.randomUUID(),
            tentativasEnvio       = 1,
            justificativaCancel   = null,
            dataCancelamento      = null,
            protocoloCancelamento = null,
            createdAt             = now,
        )

        val salva = nfRepo.insert(nf)
        return salva.toResponse(vendaNumero = venda.numero)
    }

    // ── Cancelamento ─────────────────────────────────────────────────────────

    suspend fun cancelar(nfId: UUID, justificativa: String): NfListItemResponse {
        require(justificativa.length >= 15) {
            "Justificativa de cancelamento deve ter pelo menos 15 caracteres"
        }

        val nf = nfRepo.findById(nfId)
            ?: throw NoSuchElementException("NF não encontrada: $nfId")

        require(nf.statusSefaz == StatusNf.AUTORIZADA) {
            "Apenas NF autorizadas podem ser canceladas (status atual: ${nf.statusSefaz})"
        }

        val chave = requireNotNull(nf.chaveAcesso) { "NF sem chave de acesso" }
        val resultado = emissor.cancelar(chave, justificativa)

        val atualizada = nf.copy(
            statusSefaz           = resultado.status,
            justificativaCancel   = justificativa,
            dataCancelamento      = Instant.now(),
            protocoloCancelamento = resultado.protocolo,
        )

        val salva = nfRepo.update(atualizada)
        val venda = nf.vendaId?.let { vendaRepo.findVendaById(it) }
        return salva.toResponse(vendaNumero = venda?.numero)
    }
}

// ── Mapper ────────────────────────────────────────────────────────────────────

private fun NfEmitida.toResponse(vendaNumero: String?) = NfListItemResponse(
    id                   = id.toString(),
    vendaId              = vendaId?.toString(),
    vendaNumero          = vendaNumero,
    numero               = numero,
    serie                = serie,
    statusSefaz          = statusSefaz.name,
    ambiente             = ambiente.name,
    chaveAcesso          = chaveAcesso,
    dataEmissao          = dataEmissao.toString(),
    dataAutorizacao      = dataAutorizacao?.toString(),
    protocoloAutorizacao = protocoloAutorizacao,
    motivoRejeicao       = motivoRejeicao,
)
