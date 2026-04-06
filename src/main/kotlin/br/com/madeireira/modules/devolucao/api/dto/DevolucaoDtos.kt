package br.com.madeireira.modules.devolucao.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class ItemVendaDetalheResponse(
    val itemVendaId: String,
    val produtoCodigo: String,
    val produtoDescricao: String,
    val tipoProduto: String,
    val quantidadeMetroLinear: String?,   // MADEIRA: metros vendidos
    val volumeM3Calculado: String?,       // MADEIRA: m³ vendidos
    val quantidadeUnidade: String?,       // NORMAL: unidade vendida
    val unidadeSigla: String?,
    val precoUnitario: String,
    val valorTotalItem: String,
)

@Serializable
data class ItemDevolucaoRequest(
    val itemVendaId: String,
    val quantidade: String,   // metros lineares para MADEIRA; unidade para NORMAL
)

@Serializable
data class RegistrarDevolucaoRequest(
    val itens: List<ItemDevolucaoRequest>,
    val motivo: String? = null,
)

@Serializable
data class DevolucaoResponse(
    val id: String,
    val vendaId: String,
    val vendaNumero: String,
    val numero: String,
    val motivo: String?,
    val valorTotal: String,
    val createdAt: String,
    val itens: List<ItemDevolucaoResponse>,
)

@Serializable
data class ItemDevolucaoResponse(
    val itemVendaId: String,
    val produtoDescricao: String,
    val quantidadeMLinear: String?,
    val volumeM3: String?,
    val quantidadeUnidade: String?,
    val valorDevolvido: String,
)

@Serializable
data class DevolucaoListItemResponse(
    val id: String,
    val numero: String,
    val vendaId: String,
    val vendaNumero: String,
    val clienteNome: String?,
    val motivo: String?,
    val valorTotal: String,
    val createdAt: String,
)
