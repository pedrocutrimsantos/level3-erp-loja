package br.com.madeireira.modules.entrega.infrastructure

import br.com.madeireira.infrastructure.database.DatabaseConfig.dbQuery
import br.com.madeireira.modules.cliente.infrastructure.ClienteTable
import br.com.madeireira.modules.entrega.domain.model.Entrega
import br.com.madeireira.modules.entrega.domain.model.StatusEntrega
import br.com.madeireira.modules.entrega.domain.model.TurnoEntrega
import br.com.madeireira.modules.venda.infrastructure.VendaTable
import org.jetbrains.exposed.sql.*
import java.time.Instant
import java.util.UUID

class EntregaRepositoryImpl : EntregaRepository {

    override suspend fun criar(entrega: Entrega) = dbQuery {
        EntregaTable.insert {
            it[id]              = entrega.id
            it[vendaId]         = entrega.vendaId
            it[numero]          = entrega.numero
            it[status]          = entrega.status.name
            it[observacao]      = entrega.observacao
            it[enderecoEntrega] = entrega.enderecoEntrega
            it[dataAgendada]    = entrega.dataAgendada
            it[turno]           = entrega.turno?.name
            it[motorista]       = entrega.motorista
            it[createdAt]       = entrega.createdAt.toKotlin()
            it[updatedAt]       = entrega.updatedAt.toKotlin()
        }
        Unit
    }

    override suspend fun findById(id: UUID): Entrega? = dbQuery {
        EntregaTable
            .select { EntregaTable.id eq id }
            .singleOrNull()
            ?.toEntrega()
    }

    override suspend fun findAll(): List<EntregaComVenda> = dbQuery {
        EntregaTable
            .leftJoin(VendaTable, { EntregaTable.vendaId }, { VendaTable.id })
            .leftJoin(ClienteTable, { VendaTable.clienteId }, { ClienteTable.id })
            .selectAll()
            .orderBy(EntregaTable.createdAt, SortOrder.DESC)
            .map { row ->
                EntregaComVenda(
                    entrega     = row.toEntrega(),
                    vendaNumero = row[VendaTable.numero],
                    clienteNome = row.getOrNull(ClienteTable.razaoSocial),
                )
            }
    }

    override suspend fun findPendentePorVenda(vendaId: UUID): Entrega? = dbQuery {
        EntregaTable
            .select { (EntregaTable.vendaId eq vendaId) and (EntregaTable.status eq StatusEntrega.PENDENTE.name) }
            .singleOrNull()
            ?.toEntrega()
    }

    override suspend fun updateStatus(id: UUID, status: StatusEntrega) = dbQuery {
        EntregaTable.update({ EntregaTable.id eq id }) {
            it[EntregaTable.status]    = status.name
            it[EntregaTable.updatedAt] = Instant.now().toKotlin()
        }
        Unit
    }

    private fun ResultRow.toEntrega() = Entrega(
        id              = this[EntregaTable.id],
        vendaId         = this[EntregaTable.vendaId],
        numero          = this[EntregaTable.numero],
        status          = StatusEntrega.valueOf(this[EntregaTable.status]),
        observacao      = this[EntregaTable.observacao],
        enderecoEntrega = this[EntregaTable.enderecoEntrega],
        dataAgendada    = this[EntregaTable.dataAgendada],
        turno           = this[EntregaTable.turno]?.let { runCatching { TurnoEntrega.valueOf(it) }.getOrNull() },
        motorista       = this[EntregaTable.motorista],
        createdAt       = this[EntregaTable.createdAt].toJava(),
        updatedAt       = this[EntregaTable.updatedAt].toJava(),
    )
}

private fun Instant.toKotlin(): kotlinx.datetime.Instant =
    kotlinx.datetime.Instant.fromEpochMilliseconds(this.toEpochMilli())

private fun kotlinx.datetime.Instant.toJava(): Instant =
    Instant.ofEpochMilli(this.toEpochMilliseconds())
