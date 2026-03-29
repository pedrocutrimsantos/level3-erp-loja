package br.com.madeireira.modules.produto.domain.model

import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class DimensaoMadeira(
    val id: UUID,
    val produtoId: UUID,
    val espessuraMm: Int,
    val larguraMm: Int,
    val fatorConversao: BigDecimal,  // calculado via ConversionEngine.calcularFator()
    val vigenteDesde: Instant,
    val vigenteAte: Instant?,        // null = vigente atual
)
