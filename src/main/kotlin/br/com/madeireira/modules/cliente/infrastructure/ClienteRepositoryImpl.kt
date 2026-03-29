package br.com.madeireira.modules.cliente.infrastructure

import br.com.madeireira.infrastructure.database.DatabaseConfig.dbQuery
import br.com.madeireira.modules.cliente.domain.model.Cliente
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.util.UUID

class ClienteRepositoryImpl : ClienteRepository {

    override suspend fun findAll(ativo: Boolean?): List<Cliente> = dbQuery {
        val query = ClienteTable.selectAll()
        if (ativo != null) query.andWhere { ClienteTable.ativo eq ativo }
        query.orderBy(ClienteTable.razaoSocial, SortOrder.ASC).map { toCliente(it) }
    }

    override suspend fun findById(id: UUID): Cliente? = dbQuery {
        ClienteTable.select { ClienteTable.id eq id }.map { toCliente(it) }.singleOrNull()
    }

    override suspend fun findByCnpjCpf(cnpjCpf: String): Cliente? = dbQuery {
        val soDigitos = cnpjCpf.replace(Regex("\\D"), "")
        ClienteTable
            .select { ClienteTable.cnpjCpf.like("%$soDigitos%") }
            .map { toCliente(it) }
            .firstOrNull { it.cnpjCpf?.replace(Regex("\\D"), "") == soDigitos }
    }

    override suspend fun create(cliente: Cliente): Cliente = dbQuery {
        ClienteTable.insert {
            it[id]           = cliente.id
            it[tipoPessoa]   = cliente.tipoPessoa
            it[cnpjCpf]      = cliente.cnpjCpf
            it[razaoSocial]  = cliente.razaoSocial
            it[nomeFantasia] = cliente.nomeFantasia
            it[email]        = cliente.email
            it[telefone]     = cliente.telefone
            it[limiteCred]   = cliente.limiteCred
            it[saldoDevedor] = cliente.saldoDevedor
            it[statusInad]   = cliente.statusInad
            it[ativo]        = cliente.ativo
        }
        cliente
    }

    override suspend fun update(cliente: Cliente): Cliente = dbQuery {
        ClienteTable.update({ ClienteTable.id eq cliente.id }) {
            it[razaoSocial]  = cliente.razaoSocial
            it[nomeFantasia] = cliente.nomeFantasia
            it[email]        = cliente.email
            it[telefone]     = cliente.telefone
            it[limiteCred]   = cliente.limiteCred
            it[statusInad]   = cliente.statusInad
            it[ativo]        = cliente.ativo
        }
        cliente
    }

    private fun toCliente(row: ResultRow) = Cliente(
        id           = row[ClienteTable.id],
        tipoPessoa   = row[ClienteTable.tipoPessoa],
        cnpjCpf      = row[ClienteTable.cnpjCpf],
        razaoSocial  = row[ClienteTable.razaoSocial],
        nomeFantasia = row[ClienteTable.nomeFantasia],
        email        = row[ClienteTable.email],
        telefone     = row[ClienteTable.telefone],
        limiteCred   = row[ClienteTable.limiteCred],
        saldoDevedor = row[ClienteTable.saldoDevedor],
        statusInad   = row[ClienteTable.statusInad],
        ativo        = row[ClienteTable.ativo],
    )
}
