package br.com.madeireira.modules.estoque.domain.model

import java.math.BigDecimal
import java.util.UUID

data class SubloteMadeira(
    val id: UUID,
    val loteId: UUID,
    val sublotePaiId: UUID?,
    val comprimentoM: BigDecimal,
    val quantidadePecas: Int,
    val volumeM3Inicial: BigDecimal,
    val volumeM3Disponivel: BigDecimal,
    val tipo: String,
    val ativo: Boolean,
)
