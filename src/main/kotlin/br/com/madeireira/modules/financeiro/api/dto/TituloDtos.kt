package br.com.madeireira.modules.financeiro.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class TituloResponse(
    val id: String,
    val numero: String,
    val descricao: String? = null,
    val tipo: String,
    val categoria: String? = null,
    val clienteNome: String?,
    val fornecedorNome: String?,
    val fornecedorId: String? = null,
    val vendaNumero: String?,
    val valorOriginal: String,
    val valorPago: String,
    val valorRestante: String,
    val status: String,
    val dataEmissao: String,
    val dataVencimento: String?,     // da primeira parcela
    val dataPagamento: String?,      // quando pago
    val formaPagamento: String?,
    val numeroParcelas: Int = 1,
    val parcelasPagas: Int = 0,
)

@Serializable
data class CriarDespesaRequest(
    val descricao: String,
    val valor: String,                    // BigDecimal como String (total)
    val dataVencimento: String,           // yyyy-MM-dd (vencimento da 1ª parcela)
    val fornecedorId: String? = null,
    val categoria: String? = null,        // FORNECEDOR | ALUGUEL | FOLHA | IMPOSTOS | SERVICOS | OUTROS
    val numeroParcelas: Int = 1,          // 1..36
    val intervaloDiasParcelas: Int = 30,  // dias entre vencimentos
)

@Serializable
data class BaixaTituloRequest(
    val formaPagamento: String,
    val dataPagamento: String? = null,  // ISO date yyyy-MM-dd; null = hoje
)

@Serializable
data class ResumoPagarResponse(
    val totalAberto: String,
    val totalVencido: String,
    val totalVenceHoje: String,
    val totalVenceSemana: String,
)

@Serializable
data class ResumoReceberResponse(
    val totalAberto: String,
    val totalVencido: String,
    val totalVenceHoje: String,
    val totalVenceSemana: String,
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
