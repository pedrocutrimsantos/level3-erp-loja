package br.com.madeireira.modules.fiscal.application

import br.com.madeireira.modules.cliente.infrastructure.ClienteRepository
import br.com.madeireira.modules.compra.api.dto.EntradaCompraRequest
import br.com.madeireira.modules.compra.application.CompraService
import io.github.oshai.kotlinlogging.KotlinLogging
import br.com.madeireira.modules.empresa.infrastructure.EmpresaRepositoryImpl
import br.com.madeireira.modules.fiscal.api.dto.*
import br.com.madeireira.modules.fiscal.domain.model.AmbienteNf
import br.com.madeireira.modules.fiscal.domain.model.ModeloNf
import br.com.madeireira.modules.fiscal.domain.model.NfEmitida
import br.com.madeireira.modules.fiscal.domain.model.StatusNf
import br.com.madeireira.modules.fiscal.infrastructure.NfItemParaInserir
import br.com.madeireira.modules.fiscal.infrastructure.NfRepository
import br.com.madeireira.modules.fiscal.infrastructure.sefaz.SefazCertificadoLoader
import br.com.madeireira.modules.fiscal.infrastructure.sefaz.SefazDirectAdapter
import br.com.madeireira.modules.fiscal.infrastructure.sefaz.SefazEmissorConfig
import br.com.madeireira.modules.produto.infrastructure.ProdutoRepository
import br.com.madeireira.modules.venda.application.VendaService
import br.com.madeireira.modules.venda.infrastructure.VendaRepository
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.util.UUID

private val log = KotlinLogging.logger {}

