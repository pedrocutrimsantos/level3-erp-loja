package br.com.madeireira.modules.devolucao.domain.model

import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class Devolucao(
    val id: UUID,
    val vendaId: UUID,
    val numero: String,
    val motivo: String?,
    val valorTotal: BigDecimal,
    val createdAt: Instant,
    val itens: List<ItemDevolucao> = emptyList(),
)

data class ItemDevolucao(
    val id: UUID,
    val devolucaoId: UUID,
    val itemVendaId: UUID,
    val quantidadeMLinear: BigDecimal?,
    val volumeM3: BigDecimal?,
    val quantidadeUnidade: BigDecimal?,
    val valorDevolvido: BigDecimal,
)
