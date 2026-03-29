package br.com.madeireira.modules.financeiro.infrastructure

import br.com.madeireira.modules.financeiro.domain.model.SangriaCaixa
import br.com.madeireira.modules.financeiro.domain.model.TurnoCaixa
import java.time.LocalDate
import java.util.UUID

interface TurnoRepository {
    suspend fun findByData(data: LocalDate): TurnoCaixa?
    suspend fun insert(turno: TurnoCaixa): TurnoCaixa
    suspend fun update(turno: TurnoCaixa): TurnoCaixa
    suspend fun insertSangria(sangria: SangriaCaixa): SangriaCaixa
    suspend fun findSangriasByTurno(turnoId: UUID): List<SangriaCaixa>
}
