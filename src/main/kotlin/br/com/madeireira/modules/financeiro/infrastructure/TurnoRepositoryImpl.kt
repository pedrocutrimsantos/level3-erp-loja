package br.com.madeireira.modules.financeiro.infrastructure

import br.com.madeireira.infrastructure.database.DatabaseConfig.dbQuery
import br.com.madeireira.modules.financeiro.domain.model.SangriaCaixa
import br.com.madeireira.modules.financeiro.domain.model.StatusTurno
import br.com.madeireira.modules.financeiro.domain.model.TurnoCaixa
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.time.LocalDate
import java.util.UUID

class TurnoRepositoryImpl : TurnoRepository {

    override suspend fun findByData(data: LocalDate): TurnoCaixa? = dbQuery {
        TurnoCaixaTable
            .select { TurnoCaixaTable.data eq data.toKotlin() }
            .map { toTurno(it) }
            .singleOrNull()
    }

    override suspend fun insert(turno: TurnoCaixa): TurnoCaixa = dbQuery {
        TurnoCaixaTable.insert {
            it[id]              = turno.id
            it[data]            = turno.data.toKotlin()
            it[valorAbertura]   = turno.valorAbertura
            it[valorFechamento] = turno.valorFechamento
            it[status]          = turno.status.name
            it[observacao]      = turno.observacao
            it[createdAt]       = turno.createdAt.toKotlin()
            it[updatedAt]       = turno.updatedAt.toKotlin()
        }
        turno
    }

    override suspend fun update(turno: TurnoCaixa): TurnoCaixa = dbQuery {
        TurnoCaixaTable.update({ TurnoCaixaTable.id eq turno.id }) {
            it[valorFechamento] = turno.valorFechamento
            it[status]          = turno.status.name
            it[observacao]      = turno.observacao
            it[updatedAt]       = turno.updatedAt.toKotlin()
        }
        turno
    }

    override suspend fun insertSangria(sangria: SangriaCaixa): SangriaCaixa = dbQuery {
        SangriaCaixaTable.insert {
            it[id]        = sangria.id
            it[turnoId]   = sangria.turnoId
            it[descricao] = sangria.descricao
            it[valor]     = sangria.valor
            it[createdAt] = sangria.createdAt.toKotlin()
        }
        sangria
    }

    override suspend fun findSangriasByTurno(turnoId: UUID): List<SangriaCaixa> = dbQuery {
        SangriaCaixaTable
            .select { SangriaCaixaTable.turnoId eq turnoId }
            .orderBy(SangriaCaixaTable.createdAt, SortOrder.ASC)
            .map { toSangria(it) }
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private fun toTurno(row: ResultRow) = TurnoCaixa(
        id              = row[TurnoCaixaTable.id],
        data            = row[TurnoCaixaTable.data].toJava(),
        valorAbertura   = row[TurnoCaixaTable.valorAbertura],
        valorFechamento = row[TurnoCaixaTable.valorFechamento],
        status          = StatusTurno.valueOf(row[TurnoCaixaTable.status]),
        observacao      = row[TurnoCaixaTable.observacao],
        createdAt       = row[TurnoCaixaTable.createdAt].toJava(),
        updatedAt       = row[TurnoCaixaTable.updatedAt].toJava(),
    )

    private fun toSangria(row: ResultRow) = SangriaCaixa(
        id        = row[SangriaCaixaTable.id],
        turnoId   = row[SangriaCaixaTable.turnoId],
        descricao = row[SangriaCaixaTable.descricao],
        valor     = row[SangriaCaixaTable.valor],
        createdAt = row[SangriaCaixaTable.createdAt].toJava(),
    )
}

// ── Bridges java.time ↔ kotlinx.datetime ─────────────────────────────────────

private fun java.time.Instant.toKotlin() =
    kotlinx.datetime.Instant.fromEpochMilliseconds(this.toEpochMilli())

private fun kotlinx.datetime.Instant.toJava(): java.time.Instant =
    java.time.Instant.ofEpochMilli(this.toEpochMilliseconds())

private fun java.time.LocalDate.toKotlin() =
    kotlinx.datetime.LocalDate(this.year, this.monthValue, this.dayOfMonth)

private fun kotlinx.datetime.LocalDate.toJava(): java.time.LocalDate =
    java.time.LocalDate.of(this.year, this.monthNumber, this.dayOfMonth)
