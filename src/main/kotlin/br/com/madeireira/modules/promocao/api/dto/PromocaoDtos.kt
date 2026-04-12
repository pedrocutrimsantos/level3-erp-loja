package br.com.madeireira.modules.promocao.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class PromocaoResponse(
    val id:                 String,
    val nome:               String,
    val descricao:          String?,
    val tipo:               String,           // DESCONTO_PERCENTUAL | DESCONTO_FIXO | PRECO_FIXO
    val valor:              Double,
    val escopo:             String,           // GLOBAL | PRODUTO
    val ativo:              Boolean,
    val dataInicio:         String?,          // yyyy-MM-dd
    val dataFim:            String?,
    val quantidadeMinima:   Double?,
    val valorMinimoPedido:  Double?,
    val produtoIds:         List<String>,
    val vigente:            Boolean,          // ativo + dentro do período hoje
    val createdAt:          String,
)

@Serializable
data class PromocaoRequest(
    val nome:               String,
    val descricao:          String? = null,
    val tipo:               String,
    val valor:              Double,
    val escopo:             String = "GLOBAL",
    val dataInicio:         String? = null,
    val dataFim:            String? = null,
    val quantidadeMinima:   Double? = null,
    val valorMinimoPedido:  Double? = null,
    val produtoIds:         List<String> = emptyList(),
)

// ── Cálculo de desconto ───────────────────────────────────────────────────────

@Serializable
data class ItemCalculoRequest(
    val produtoId:     String,
    val quantidade:    Double,
    val precoUnitario: Double,
)

@Serializable
data class CalculoRequest(
    val itens: List<ItemCalculoRequest>,
)

@Serializable
data class ItemCalculoResponse(
    val produtoId:          String,
    val precoOriginal:      Double,
    val precoFinal:         Double,
    val desconto:           Double,
    val percentualDesconto: Double,
    val promocaoId:         String?,
    val promocaoNome:       String?,
    val temDesconto:        Boolean,
)

@Serializable
data class CalculoResponse(
    val itens:          List<ItemCalculoResponse>,
    val valorOriginal:  Double,
    val descontoTotal:  Double,
    val valorFinal:     Double,
)
