package br.com.madeireira.modules.estoque.domain.model

import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class EstoqueSaldo(
    val id: UUID,
    val produtoId: UUID,
    val depositoId: UUID,
    val saldoM3Total: BigDecimal,
    val saldoM3Disponivel: BigDecimal,
    val saldoM3Reservado: BigDecimal,
    val saldoUnidadeTotal: BigDecimal,      // para produtos NORMAL
    val saldoUnidadeDisponivel: BigDecimal, // para produtos NORMAL
    val custoMedioM3: BigDecimal?,
    val versao: Int,
    val dataUltimaAtualizacao: Instant,
)
