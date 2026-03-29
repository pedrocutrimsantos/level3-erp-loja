package br.com.madeireira.modules.devolucao.infrastructure

import br.com.madeireira.modules.devolucao.domain.model.Devolucao
import br.com.madeireira.modules.devolucao.domain.model.ItemDevolucao
import java.util.UUID

interface DevolucaoRepository {
    suspend fun criar(devolucao: Devolucao): Devolucao
    suspend fun criarItem(item: ItemDevolucao): ItemDevolucao
    suspend fun findByVendaId(vendaId: UUID): List<Devolucao>
    suspend fun findAll(limit: Int): List<Devolucao>
}
