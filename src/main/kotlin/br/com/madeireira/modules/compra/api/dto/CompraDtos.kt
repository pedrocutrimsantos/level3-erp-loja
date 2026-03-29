package br.com.madeireira.modules.compra.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class EntradaCompraRequest(
    val produtoId: String,
    val quantidade: String,                    // m³ para MADEIRA, unidade nativa para NORMAL
    val custoUnitario: String? = null,         // opcional (ex: R$/m³ para MADEIRA, R$/KG para NORMAL)
    val observacao: String,
    val fornecedorId: String? = null,          // UUID do fornecedor (para gerar contas a pagar)
    val dataVencimento: String? = null,        // ISO date yyyy-MM-dd
    val formaPagamentoPrevisto: String? = null, // ex: BOLETO, CHEQUE, DINHEIRO
)

@Serializable
data class EntradaCompraResponse(
    val quantidade: String,
    val unidadeSigla: String,                 // "M3" para MADEIRA, "KG"/"UN"/… para NORMAL
    val metrosLineares: String?,              // apenas para MADEIRA
    val novoSaldo: String,                    // novo saldo na unidade principal
    val novoSaldoMetrosLineares: String?,     // apenas para MADEIRA
    val tipoMovimentacao: String,
    val tituloPagarNumero: String? = null,    // número do título gerado (se fornecedor informado)
)

@Serializable
data class EntradaListItemResponse(
    val id: String,
    val dataHora: String,
    val produtoId: String,
    val produtoCodigo: String,
    val produtoDescricao: String,
    val tipoProduto: String,              // "MADEIRA" | "NORMAL"
    val quantidadeM3: String?,            // MADEIRA
    val quantidadeUnidade: String?,       // NORMAL
    val unidadeSigla: String,
    val custoUnitario: String?,
    val observacao: String?,
)