class NfeService(
    private val nfRepo: NfRepository,
    private val vendaRepo: VendaRepository,
    private val produtoRepo: ProdutoRepository,
    private val vendaService: VendaService,
    private val compraService: CompraService? = null,
    private val emissorFallback: NfEmissaoPort = NfEmissaoStub(),   // usado se empresa não tiver token
    private val clienteRepo: ClienteRepository? = null,
    private val xmlArquivador: XmlNfeArquivador = XmlNfeArquivadorLocal(),
    private val empresaRepo: EmpresaRepositoryImpl? = null,
) {

    /**
     * Resolve o adapter correto para o tenant:
     *   1. Certificado salvo no banco (upload pelo usuário na tela de Empresa) — fonte primária
     *   2. Variável de ambiente NFE_CERT_PATH — fallback de servidor
     *   3. emissorFallback (stub) — se nenhuma fonte estiver configurada
     */
    private suspend fun resolverEmissor(): NfEmissaoPort {
        val empresa = empresaRepo?.get() ?: return emissorFallback
        val config  = SefazEmissorConfig.fromEmpresa(empresa)

        // Fonte 1: certificado salvo no banco pelo usuário
        val certBd = empresa.certificadoNfeBytes?.let { bytes ->
            val senha = empresa.certificadoNfeSenha ?: return@let null
            runCatching { SefazCertificadoLoader.carregarDeBytes(bytes, senha) }
                .onFailure { log.warn { "Falha ao carregar cert do banco: ${it.message}" } }
                .getOrNull()
        }
        if (certBd != null) {
            return SefazDirectAdapter(config = config, keyStore = certBd.keyStore, senha = certBd.senha)
        }

        // Fonte 2: variável de ambiente
        val certEnv = SefazCertificadoLoader.carregarComSenha()
        if (certEnv != null) {
            return SefazDirectAdapter(config = config, keyStore = certEnv.keyStore, senha = certEnv.senha)
        }

        return emissorFallback
    }
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

        // Carrega configuração da empresa antes de tudo — serieNfe e ambienteNfe são necessários
        val empresa    = empresaRepo?.get()
        val ambienteNf = when (empresa?.ambienteNfe?.uppercase()) {
            "PRODUCAO" -> AmbienteNf.PRODUCAO
            else       -> AmbienteNf.HOMOLOGACAO
        }

        val serie  = empresa?.serieNfe?.takeIf { it.isNotBlank() } ?: "001"
        val numero = nfRepo.proximoNumero(serie)
        val itens  = vendaRepo.findItensByVendaId(vendaId)
        val nfItens = itens.map { item ->
            val produto = produtoRepo.findById(item.produtoId)
                ?: throw NoSuchElementException("Produto não encontrado: ${item.produtoId}")
            vendaService.montarNfItem(item = item, produto = produto, numeroItem = item.numeroLinha)
        }

        val cliente = venda.clienteId?.let { clienteRepo?.findById(it) }
        val clienteCpfCnpj = cliente?.cnpjCpf?.replace(Regex("[^0-9]"), "")

        val now = Instant.now()
        val request = NfEmissaoRequest(
            vendaId        = vendaId,
            vendaNumero    = venda.numero,
            dataEmissao    = now,
            serie          = serie,
            numero         = numero,
            itens          = nfItens,
            valorTotal     = venda.valorTotal,
            formaPagamento = venda.formaPagamento,
            clienteNome    = cliente?.razaoSocial,
            clienteCpfCnpj = clienteCpfCnpj,
        )

        // Valida relógio antes de emitir — SEFAZ rejeita desvio > 5 min (código 205)
        RelogioNfeValidator.validar()

        val resultado = resolverEmissor().emitir(request)

        // Arquiva XML antes do commit no banco — se o banco falhar, o XML não é perdido
        if (!resultado.xml.isNullOrBlank() && resultado.chaveAcesso.length == 44) {
            xmlArquivador.arquivar(resultado.chaveAcesso, resultado.xml)
        }

        val nf = NfEmitida(
            id                    = UUID.randomUUID(),
            vendaId               = vendaId,
            tipoOperacao          = "SAIDA_VENDA",
            modelo                = ModeloNf.NF55,
            numero                = numero,
            serie                 = serie,
            chaveAcesso           = resultado.chaveAcesso,
            statusSefaz           = resultado.status,
            ambiente              = ambienteNf,
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

        // Grava itens em nf_item — necessário para SPED EFD Bloco C e rastreabilidade fiscal
        val cfop = empresa?.cfopPadrao?.takeIf { it.isNotBlank() } ?: "5102"
        val itensParaInserir = itens.zip(nfItens).mapIndexed { idx, (itemVenda, nfItemData) ->
            val qtd   = BigDecimal(nfItemData.quantidadeComercial)
            val vUnit = BigDecimal(nfItemData.valorUnitario)
            NfItemParaInserir(
                nfId                   = salva.id,
                itemVendaId            = itemVenda.id,
                numeroItem             = idx + 1,
                codigoProduto          = nfItemData.codigoProduto,
                descricao              = nfItemData.descricao,
                ncm                   = nfItemData.ncm,
                cfop                  = cfop,
                unidadeComercial       = nfItemData.unidadeComercial,
                quantidadeComercial    = qtd,
                valorUnitarioComercial = vUnit,
                valorTotal             = (qtd * vUnit).setScale(2, RoundingMode.HALF_UP),
            )
        }
        nfRepo.insertItens(itensParaInserir)

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
        val vendaIdCancel = requireNotNull(nf.vendaId) { "NF sem venda associada" }
        val resultado = resolverEmissor().cancelar(
            vendaId      = vendaIdCancel,
            chaveAcesso  = chave,
            justificativa = justificativa,
            nProt        = nf.protocoloAutorizacao ?: "",
        )

        val atualizada = nf.copy(
            statusSefaz           = resultado.status,
            justificativaCancel   = justificativa,
            dataCancelamento      = Instant.now(),
            protocoloCancelamento = resultado.protocolo,
        )

        val salva = nfRepo.update(atualizada)
        val venda = vendaRepo.findVendaById(vendaIdCancel)
        return salva.toResponse(vendaNumero = venda?.numero)
    }

    // ── Reprocessamento de NF AGUARDANDO ─────────────────────────────────────

    /**
     * Re-consulta o status de uma NF-e travada em [StatusNf.AGUARDANDO] na SEFAZ.
     *
     * Ocorre quando a SEFAZ demora mais que o polling de 30 s na emissão original.
     * SefazDirectAdapter suporta consulta por chave via NFeConsultaProtocolo4.
     * O stub retorna null — não há estado para consultar.
     *
     * @throws NoSuchElementException se a NF não existir
     * @throws IllegalStateException se a NF não estiver em AGUARDANDO
     */
    suspend fun reprocessar(nfId: UUID): NfListItemResponse {
        val nf = nfRepo.findById(nfId)
            ?: throw NoSuchElementException("NF não encontrada: $nfId")

        require(nf.statusSefaz == StatusNf.AGUARDANDO) {
            "Só é possível reprocessar NF-e em status AGUARDANDO (status atual: ${nf.statusSefaz})"
        }

        val vendaId = requireNotNull(nf.vendaId) { "NF sem venda associada: $nfId" }
        val chave   = nf.chaveAcesso

        val emissor = resolverEmissor()

        // Usa consultarPorChave quando a chave está disponível (SefazDirectAdapter).
        // Cai em consultarStatus (legado) se a chave ainda não foi gerada.
        val resultado: NfEmissaoResult? = when {
            !chave.isNullOrBlank() && chave.length == 44 -> {
                log.info { "reprocessar: consultando NF $nfId por chave ${chave.take(8)}…" }
                emissor.consultarPorChave(chave)
            }
            else -> emissor.consultarStatus(vendaId)
        }

        if (resultado == null) {
            log.info { "reprocessar: adapter não retornou status — NF $nfId permanece AGUARDANDO" }
            val venda = vendaRepo.findVendaById(vendaId)
            return nf.toResponse(vendaNumero = venda?.numero)
        }

        log.info { "reprocessar: NF $nfId status atualizado para ${resultado.status}" }

        // Arquiva XML se chegou autorizado
        if (!resultado.xml.isNullOrBlank() && resultado.chaveAcesso.length == 44) {
            xmlArquivador.arquivar(resultado.chaveAcesso, resultado.xml)
        }

        val now = Instant.now()
        val atualizada = nf.copy(
            chaveAcesso          = resultado.chaveAcesso.ifBlank { nf.chaveAcesso },
            statusSefaz          = resultado.status,
            protocoloAutorizacao = resultado.protocolo.ifBlank { nf.protocoloAutorizacao },
            dataAutorizacao      = if (resultado.status == StatusNf.AUTORIZADA) now else nf.dataAutorizacao,
            xmlAutorizado        = resultado.xml ?: nf.xmlAutorizado,
            motivoRejeicao       = resultado.motivoRejeicao,
            tentativasEnvio      = nf.tentativasEnvio + 1,
        )

        val salva = nfRepo.update(atualizada)
        val venda = vendaRepo.findVendaById(vendaId)
        return salva.toResponse(vendaNumero = venda?.numero)
    }

    // ── XML Import ───────────────────────────────────────────────────────────────

    fun previewXml(xmlBytes: ByteArray): NfeXmlPreviewResponse =
        XmlNfeParser.parse(xmlBytes)

    suspend fun importarXml(req: NfeXmlConfirmarRequest): NfeXmlImportarResponse {
        val svc = compraService
            ?: throw IllegalStateException("CompraService não configurado para importação de XML")

        val erros = mutableListOf<String>()
        var importados = 0

        for (item in req.itens) {
            runCatching {
                svc.registrarEntrada(
                    EntradaCompraRequest(
                        produtoId              = item.produtoId,
                        quantidade             = item.quantidade,
                        custoUnitario          = item.valorUnitario,
                        fornecedorId           = req.fornecedorId,
                        dataVencimento         = null,
                        formaPagamentoPrevisto = null,
                        observacao             = item.observacao
                            ?: "Importado via XML NF-e ${req.chaveAcesso?.take(8) ?: ""}",
                    )
                )
                importados++
            }.onFailure { e ->
                erros.add("${item.descricao}: ${e.message}")
            }
        }

        return NfeXmlImportarResponse(itensImportados = importados, erros = erros)
    }

    // ── DANFE ─────────────────────────────────────────────────────────────────

    suspend fun getDanfeData(nfId: UUID): DanfeResponse =
        nfRepo.getDanfeData(nfId)
            ?: throw NoSuchElementException("NF não encontrada: $nfId")
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
