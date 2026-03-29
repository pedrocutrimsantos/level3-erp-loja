package br.com.madeireira.modules.venda.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class ItemVendaRequest(
    val produtoId: String,
    val quantidadeMetroLinear: String? = null,  // para MADEIRA — obrigatório se tipo == MADEIRA
    val quantidadeUnidade: String? = null,      // para NORMAL
    val precoUnitario: String,                  // preço por metro linear (MADEIRA) ou por unidade
    val observacao: String? = null,
)

@Serializable
data class VendaBalcaoRequest(
    val itens: List<ItemVendaRequest>,
    val clienteId: String? = null,
    val formaPagamento: String? = null,    // DINHEIRO | PIX | CARTAO_DEBITO | CARTAO_CREDITO | FIADO | …
    val dataVencimentoFiado: String? = null, // ISO date yyyy-MM-dd (só para FIADO)
    val observacao: String? = null,
)

@Serializable
data class NfItemData(
    val codigoProduto: String,
    val descricao: String,
    val ncm: String,
    val unidadeComercial: String,
    val quantidadeComercial: String,  // serializado como String para BigDecimal
    val valorUnitario: String,
)

@Serializable
data class ItemVendaResponse(
    val produtoId: String,
    val produtoCodigo: String,
    val produtoDescricao: String,
    val tipoProduto: String,
    val quantidadeMetroLinear: String?,     // MADEIRA: metros informados
    val volumeM3Calculado: String?,          // MADEIRA: m³ equivalente
    val quantidadeUnidade: String?,          // NORMAL: quantidade
    val unidadeSigla: String?,               // NORMAL: sigla da unidade ("KG", "UN"…)
    val formula: String?,                    // MADEIRA: "12.00 m × 0.00250000 m²/m = 0.0300 m³"
    val novoSaldoM3: String?,
    val novoSaldoMetrosLineares: String?,
    val novoSaldoUnidade: String?,           // NORMAL: novo saldo após venda
    val valorTotalItem: String,
)

@Serializable
data class VendaBalcaoResponse(
    val vendaId: String,
    val numero: String,
    val itens: List<ItemVendaResponse>,
    val valorTotal: String,
    val nfItens: List<NfItemData>,
)

@Serializable
data class VendaListItemResponse(
    val vendaId: String,
    val numero: String,
    val tipo: String,
    val status: String,
    val valorTotal: String,
    val createdAt: String,
    val quantidadeItens: Int,
    val clienteNome: String? = null,
    val formaPagamento: String? = null,
)

@Serializable
data class OrcamentoItemResponse(
    val produtoId: String,
    val produtoCodigo: String,
    val produtoDescricao: String,
    val quantidadeMetroLinear: String?,
    val volumeM3Calculado: String?,
    val quantidadeUnidade: String?,
    val precoUnitario: String,
    val valorTotalItem: String,
)

@Serializable
data class OrcamentoDetalheResponse(
    val vendaId: String,
    val numero: String,
    val status: String,
    val clienteNome: String?,
    val formaPagamento: String?,
    val valorTotal: String,
    val createdAt: String,
    val itens: List<OrcamentoItemResponse>,
)

@Serializable
data class VendaDetalheItemResponse(
    val produtoId: String,
    val produtoCodigo: String,
    val produtoDescricao: String,
    val tipoProduto: String,
    val quantidadeMetroLinear: String?,
    val volumeM3Calculado: String?,
    val quantidadeUnidade: String?,
    val unidadeSigla: String?,
    val precoUnitario: String,
    val valorTotalItem: String,
)

@Serializable
data class VendaDetalheResponse(
    val vendaId: String,
    val numero: String,
    val tipo: String,
    val status: String,
    val clienteNome: String?,
    val formaPagamento: String?,
    val observacao: String?,
    val valorTotal: String,
    val createdAt: String,
    val itens: List<VendaDetalheItemResponse>,
)

@Serializable
data class ResumoFormaPagamento(
    val formaPagamento: String,
    val total: String,
    val quantidade: Int,
)

@Serializable
data class VendaCaixaItem(
    val numero: String,
    val clienteNome: String?,
    val formaPagamento: String?,
    val valorTotal: String,
    val createdAt: String,
)

@Serializable
data class CaixaDiaResponse(
    val data: String,
    val totalVendas: String,
    val quantidadeVendas: Int,
    val resumoPorForma: List<ResumoFormaPagamento>,
    val vendas: List<VendaCaixaItem>,
)
