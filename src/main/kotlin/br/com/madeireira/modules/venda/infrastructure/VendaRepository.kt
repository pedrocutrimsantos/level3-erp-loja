package br.com.madeireira.modules.venda.infrastructure

import br.com.madeireira.modules.venda.domain.model.ItemVenda
import br.com.madeireira.modules.venda.domain.model.StatusItemEntrega
import br.com.madeireira.modules.venda.domain.model.StatusVenda
import br.com.madeireira.modules.venda.domain.model.Venda
import java.time.LocalDate
import java.util.UUID

data class VendaComNome(val venda: Venda, val clienteNome: String?)

interface VendaRepository {
    suspend fun criarVenda(venda: Venda): Venda
    suspend fun criarItemVenda(item: ItemVenda): ItemVenda
    suspend fun findVendaById(id: UUID): Venda?
    suspend fun findByIdComNome(id: UUID): VendaComNome?
    suspend fun findItensByVendaId(vendaId: UUID): List<ItemVenda>
    suspend fun findAll(limit: Int): List<VendaComNome>
    suspend fun findByDate(date: LocalDate): List<VendaComNome>
    suspend fun findByStatus(status: StatusVenda, limit: Int): List<VendaComNome>
    suspend fun updateStatus(id: UUID, status: StatusVenda)
    suspend fun updateStatusEntregaItem(itemId: UUID, status: StatusItemEntrega)
}
