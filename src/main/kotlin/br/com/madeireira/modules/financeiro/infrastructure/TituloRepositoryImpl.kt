package br.com.madeireira.modules.financeiro.infrastructure

import br.com.madeireira.infrastructure.database.DatabaseConfig.dbQuery
import br.com.madeireira.modules.financeiro.domain.model.ParcelaComTitulo
import br.com.madeireira.modules.financeiro.domain.model.ParcelaFinanceira
import br.com.madeireira.modules.financeiro.domain.model.StatusParcela
import br.com.madeireira.modules.financeiro.domain.model.StatusTitulo
import br.com.madeireira.modules.financeiro.domain.model.TipoTitulo
import br.com.madeireira.modules.financeiro.domain.model.TituloFinanceiro
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class TituloRepositoryImpl : TituloRepository {

    override suspend fun criar(titulo: TituloFinanceiro): TituloFinanceiro = dbQuery {
        TituloFinanceiroTable.insert {
            it[id]            = titulo.id
            it[numero]        = titulo.numero
            it[descricao]     = titulo.descricao
            it[tipo]          = titulo.tipo
            it[vendaId]       = titulo.vendaId
            it[compraId]      = titulo.compraId
            it[clienteId]     = titulo.clienteId
            it[fornecedorId]  = titulo.fornecedorId
            it[valorOriginal] = titulo.valorOriginal
            it[valorPago]     = titulo.valorPago
            it[status]        = titulo.status
            it[dataEmissao]   = titulo.dataEmissao.toKotlinLocalDate()
            it[createdAt]     = titulo.createdAt.toKotlinInstant()
        }
        titulo
    }

    override suspend fun criarParcela(parcela: ParcelaFinanceira): ParcelaFinanceira = dbQuery {
        ParcelaFinanceiraTable.insert {
            it[id]             = parcela.id
            it[tituloId]       = parcela.tituloId
            it[numeroParcela]  = parcela.numeroParcela
            it[valor]          = parcela.valor
            it[dataVencimento] = parcela.dataVencimento.toKotlinLocalDate()
            it[dataPagamento]  = parcela.dataPagamento?.toKotlinLocalDate()
            it[valorPago]      = parcela.valorPago
            it[valorJuros]     = BigDecimal.ZERO
            it[valorMulta]     = BigDecimal.ZERO
            it[valorDesconto]  = BigDecimal.ZERO
            it[formaPagamento] = parcela.formaPagamento
            it[status]         = parcela.status
        }
        parcela
    }

    override suspend fun findById(id: UUID): TituloFinanceiro? = dbQuery {
        TituloFinanceiroTable
            .select { TituloFinanceiroTable.id eq id }
            .map { toTitulo(it) }
            .singleOrNull()
    }

    override suspend fun findAll(tipo: TipoTitulo?, status: StatusTitulo?, limit: Int): List<TituloFinanceiro> = dbQuery {
        val query = TituloFinanceiroTable.selectAll()
        tipo?.let { query.andWhere { TituloFinanceiroTable.tipo eq it } }
        status?.let { query.andWhere { TituloFinanceiroTable.status eq it } }
        query
            .orderBy(TituloFinanceiroTable.createdAt, SortOrder.DESC)
            .limit(limit)
            .map { toTitulo(it) }
    }

    override suspend fun findParcelasByTituloId(tituloId: UUID): List<ParcelaFinanceira> = dbQuery {
        ParcelaFinanceiraTable
            .select { ParcelaFinanceiraTable.tituloId eq tituloId }
            .orderBy(ParcelaFinanceiraTable.numeroParcela, SortOrder.ASC)
            .map { toParcela(it) }
    }

    override suspend fun updateTitulo(titulo: TituloFinanceiro): TituloFinanceiro = dbQuery {
        TituloFinanceiroTable.update({ TituloFinanceiroTable.id eq titulo.id }) {
            it[valorPago] = titulo.valorPago
            it[status]    = titulo.status
        }
        titulo
    }

    override suspend fun updateParcela(parcela: ParcelaFinanceira): ParcelaFinanceira = dbQuery {
        ParcelaFinanceiraTable.update({ ParcelaFinanceiraTable.id eq parcela.id }) {
            it[dataPagamento]  = parcela.dataPagamento?.toKotlinLocalDate()
            it[valorPago]      = parcela.valorPago
            it[formaPagamento] = parcela.formaPagamento
            it[status]         = parcela.status
        }
        parcela
    }

    override suspend fun findParcelasAbertasNoPeriodo(
        dataInicio: LocalDate,
        dataFim: LocalDate,
    ): List<ParcelaComTitulo> = dbQuery {
        val statusAbertos = listOf(StatusParcela.ABERTO, StatusParcela.VENCIDO)
        (ParcelaFinanceiraTable innerJoin TituloFinanceiroTable)
            .select {
                (ParcelaFinanceiraTable.status inList statusAbertos) and
                (ParcelaFinanceiraTable.dataVencimento greaterEq dataInicio.toKotlinLocalDate()) and
                (ParcelaFinanceiraTable.dataVencimento lessEq dataFim.toKotlinLocalDate())
            }
            .orderBy(ParcelaFinanceiraTable.dataVencimento, SortOrder.ASC)
            .map { row ->
                ParcelaComTitulo(
                    parcelaId      = row[ParcelaFinanceiraTable.id],
                    tituloId       = row[TituloFinanceiroTable.id],
                    tituloNumero   = row[TituloFinanceiroTable.numero],
                    tipoTitulo     = row[TituloFinanceiroTable.tipo],
                    clienteId      = row[TituloFinanceiroTable.clienteId],
                    fornecedorId   = row[TituloFinanceiroTable.fornecedorId],
                    valor          = row[ParcelaFinanceiraTable.valor],
                    dataVencimento = row[ParcelaFinanceiraTable.dataVencimento].toJavaLocalDate(),
                    statusParcela  = row[ParcelaFinanceiraTable.status],
                )
            }
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private fun toTitulo(row: ResultRow) = TituloFinanceiro(
        id            = row[TituloFinanceiroTable.id],
        numero        = row[TituloFinanceiroTable.numero],
        descricao     = row[TituloFinanceiroTable.descricao],
        tipo          = row[TituloFinanceiroTable.tipo],
        vendaId       = row[TituloFinanceiroTable.vendaId],
        compraId      = row[TituloFinanceiroTable.compraId],
        clienteId     = row[TituloFinanceiroTable.clienteId],
        fornecedorId  = row[TituloFinanceiroTable.fornecedorId],
        valorOriginal = row[TituloFinanceiroTable.valorOriginal],
        valorPago     = row[TituloFinanceiroTable.valorPago],
        status        = row[TituloFinanceiroTable.status],
        dataEmissao   = row[TituloFinanceiroTable.dataEmissao].toJavaLocalDate(),
        createdAt     = row[TituloFinanceiroTable.createdAt].toJavaInstant(),
    )

    private fun toParcela(row: ResultRow) = ParcelaFinanceira(
        id              = row[ParcelaFinanceiraTable.id],
        tituloId        = row[ParcelaFinanceiraTable.tituloId],
        numeroParcela   = row[ParcelaFinanceiraTable.numeroParcela],
        valor           = row[ParcelaFinanceiraTable.valor],
        dataVencimento  = row[ParcelaFinanceiraTable.dataVencimento].toJavaLocalDate(),
        dataPagamento   = row[ParcelaFinanceiraTable.dataPagamento]?.toJavaLocalDate(),
        valorPago       = row[ParcelaFinanceiraTable.valorPago],
        formaPagamento  = row[ParcelaFinanceiraTable.formaPagamento],
        status          = row[ParcelaFinanceiraTable.status],
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
