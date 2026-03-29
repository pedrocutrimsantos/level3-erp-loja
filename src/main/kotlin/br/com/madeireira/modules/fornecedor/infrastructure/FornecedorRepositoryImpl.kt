package br.com.madeireira.modules.fornecedor.infrastructure

import br.com.madeireira.infrastructure.database.DatabaseConfig.dbQuery
import br.com.madeireira.modules.fornecedor.domain.model.Fornecedor
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.util.UUID

class FornecedorRepositoryImpl : FornecedorRepository {

    override suspend fun findAll(ativo: Boolean?): List<Fornecedor> = dbQuery {
        val query = FornecedorTable.selectAll()
        ativo?.let { query.andWhere { FornecedorTable.ativo eq it } }
        query.orderBy(FornecedorTable.razaoSocial, SortOrder.ASC).map { toFornecedor(it) }
    }

    override suspend fun findById(id: UUID): Fornecedor? = dbQuery {
        FornecedorTable
            .select { FornecedorTable.id eq id }
            .map { toFornecedor(it) }
            .singleOrNull()
    }

    override suspend fun create(fornecedor: Fornecedor): Fornecedor = dbQuery {
        FornecedorTable.insert {
            it[id]                = fornecedor.id
            it[tipoPessoa]        = fornecedor.tipoPessoa
            it[cnpjCpf]           = fornecedor.cnpjCpf
            it[razaoSocial]       = fornecedor.razaoSocial
            it[nomeFantasia]      = fornecedor.nomeFantasia
            it[inscricaoEstadual] = fornecedor.inscricaoEstadual
            it[email]             = fornecedor.email
            it[telefone]          = fornecedor.telefone
            it[uf]                = fornecedor.uf
            it[cep]               = fornecedor.cep
            it[logradouro]        = fornecedor.logradouro
            it[numero]            = fornecedor.numero
            it[bairro]            = fornecedor.bairro
            it[cidade]            = fornecedor.cidade
            it[ativo]             = fornecedor.ativo
        }
        fornecedor
    }

    private fun toFornecedor(row: ResultRow) = Fornecedor(
        id                = row[FornecedorTable.id],
        tipoPessoa        = row[FornecedorTable.tipoPessoa],
        cnpjCpf           = row[FornecedorTable.cnpjCpf],
        razaoSocial       = row[FornecedorTable.razaoSocial],
        nomeFantasia      = row[FornecedorTable.nomeFantasia],
        inscricaoEstadual = row[FornecedorTable.inscricaoEstadual],
        email             = row[FornecedorTable.email],
        telefone          = row[FornecedorTable.telefone],
        uf                = row[FornecedorTable.uf],
        cep               = row[FornecedorTable.cep],
        logradouro        = row[FornecedorTable.logradouro],
        numero            = row[FornecedorTable.numero],
        bairro            = row[FornecedorTable.bairro],
        cidade            = row[FornecedorTable.cidade],
        ativo             = row[FornecedorTable.ativo],
    )
}
