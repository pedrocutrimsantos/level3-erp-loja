package br.com.madeireira.modules.financeiro.domain.model

import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

enum class StatusTurno { ABERTO, FECHADO }

data class TurnoCaixa(
    val id: UUID,
    val data: LocalDate,
    val valorAbertura: BigDecimal,
    val valorFechamento: BigDecimal?,
    val status: StatusTurno,
    val observacao: String?,
    val createdAt: Instant,
    val updatedAt: Instant,
)

data class SangriaCaixa(
    val id: UUID,
    val turnoId: UUID,
    val descricao: String,
    val valor: BigDecimal,
    val createdAt: Instant,
)
