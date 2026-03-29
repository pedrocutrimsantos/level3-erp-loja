package br.com.madeireira.modules.fornecedor.infrastructure

import br.com.madeireira.modules.fornecedor.domain.model.Fornecedor
import java.util.UUID

interface FornecedorRepository {
    suspend fun findAll(ativo: Boolean? = null): List<Fornecedor>
    suspend fun findById(id: UUID): Fornecedor?
    suspend fun create(fornecedor: Fornecedor): Fornecedor
}
