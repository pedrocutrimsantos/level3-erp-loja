package br.com.madeireira.modules.relatorio.api.dto

import kotlinx.serialization.Serializable

// ── Notificações ──────────────────────────────────────────────────────────────

@Serializable
data class NotificacaoItem(
    val tipo: String,           // TITULO_VENCIDO | CONTA_PAGAR_VENCIDA | ESTOQUE_CRITICO | ORCAMENTO_ANTIGO | TITULO_VENCENDO
    val severidade: String,     // CRITICA | ALERTA | INFO
    val titulo: String,
    val descricao: String,
    val quantidade: Int,
    val valorTotal: String?,    // null quando não aplicável
    val link: String,           // rota frontend para navegar
)

@Serializable
data class NotificacoesResponse(
    val total: Int,
    val criticas: Int,
    val itens: List<NotificacaoItem>,
)

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
    val totalM3Madeira: String,
    val totalMetrosLineares: String,
    val linhas: List<RelatorioEstoqueLinha>,
)

// ── Relatório de Volume Vendido ───────────────────────────────────────────────

@Serializable
data class VolumeVendidoResponse(
    val dataInicio: String,
    val dataFim: String,
    val totalM3: String,
    val totalMetrosLineares: String,
    val totalFaturamento: String,
    val linhas: List<VolumeVendidoLinha>,
)

@Serializable
data class VolumeVendidoLinha(
    val produtoCodigo: String,
    val produtoDescricao: String,
    val totalM3: String,
    val totalMetrosLineares: String,
    val totalFaturamento: String,
    val quantidadeVendas: Int,
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
    val saldoPecas: Int?,            // apenas para MADEIRA com comprimentoPecaM configurado
    val comprimentoPecaM: String?,   // comprimento da peça em metros (ex: "2.0")
)

// ── Relatório de Vendas por Vendedor ─────────────────────────────────────────

@Serializable
data class VendasPorVendedorResponse(
    val dataInicio: String,
    val dataFim: String,
    val totalFaturamento: String,
    val totalVendas: Int,
    val linhas: List<VendasPorVendedorLinha>,
)

@Serializable
data class VendasPorVendedorLinha(
    val vendedorNome: String,
    val totalVendas: Int,
    val totalFaturamento: String,
    val ticketMedio: String,
    val totalM3: String,
    val totalMetrosLineares: String,
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
