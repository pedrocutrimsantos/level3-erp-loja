package br.com.madeireira.modules.promocao.infrastructure

import br.com.madeireira.infrastructure.database.DatabaseConfig.dbQuery
import br.com.madeireira.modules.promocao.domain.EscopoPromocao
import br.com.madeireira.modules.promocao.domain.Promocao
import br.com.madeireira.modules.promocao.domain.TipoPromocao
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.time.LocalDate
import java.util.UUID

class PromocaoRepositoryImpl : PromocaoRepository {

    override suspend fun findAll(): List<Promocao> = dbQuery {
        val rows = PromocaoTable.selectAll().orderBy(PromocaoTable.createdAt, SortOrder.DESC).toList()
        val ids = rows.map { it[PromocaoTable.id] }
        val produtos = fetchProdutos(ids)
        rows.map { toPromocao(it, produtos[it[PromocaoTable.id]] ?: emptyList()) }
    }

    override suspend fun findById(id: UUID): Promocao? = dbQuery {
        val row = PromocaoTable.select { PromocaoTable.id eq id }.singleOrNull() ?: return@dbQuery null
        val produtos = fetchProdutos(listOf(id))
        toPromocao(row, produtos[id] ?: emptyList())
    }

    override suspend fun findAtivas(data: LocalDate): List<Promocao> = dbQuery {
        val kData = data.toKotlinLocalDate()
        val rows = PromocaoTable
            .select {
                (PromocaoTable.ativo eq true) and
                ((PromocaoTable.dataInicio.isNull()) or (PromocaoTable.dataInicio lessEq kData)) and
                ((PromocaoTable.dataFim.isNull()) or (PromocaoTable.dataFim greaterEq kData))
            }
            .toList()
        val ids = rows.map { it[PromocaoTable.id] }
        val produtos = fetchProdutos(ids)
        rows.map { toPromocao(it, produtos[it[PromocaoTable.id]] ?: emptyList()) }
    }

    override suspend fun findAtivasPorProduto(produtoId: UUID, data: LocalDate): List<Promocao> = dbQuery {
        val kData = data.toKotlinLocalDate()

        // Promoções globais ativas
        val globais = PromocaoTable
            .select {
                (PromocaoTable.ativo eq true) and
                (PromocaoTable.escopo eq EscopoPromocao.GLOBAL.name) and
                ((PromocaoTable.dataInicio.isNull()) or (PromocaoTable.dataInicio lessEq kData)) and
                ((PromocaoTable.dataFim.isNull()) or (PromocaoTable.dataFim greaterEq kData))
            }
            .toList()

        // Promoções específicas do produto ativas
        val especificas = (PromocaoTable innerJoin PromocaoProdutoTable)
            .select {
                (PromocaoProdutoTable.produtoId eq produtoId) and
                (PromocaoTable.ativo eq true) and
                ((PromocaoTable.dataInicio.isNull()) or (PromocaoTable.dataInicio lessEq kData)) and
                ((PromocaoTable.dataFim.isNull()) or (PromocaoTable.dataFim greaterEq kData))
            }
            .toList()

        val todasRows = (globais + especificas).distinctBy { it[PromocaoTable.id] }
        val ids = todasRows.map { it[PromocaoTable.id] }
        val produtos = fetchProdutos(ids)
        todasRows.map { toPromocao(it, produtos[it[PromocaoTable.id]] ?: emptyList()) }
    }

    override suspend fun criar(promocao: Promocao): Promocao = dbQuery {
        PromocaoTable.insert {
            it[id]                = promocao.id
            it[nome]              = promocao.nome
            it[descricao]         = promocao.descricao
            it[tipo]              = promocao.tipo.name
            it[valor]             = promocao.valor
            it[escopo]            = promocao.escopo.name
            it[ativo]             = promocao.ativo
            it[dataInicio]        = promocao.dataInicio?.toKotlinLocalDate()
            it[dataFim]           = promocao.dataFim?.toKotlinLocalDate()
            it[quantidadeMinima]  = promocao.quantidadeMinima
            it[valorMinimoPedido] = promocao.valorMinimoPedido
            it[createdAt]         = promocao.createdAt.toKotlinInstant()
        }
        salvarProdutos(promocao.id, promocao.produtoIds)
        promocao
    }

