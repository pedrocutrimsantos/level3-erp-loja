package br.com.madeireira.modules.devolucao.infrastructure

import br.com.madeireira.infrastructure.database.DatabaseConfig.dbQuery
import br.com.madeireira.modules.devolucao.domain.model.Devolucao
import br.com.madeireira.modules.devolucao.domain.model.ItemDevolucao
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.time.Instant
import java.util.UUID

class DevolucaoRepositoryImpl : DevolucaoRepository {

    override suspend fun criar(devolucao: Devolucao): Devolucao = dbQuery {
        DevolucaoTable.insert {
            it[id]         = devolucao.id
            it[vendaId]    = devolucao.vendaId
            it[numero]     = devolucao.numero
            it[motivo]     = devolucao.motivo
            it[valorTotal] = devolucao.valorTotal
            it[createdAt]  = devolucao.createdAt.toKotlin()
        }
        devolucao
    }

    override suspend fun criarItem(item: ItemDevolucao): ItemDevolucao = dbQuery {
        ItemDevolucaoTable.insert {
            it[id]                = item.id
            it[devolucaoId]       = item.devolucaoId
            it[itemVendaId]       = item.itemVendaId
            it[quantidadeMLinear] = item.quantidadeMLinear
            it[volumeM3]          = item.volumeM3
            it[quantidadeUnidade] = item.quantidadeUnidade
            it[valorDevolvido]    = item.valorDevolvido
        }
        item
    }

    override suspend fun findByVendaId(vendaId: UUID): List<Devolucao> = dbQuery {
        DevolucaoTable
            .select { DevolucaoTable.vendaId eq vendaId }
            .orderBy(DevolucaoTable.createdAt, SortOrder.DESC)
            .map { toDevolucao(it) }
    }

    override suspend fun findAll(limit: Int): List<Devolucao> = dbQuery {
        DevolucaoTable
            .selectAll()
            .orderBy(DevolucaoTable.createdAt, SortOrder.DESC)
            .limit(limit)
            .map { toDevolucao(it) }
    }

    private fun toDevolucao(row: ResultRow) = Devolucao(
        id         = row[DevolucaoTable.id],
        vendaId    = row[DevolucaoTable.vendaId],
        numero     = row[DevolucaoTable.numero],
        motivo     = row[DevolucaoTable.motivo],
        valorTotal = row[DevolucaoTable.valorTotal],
        createdAt  = row[DevolucaoTable.createdAt].toJava(),
    )
}

private fun Instant.toKotlin() = kotlinx.datetime.Instant.fromEpochMilliseconds(toEpochMilli())
private fun kotlinx.datetime.Instant.toJava(): Instant = Instant.ofEpochMilli(toEpochMilliseconds())
