package br.com.madeireira.modules.relatorio.api.dto

import kotlinx.serialization.Serializable

// ── Relatório de Vendas ───────────────────────────────────────────────────────

@Serializable
data class RelatorioVendasResponse(
    val dataInicio: String,
    val dataFim: String,
    val totalVendas: Int,
    val totalFaturamento: String,
    val linhas: List<RelatorioVendaLinha>,
)

@Serializable
data class RelatorioVendaLinha(
    val vendaNumero: String,
    val data: String,             // "YYYY-MM-DD"
    val clienteNome: String,
    val formaPagamento: String,   // "DINHEIRO", "PIX", etc.
    val produtoCodigo: String,
    val produtoDescricao: String,
    val tipo: String,             // "MADEIRA" | "NORMAL"
    val quantidade: String,       // "5.000 m" ou "10 UN"
    val precoUnitario: String,
    val valorTotal: String,
)

// ── Relatório de Estoque ──────────────────────────────────────────────────────

@Serializable
data class RelatorioEstoqueResponse(
    val geradoEm: String,
    val totalProdutos: Int,
    val linhas: List<RelatorioEstoqueLinha>,
)

@Serializable
data class RelatorioEstoqueLinha(
    val codigo: String,
    val descricao: String,
    val tipo: String,
    val unidade: String,
    val saldoM3: String?,
    val saldoMetroLinear: String?,
    val saldoUnidade: String?,
)

// ── Relatório de Fluxo de Caixa ───────────────────────────────────────────────

@Serializable
data class RelatorioFluxoCaixaResponse(
    val dataInicio: String,
    val dataFim: String,
    val totalEntradas: String,
    val linhas: List<RelatorioFluxoLinha>,
)

@Serializable
data class RelatorioFluxoLinha(
    val data: String,
    val formaPagamento: String,
    val quantidade: Int,
    val total: String,
)
