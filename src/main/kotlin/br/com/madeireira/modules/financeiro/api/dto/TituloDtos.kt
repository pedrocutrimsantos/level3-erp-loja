package br.com.madeireira.modules.financeiro.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class TituloResponse(
    val id: String,
    val numero: String,
    val descricao: String? = null,
    val tipo: String,
    val clienteNome: String?,
    val fornecedorNome: String?,
    val vendaNumero: String?,
    val valorOriginal: String,
    val valorPago: String,
    val valorRestante: String,
    val status: String,
    val dataEmissao: String,
    val dataVencimento: String?,     // da primeira parcela
    val dataPagamento: String?,      // quando pago
    val formaPagamento: String?,
)

@Serializable
data class CriarDespesaRequest(
    val descricao: String,
    val valor: String,           // BigDecimal como String
    val dataVencimento: String,  // yyyy-MM-dd
)

@Serializable
data class BaixaTituloRequest(
    val formaPagamento: String,
    val dataPagamento: String? = null,  // ISO date yyyy-MM-dd; null = hoje
)

@Serializable
data class LancamentoFluxoResponse(
    val parcelaId: String,
    val tituloNumero: String,
    val tipo: String,           // RECEBER | PAGAR
    val contraparte: String?,
    val valor: String,
    val dataVencimento: String, // yyyy-MM-dd
    val vencido: Boolean,
    val diasAtraso: Int?,       // null quando não vencido
)

@Serializable
data class FluxoCaixaResponse(
    val hoje: String,
    val totalVencidoReceber: String,
    val totalVencidoPagar: String,
    val totalProximosReceber: String,
    val totalProximosPagar: String,
    val lancamentos: List<LancamentoFluxoResponse>,
)
