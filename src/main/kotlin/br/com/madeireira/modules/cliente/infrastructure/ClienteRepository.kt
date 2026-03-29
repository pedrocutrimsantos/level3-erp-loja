package br.com.madeireira.modules.cliente.infrastructure

import br.com.madeireira.modules.cliente.domain.model.Cliente
import java.util.UUID

interface ClienteRepository {
    suspend fun findAll(ativo: Boolean? = null): List<Cliente>
    suspend fun findById(id: UUID): Cliente?
    suspend fun findByCnpjCpf(cnpjCpf: String): Cliente?
    suspend fun create(cliente: Cliente): Cliente
    suspend fun update(cliente: Cliente): Cliente
}
