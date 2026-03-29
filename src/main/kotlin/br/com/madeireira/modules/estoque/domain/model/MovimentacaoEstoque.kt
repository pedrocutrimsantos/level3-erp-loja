package br.com.madeireira.modules.estoque.domain.model

import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class MovimentacaoEstoque(
    val id: UUID,
    val produtoId: UUID,
    val depositoId: UUID,
    val subloteId: UUID?,
    val dimensaoId: UUID?,
    val tipoMovimentacao: String,
    val quantidadeM3: BigDecimal?,       // para MADEIRA
    val quantidadeUnidade: BigDecimal?,  // para NORMAL
    val sinal: String,                   // "POSITIVO" | "NEGATIVO"
    val custoUnitario: BigDecimal?,
    val dataHora: Instant,
    val observacao: String?,
    val saldoAntesM3: BigDecimal?,
    val saldoDepoisM3: BigDecimal?,
)
