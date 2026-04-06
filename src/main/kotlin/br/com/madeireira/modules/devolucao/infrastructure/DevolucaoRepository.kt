package br.com.madeireira.modules.devolucao.infrastructure

import br.com.madeireira.modules.devolucao.domain.model.Devolucao
import br.com.madeireira.modules.devolucao.domain.model.ItemDevolucao
import java.util.UUID

interface DevolucaoRepository {
    suspend fun criar(devolucao: Devolucao): Devolucao
    suspend fun criarItem(item: ItemDevolucao): ItemDevolucao
    suspend fun findByVendaId(vendaId: UUID): List<Devolucao>
    suspend fun findAll(limit: Int): List<Devolucao>
    suspend fun findAllComVenda(limit: Int): List<DevolucaoListRow>
}

data class DevolucaoListRow(
    val id: java.util.UUID,
    val numero: String,
    val vendaId: java.util.UUID,
    val vendaNumero: String,
    val clienteNome: String?,
    val motivo: String?,
    val valorTotal: java.math.BigDecimal,
    val createdAt: kotlinx.datetime.Instant,
)
