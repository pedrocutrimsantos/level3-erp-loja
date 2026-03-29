package br.com.madeireira.modules.financeiro.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class AbrirCaixaRequest(
    val valorAbertura: Double = 0.0,
)

@Serializable
data class FecharCaixaRequest(
    val valorFechamento: Double,
    val observacao: String? = null,
)

@Serializable
data class RegistrarSangriaRequest(
    val descricao: String,
    val valor: Double,
)

@Serializable
data class SangriaResponse(
    val id: String,
    val descricao: String,
    val valor: String,
    val createdAt: String,
)

@Serializable
data class TurnoCaixaResponse(
    val id: String,
    val data: String,                    // yyyy-MM-dd
    val status: String,                  // ABERTO | FECHADO
    val valorAbertura: String,
    val valorFechamento: String?,
    val observacao: String?,
    val totalEntradas: String,           // vendas em dinheiro no dia
    val totalSangrias: String,           // soma das sangrias
    val saldoEsperado: String,           // abertura + entradas - sangrias
    val diferenca: String?,              // fechamento - saldoEsperado (null se ABERTO)
    val sangrias: List<SangriaResponse>,
    val createdAt: String,
)
