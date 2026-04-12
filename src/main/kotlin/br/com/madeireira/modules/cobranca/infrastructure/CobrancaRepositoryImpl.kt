package br.com.madeireira.modules.cobranca.infrastructure

import br.com.madeireira.infrastructure.database.DatabaseConfig.dbQuery
import br.com.madeireira.modules.cliente.infrastructure.ClienteTable
import br.com.madeireira.modules.cobranca.domain.CobrancaLog
import br.com.madeireira.modules.cobranca.domain.ParcelaPendente
import br.com.madeireira.modules.cobranca.domain.REGUA_DIAS
import br.com.madeireira.modules.financeiro.domain.model.StatusParcela
import br.com.madeireira.modules.financeiro.domain.model.TipoTitulo
import br.com.madeireira.modules.financeiro.infrastructure.ParcelaFinanceiraTable
import br.com.madeireira.modules.financeiro.infrastructure.TituloFinanceiroTable
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.time.LocalDate
import java.util.UUID

class CobrancaRepositoryImpl : CobrancaRepository {

    /**
     * Retorna parcelas a receber que caem em um dos dias da régua em relação a [hoje].
     * Faz join com título e cliente para trazer telefone + nome.
     */
    override suspend fun findParcelasParaCobranca(hoje: LocalDate): List<ParcelaPendente> = dbQuery {
        // Datas alvo = hoje − cada offset da régua
        // Ex: offset=-1 → amanhã; offset=0 → hoje; offset=3 → há 3 dias
        val datasAlvo = REGUA_DIAS.map { offset ->
            hoje.minusDays(offset.toLong()).toKotlinLocalDate()
        }

        val statusAbertos = listOf(StatusParcela.ABERTO, StatusParcela.VENCIDO)

        (ParcelaFinanceiraTable innerJoin TituloFinanceiroTable)
            .join(ClienteTable, JoinType.LEFT, TituloFinanceiroTable.clienteId, ClienteTable.id)
            .select {
                (TituloFinanceiroTable.tipo eq TipoTitulo.RECEBER) and
                (ParcelaFinanceiraTable.status inList statusAbertos) and
                (ParcelaFinanceiraTable.dataVencimento inList datasAlvo)
            }
            .map { row ->
                val dataVenc   = row[ParcelaFinanceiraTable.dataVencimento].toJavaLocalDate()
                val diasAtraso = java.time.temporal.ChronoUnit.DAYS.between(dataVenc, hoje).toInt()
                ParcelaPendente(
                    parcelaId      = row[ParcelaFinanceiraTable.id],
                    tituloId       = row[TituloFinanceiroTable.id],
                    tituloNumero   = row[TituloFinanceiroTable.numero],
                    clienteId      = row[TituloFinanceiroTable.clienteId],
                    clienteNome    = row.getOrNull(ClienteTable.razaoSocial),
                    telefone       = row.getOrNull(ClienteTable.telefone),
                    valor          = row[ParcelaFinanceiraTable.valor],
                    dataVencimento = dataVenc,
                    diasAtraso     = diasAtraso,
                )
            }
    }

    override suspend fun jaEnviouHoje(parcelaId: UUID, reguaDia: Int): Boolean = dbQuery {
        CobrancaLogTable
            .select {
                (CobrancaLogTable.parcelaId eq parcelaId) and
                (CobrancaLogTable.reguaDia eq reguaDia) and
                (CobrancaLogTable.status eq "ENVIADO")
            }
            .any()
    }

    override suspend fun salvarLog(log: CobrancaLog): Unit = dbQuery {
        CobrancaLogTable.insert {
            it[id]          = log.id
            it[parcelaId]   = log.parcelaId
            it[tituloId]    = log.tituloId
            it[clienteId]   = log.clienteId
            it[telefone]    = log.telefone
            it[mensagem]    = log.mensagem
            it[reguaDia]    = log.reguaDia
            it[status]      = log.status
            it[erroDetalhe] = log.erroDetalhe
            it[enviadoEm]   = log.enviadoEm.toKotlinInstant()
        }
    }

    override suspend fun findHistorico(limit: Int): List<CobrancaLog> = dbQuery {
        CobrancaLogTable
            .selectAll()
            .orderBy(CobrancaLogTable.enviadoEm, SortOrder.DESC)
            .limit(limit)
            .map { toLog(it) }
    }

    override suspend fun findHistoricoParcela(parcelaId: UUID): List<CobrancaLog> = dbQuery {
        CobrancaLogTable
            .select { CobrancaLogTable.parcelaId eq parcelaId }
            .orderBy(CobrancaLogTable.enviadoEm, SortOrder.DESC)
            .map { toLog(it) }
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private fun toLog(row: ResultRow) = CobrancaLog(
        id          = row[CobrancaLogTable.id],
        parcelaId   = row[CobrancaLogTable.parcelaId],
        tituloId    = row[CobrancaLogTable.tituloId],
        clienteId   = row[CobrancaLogTable.clienteId],
        telefone    = row[CobrancaLogTable.telefone],
        mensagem    = row[CobrancaLogTable.mensagem],
        reguaDia    = row[CobrancaLogTable.reguaDia],
        status      = row[CobrancaLogTable.status],
        erroDetalhe = row[CobrancaLogTable.erroDetalhe],
        enviadoEm   = row[CobrancaLogTable.enviadoEm].toJavaInstant(),
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
