package br.com.madeireira.modules.produto.domain.model

import java.math.BigDecimal
import java.util.UUID

data class PrecificacaoProduto(
    val produtoId: UUID,
    val tipoPessoa: String,   // "PF" | "PJ"
    val tipoPag: String,      // "VISTA" | "PRAZO"
    val preco: BigDecimal,
)
