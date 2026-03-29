package br.com.madeireira.modules.venda.domain.model

import br.com.madeireira.modules.produto.domain.model.TipoProduto
import java.math.BigDecimal
import java.util.UUID

data class ItemVenda(
    val id: UUID,
    val vendaId: UUID,
    val produtoId: UUID,
    val numeroLinha: Int,
    val tipoProduto: TipoProduto,
    val dimensaoId: UUID?,
    val fatorConversaoUsado: BigDecimal?,
    val quantidadeMetroLinear: BigDecimal?,
    val volumeM3Calculado: BigDecimal?,
    val quantidadeUnidade: BigDecimal?,
    val precoUnitario: BigDecimal,
    val valorTotalItem: BigDecimal,
    val statusEntrega: StatusItemEntrega = StatusItemEntrega.PENDENTE,
)
