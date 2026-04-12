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

// ── DRE ───────────────────────────────────────────────────────────────────────

@Serializable
data class DreCategoriaDto(
    val categoria:                String,
    val valor:                    String,
    val percentualSobreReceita:   String,   // % sobre a receita líquida
)

@Serializable
data class DreResponse(
    val dataInicio:          String,
    val dataFim:             String,
    val geradoEm:            String,
    // ── Receita ────────────────────────────────────────────────────────────────
    val receitaBruta:        String,
    val devolucoes:          String,
    val receitaLiquida:      String,
    // ── CMV ────────────────────────────────────────────────────────────────────
    val custoMercadorias:    String,
    val cmvEstimado:         Boolean,      // true = custo médio atual, não histórico
    val lucroBruto:          String,
    val margemBruta:         String,       // percentual "42.50"
    // ── Despesas ───────────────────────────────────────────────────────────────
    val despesas:            List<DreCategoriaDto>,
    val totalDespesas:       String,
    // ── Resultado ──────────────────────────────────────────────────────────────
    val resultadoOperacional:   String,
    val margemOperacional:      String,    // percentual
    val resultadoPositivo:      Boolean,
    // ── Estatísticas ───────────────────────────────────────────────────────────
    val quantidadeVendas:    Int,
    val ticketMedio:         String,
    val quantidadeDevolucoes: Int,
)

// ── Relatório de Margem por Período ──────────────────────────────────────────

@Serializable
data class MargemPeriodoDetalhe(
    val vendaNumero: String,
    val data: String,
    val quantidade: String,        // com unidade: "12.500 m³" ou "5 pc"
    val precoUnitario: String,
    val valorTotal: String,
    val custoEstimado: String?,
    val lucroEstimado: String?,
)

@Serializable
data class RelatorioMargemPeriodoLinha(
    val produtoCodigo: String,
    val produtoDescricao: String,
    val tipo: String,
    val unidade: String,                // "m³" (MADEIRA) ou código da unidade (NORMAL)
    val quantidadeVendida: String,      // total no período
    val receitaTotal: String,
    val custoTotal: String?,            // null = sem custo cadastrado
    val lucroBruto: String?,
    val margemBruta: String?,           // percentual "38.50"
    val ticketMedio: String,            // receita / nº de vendas
    val quantidadeVendas: Int,
    val semCusto: Boolean,
    val detalhe: List<MargemPeriodoDetalhe>,
)

@Serializable
data class RelatorioMargemPeriodoResponse(
    val dataInicio: String,
    val dataFim: String,
    val geradoEm: String,
    val totalProdutos: Int,
    val receitaTotalPeriodo: String,
    val custoTotalPeriodo: String,
    val lucroBrutoPeriodo: String,
    val margemMediaPonderada: String?,
    val produtosSemCusto: Int,
    val linhas: List<RelatorioMargemPeriodoLinha>,
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
