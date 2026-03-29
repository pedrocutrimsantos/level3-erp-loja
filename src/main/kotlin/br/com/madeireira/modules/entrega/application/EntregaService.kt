package br.com.madeireira.modules.entrega.application

import br.com.madeireira.modules.entrega.api.dto.*
import br.com.madeireira.modules.entrega.domain.model.Entrega
import br.com.madeireira.modules.entrega.domain.model.StatusEntrega
import br.com.madeireira.modules.entrega.domain.model.TurnoEntrega
import br.com.madeireira.modules.entrega.infrastructure.EntregaRepository
import br.com.madeireira.modules.produto.domain.model.TipoProduto
import br.com.madeireira.modules.produto.infrastructure.ProdutoRepository
import br.com.madeireira.modules.venda.domain.model.ItemVenda
import br.com.madeireira.modules.venda.domain.model.StatusItemEntrega
import br.com.madeireira.modules.venda.domain.model.StatusVenda
import br.com.madeireira.modules.venda.infrastructure.VendaRepository
import kotlinx.datetime.LocalDate
import java.time.Instant
import java.util.UUID

class EntregaService(
    private val entregaRepo: EntregaRepository,
    private val vendaRepo: VendaRepository,
    private val produtoRepo: ProdutoRepository,
) {
    /** Cria romaneio de entrega a partir de uma venda confirmada. */
    suspend fun criarEntrega(vendaId: UUID, req: CriarEntregaRequest): EntregaResponse {
        val venda = vendaRepo.findVendaById(vendaId)
            ?: throw NoSuchElementException("Venda não encontrada: $vendaId")

        require(venda.status in listOf(StatusVenda.CONFIRMADO, StatusVenda.ENTREGUE_PARCIAL)) {
            "Venda ${venda.numero} não pode gerar entrega (status: ${venda.status})"
        }

        val pendente = entregaRepo.findPendentePorVenda(vendaId)
        require(pendente == null) { "Já existe uma entrega pendente para esta venda" }

        val dataAgendada = req.dataAgendada?.let {
            runCatching { LocalDate.parse(it) }.getOrElse {
                throw IllegalArgumentException("Data inválida: $it (esperado yyyy-MM-dd)")
            }
        }
        val turno = req.turno?.let {
            runCatching { TurnoEntrega.valueOf(it) }.getOrElse {
                throw IllegalArgumentException("Turno inválido: $it (esperado MANHA, TARDE ou DIA_TODO)")
            }
        }

        val now = Instant.now()
        val entrega = Entrega(
            id              = UUID.randomUUID(),
            vendaId         = vendaId,
            numero          = "ENT-${System.currentTimeMillis()}",
            status          = StatusEntrega.PENDENTE,
            observacao      = req.observacao?.trim()?.takeIf { it.isNotEmpty() },
            enderecoEntrega = req.enderecoEntrega?.trim()?.takeIf { it.isNotEmpty() },
            dataAgendada    = dataAgendada,
            turno           = turno,
            motorista       = req.motorista?.trim()?.takeIf { it.isNotEmpty() },
            createdAt       = now,
            updatedAt       = now,
        )
        entregaRepo.criar(entrega)
        vendaRepo.updateStatus(vendaId, StatusVenda.EM_ENTREGA)

        val itens = vendaRepo.findItensByVendaId(vendaId)
        return toResponse(entrega, venda.numero, itens)
    }

    /** Lista todas as entregas em ordem decrescente de criação. */
    suspend fun listar(): List<EntregaResumoResponse> {
        return entregaRepo.findAll().map { (entrega, vendaNumero, clienteNome) ->
            val itens = vendaRepo.findItensByVendaId(entrega.vendaId)
            EntregaResumoResponse(
                id              = entrega.id.toString(),
                vendaId         = entrega.vendaId.toString(),
                vendaNumero     = vendaNumero,
                clienteNome     = clienteNome,
                numero          = entrega.numero,
                status          = entrega.status.name,
                observacao      = entrega.observacao,
                enderecoEntrega = entrega.enderecoEntrega,
                dataAgendada    = entrega.dataAgendada?.toString(),
                turno           = entrega.turno?.name,
                motorista       = entrega.motorista,
                createdAt       = entrega.createdAt.toString(),
                totalItens      = itens.size,
                itensEntregues  = itens.count { it.statusEntrega == StatusItemEntrega.ENTREGUE },
            )
        }
    }

    /** Retorna detalhes de uma entrega com todos os seus itens. */
    suspend fun buscarPorId(id: UUID): EntregaResponse {
        val entrega = entregaRepo.findById(id)
            ?: throw NoSuchElementException("Entrega não encontrada: $id")
        val venda = vendaRepo.findVendaById(entrega.vendaId)
            ?: throw IllegalStateException("Venda não encontrada para a entrega $id")
        val itens = vendaRepo.findItensByVendaId(entrega.vendaId)
        return toResponse(entrega, venda.numero, itens)
    }

    /** Confirma os itens efetivamente entregues e atualiza o status da venda. */
    suspend fun confirmarEntrega(entregaId: UUID, req: ConfirmarEntregaRequest): EntregaResponse {
        val entrega = entregaRepo.findById(entregaId)
            ?: throw NoSuchElementException("Entrega não encontrada: $entregaId")

        require(entrega.status == StatusEntrega.PENDENTE) {
            "Entrega ${entrega.numero} já foi concluída ou cancelada"
        }

        val entreguesIds = req.itensEntregues.map { UUID.fromString(it) }.toSet()
        val todosItens = vendaRepo.findItensByVendaId(entrega.vendaId)

        for (item in todosItens) {
            if (item.id in entreguesIds) {
                vendaRepo.updateStatusEntregaItem(item.id, StatusItemEntrega.ENTREGUE)
            }
        }

        entregaRepo.updateStatus(entregaId, StatusEntrega.CONCLUIDA)

        val itensAtualizados = vendaRepo.findItensByVendaId(entrega.vendaId)
        val todoEntregue = itensAtualizados.all {
            it.statusEntrega == StatusItemEntrega.ENTREGUE || it.statusEntrega == StatusItemEntrega.DEVOLVIDO
        }
        vendaRepo.updateStatus(
            entrega.vendaId,
            if (todoEntregue) StatusVenda.CONCLUIDO else StatusVenda.ENTREGUE_PARCIAL,
        )

        val entregaAtualizada = entregaRepo.findById(entregaId)!!
        val venda = vendaRepo.findVendaById(entrega.vendaId)!!
        return toResponse(entregaAtualizada, venda.numero, itensAtualizados)
    }

    /** Cancela uma entrega pendente e reverte o status da venda. */
    suspend fun cancelarEntrega(entregaId: UUID): EntregaResponse {
        val entrega = entregaRepo.findById(entregaId)
            ?: throw NoSuchElementException("Entrega não encontrada: $entregaId")

        require(entrega.status == StatusEntrega.PENDENTE) {
            "Entrega ${entrega.numero} não pode ser cancelada (status: ${entrega.status})"
        }

        entregaRepo.updateStatus(entregaId, StatusEntrega.CANCELADA)

        val itens = vendaRepo.findItensByVendaId(entrega.vendaId)
        val temPendentes = itens.any { it.statusEntrega == StatusItemEntrega.PENDENTE }
        val temEntregues = itens.any { it.statusEntrega == StatusItemEntrega.ENTREGUE }
        val novoStatusVenda = when {
            temEntregues -> StatusVenda.ENTREGUE_PARCIAL
            else         -> StatusVenda.CONFIRMADO
        }
        vendaRepo.updateStatus(entrega.vendaId, novoStatusVenda)

        val entregaAtualizada = entregaRepo.findById(entregaId)!!
        val venda = vendaRepo.findVendaById(entrega.vendaId)!!
        return toResponse(entregaAtualizada, venda.numero, itens)
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private suspend fun toResponse(
        entrega: Entrega,
        vendaNumero: String,
        itens: List<ItemVenda>,
    ): EntregaResponse {
        val itensMapped = itens.map { item ->
            val produto = produtoRepo.findById(item.produtoId)
            ItemEntregaResponse(
                itemVendaId           = item.id.toString(),
                produtoDescricao      = produto?.descricao ?: "",
                tipoProduto           = item.tipoProduto.name,
                quantidadeMetroLinear = item.quantidadeMetroLinear?.toPlainString(),
                quantidadeUnidade     = item.quantidadeUnidade?.toPlainString(),
                unidadeSigla          = if (item.tipoProduto == TipoProduto.NORMAL) produto?.unidadeVendaSigla else null,
                valorTotalItem        = item.valorTotalItem.toPlainString(),
                statusEntrega         = item.statusEntrega.name,
            )
        }
        return EntregaResponse(
            id              = entrega.id.toString(),
            vendaId         = entrega.vendaId.toString(),
            vendaNumero     = vendaNumero,
            numero          = entrega.numero,
            status          = entrega.status.name,
            observacao      = entrega.observacao,
            enderecoEntrega = entrega.enderecoEntrega,
            dataAgendada    = entrega.dataAgendada?.toString(),
            turno           = entrega.turno?.name,
            motorista       = entrega.motorista,
            createdAt       = entrega.createdAt.toString(),
            itens           = itensMapped,
        )
    }
}
