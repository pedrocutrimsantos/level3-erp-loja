package br.com.madeireira.modules.relatorio.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class DashboardResponse(
    val faturamentoDia: String,
    val faturamentoMes: String,
    val quantidadeVendasDia: Int,
    val quantidadeVendasMes: Int,
    val titulosEmAberto: TitulosAberto,
    val contasAPagar: TitulosAberto,
    val vendasUltimos30Dias: List<VendasDia>,
    val topProdutos: List<TopProduto>,
    val estoqueCritico: List<EstoqueCriticoItem>,
)

@Serializable
data class TitulosAberto(
    val quantidade: Int,
    val valorTotal: String,
)

@Serializable
data class VendasDia(
    val data: String,
    val total: String,
    val quantidade: Int,
)

@Serializable
data class TopProduto(
    val produtoId: String,
    val produtoCodigo: String,
    val produtoDescricao: String,
    val totalM3: String?,
    val totalValor: String,
    val quantidadeVendas: Int,
)

@Serializable
data class EstoqueCriticoItem(
    val produtoId: String,
    val produtoCodigo: String,
    val produtoDescricao: String,
    val saldoM3: String,
    val saldoMetroLinear: String?,
)

// ── Relatório de Margem ───────────────────────────────────────────────────────

@Serializable
data class RelatorioMargemLinha(
    val produtoCodigo: String,
    val produtoDescricao: String,
    val tipo: String,
    val precoVenda: String?,         // R$/m (MADEIRA) ou R$/unidade (NORMAL)
    val custoMedio: String?,         // R$/m (MADEIRA) ou R$/unidade (NORMAL)
    val margemBruta: String?,        // percentual, ex: "38.50"
    val margemValor: String?,        // R$ de lucro por unidade de venda
    val saldoDisponivel: String?,    // metros lineares (MADEIRA) ou unidades (NORMAL)
    val semPreco: Boolean,
    val semCusto: Boolean,
)

@Serializable
data class RelatorioMargemResponse(
    val geradoEm: String,
    val totalProdutos: Int,
    val produtosSemPreco: Int,
    val produtosSemCusto: Int,       // tem preço mas não tem custo cadastrado
    val margemMediaGeral: String?,   // média simples entre os produtos com dados completos
    val linhas: List<RelatorioMargemLinha>,
)
