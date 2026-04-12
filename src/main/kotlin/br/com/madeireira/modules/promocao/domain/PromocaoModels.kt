package br.com.madeireira.modules.promocao.domain

import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

enum class TipoPromocao {
    DESCONTO_PERCENTUAL,  // valor = % de desconto (ex: 10 = 10% off)
    DESCONTO_FIXO,        // valor = R$ descontado por unidade/metro
    PRECO_FIXO,           // valor = preço final independente do cadastrado
}

enum class EscopoPromocao {
    GLOBAL,   // aplica a todos os produtos
    PRODUTO,  // aplica apenas aos produtos listados em promocao_produto
}

data class Promocao(
    val id:                 UUID,
    val nome:               String,
    val descricao:          String?,
    val tipo:               TipoPromocao,
    val valor:              BigDecimal,
    val escopo:             EscopoPromocao,
    val ativo:              Boolean,
    val dataInicio:         LocalDate?,
    val dataFim:            LocalDate?,
    val quantidadeMinima:   BigDecimal?,    // metros (MADEIRA) ou unidades (NORMAL)
    val valorMinimoPedido:  BigDecimal?,    // total do carrinho antes de descontos
    val produtoIds:         List<UUID>,     // preenchido apenas quando escopo=PRODUTO
    val createdAt:          Instant,
)

/**
 * Resultado do cálculo de desconto para um item do carrinho.
 * [precoFinal] é o preço por unidade/metro depois de aplicar a promoção.
 */
data class ItemComDesconto(
    val produtoId:          UUID,
    val precoOriginal:      BigDecimal,
    val precoFinal:         BigDecimal,
    val desconto:           BigDecimal,         // valor absoluto de desconto por unidade
    val percentualDesconto: BigDecimal,         // % efetivo (0-100)
    val promocaoId:         UUID?,
    val promocaoNome:       String?,
) {
    val temDesconto: Boolean get() = desconto > BigDecimal.ZERO
}

/** Resultado completo de um carrinho após aplicação das promoções. */
data class ResultadoCalculo(
    val itens:          List<ItemComDesconto>,
    val valorOriginal:  BigDecimal,
    val descontoTotal:  BigDecimal,
    val valorFinal:     BigDecimal,
)
