package br.com.madeireira.modules.estoque.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class SaldoResponse(
    val produtoId: String,
    val saldoM3: String,               // para MADEIRA (4 casas decimais)
    val saldoMetrosLineares: String?,  // para MADEIRA com dimensão
    val saldoUnidade: String?,         // para NORMAL (quantidade na unidade de venda)
    val unidadeSigla: String?,         // sigla da unidade de venda para NORMAL ("KG", "UN", "M"…)
    val custoMedioM3: String?,
    val dataUltimaAtualizacao: String,
)

@Serializable
data class AjusteEstoqueRequest(
    val produtoId: String,
    val quantidade: String,   // quantidade na unidade nativa do produto (m³ para MADEIRA, unidade para NORMAL)
    val sinal: String,        // "ENTRADA" | "SAIDA"
    val observacao: String,
)

@Serializable
data class MovimentacaoResponse(
    val id: String,
    val produtoId: String? = null,
    val produtoCodigo: String? = null,
    val produtoDescricao: String? = null,
    val tipoMovimentacao: String,
    val quantidadeM3: String?,       // para MADEIRA
    val quantidadeUnidade: String?,  // para NORMAL
    val sinal: String,
    val saldoAntesM3: String?,
    val saldoDepoisM3: String?,
    val dataHora: String,
    val observacao: String?,
)

@Serializable
data class SubloteResponse(
    val id: String,
    val loteId: String,
    val volumeM3Disponivel: String,
    val metrosLineares: String?,
    val comprimentoM: String,
    val quantidadePecas: Int,
    val tipo: String,
)