    override suspend fun atualizar(promocao: Promocao): Promocao = dbQuery {
        PromocaoTable.update({ PromocaoTable.id eq promocao.id }) {
            it[nome]              = promocao.nome
            it[descricao]         = promocao.descricao
            it[tipo]              = promocao.tipo.name
            it[valor]             = promocao.valor
            it[escopo]            = promocao.escopo.name
            it[ativo]             = promocao.ativo
            it[dataInicio]        = promocao.dataInicio?.toKotlinLocalDate()
            it[dataFim]           = promocao.dataFim?.toKotlinLocalDate()
            it[quantidadeMinima]  = promocao.quantidadeMinima
            it[valorMinimoPedido] = promocao.valorMinimoPedido
        }
        // Recria vínculos de produto
        PromocaoProdutoTable.deleteWhere { PromocaoProdutoTable.promocaoId eq promocao.id }
        salvarProdutos(promocao.id, promocao.produtoIds)
        promocao
    }

    override suspend fun desativar(id: UUID): Unit = dbQuery {
        PromocaoTable.update({ PromocaoTable.id eq id }) { it[ativo] = false }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun salvarProdutos(promocaoId: UUID, produtoIds: List<UUID>) {
        produtoIds.forEach { pid ->
            PromocaoProdutoTable.insert {
                it[PromocaoProdutoTable.promocaoId] = promocaoId
                it[PromocaoProdutoTable.produtoId]  = pid
            }
        }
    }

    private fun fetchProdutos(promocaoIds: List<UUID>): Map<UUID, List<UUID>> {
        if (promocaoIds.isEmpty()) return emptyMap()
        return PromocaoProdutoTable
            .select { PromocaoProdutoTable.promocaoId inList promocaoIds }
            .groupBy(
                { it[PromocaoProdutoTable.promocaoId] },
                { it[PromocaoProdutoTable.produtoId] },
            )
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private fun toPromocao(row: ResultRow, produtoIds: List<UUID>) = Promocao(
        id                = row[PromocaoTable.id],
        nome              = row[PromocaoTable.nome],
        descricao         = row[PromocaoTable.descricao],
        tipo              = TipoPromocao.valueOf(row[PromocaoTable.tipo]),
        valor             = row[PromocaoTable.valor],
        escopo            = EscopoPromocao.valueOf(row[PromocaoTable.escopo]),
        ativo             = row[PromocaoTable.ativo],
        dataInicio        = row[PromocaoTable.dataInicio]?.toJavaLocalDate(),
        dataFim           = row[PromocaoTable.dataFim]?.toJavaLocalDate(),
        quantidadeMinima  = row[PromocaoTable.quantidadeMinima],
        valorMinimoPedido = row[PromocaoTable.valorMinimoPedido],
        produtoIds        = produtoIds,
        createdAt         = row[PromocaoTable.createdAt].toJavaInstant(),
    )
}

// ── Bridges java.time ↔ kotlinx.datetime ─────────────────────────────────────

private fun java.time.Instant.toKotlinInstant() =
    kotlinx.datetime.Instant.fromEpochMilliseconds(this.toEpochMilli())

private fun kotlinx.datetime.Instant.toJavaInstant(): java.time.Instant =
    java.time.Instant.ofEpochMilli(this.toEpochMilliseconds())

private fun java.time.LocalDate.toKotlinLocalDate() =
    kotlinx.datetime.LocalDate(this.year, this.monthValue, this.dayOfMonth)

private fun kotlinx.datetime.LocalDate.toJavaLocalDate(): java.time.LocalDate =
    java.time.LocalDate.of(this.year, this.monthNumber, this.dayOfMonth)
