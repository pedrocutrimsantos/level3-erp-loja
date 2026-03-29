package br.com.madeireira.modules.entrega.infrastructure

import br.com.madeireira.modules.entrega.domain.model.Entrega
import br.com.madeireira.modules.entrega.domain.model.StatusEntrega
import java.util.UUID

data class EntregaComVenda(
    val entrega: Entrega,
    val vendaNumero: String,
    val clienteNome: String?,
)

interface EntregaRepository {
    suspend fun criar(entrega: Entrega)
    suspend fun findById(id: UUID): Entrega?
    suspend fun findAll(): List<EntregaComVenda>
    suspend fun findPendentePorVenda(vendaId: UUID): Entrega?
    suspend fun updateStatus(id: UUID, status: StatusEntrega)
}
