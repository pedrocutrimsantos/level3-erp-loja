package br.com.madeireira.modules.entrega.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class CriarEntregaRequest(
    val observacao: String? = null,
    val enderecoEntrega: String? = null,
    val dataAgendada: String? = null,   // formato ISO: "2026-03-28"
    val turno: String? = null,          // MANHA | TARDE | DIA_TODO
    val motorista: String? = null,
)

@Serializable
data class ConfirmarEntregaRequest(
    val itensEntregues: List<String>,   // IDs de item_venda que foram entregues
)

@Serializable
data class ItemEntregaResponse(
    val itemVendaId: String,
    val produtoDescricao: String,
    val tipoProduto: String,
    val quantidadeMetroLinear: String?,
    val quantidadeUnidade: String?,
    val unidadeSigla: String?,
    val valorTotalItem: String,
    val statusEntrega: String,          // PENDENTE | ENTREGUE | DEVOLVIDO
)

@Serializable
data class EntregaResponse(
    val id: String,
    val vendaId: String,
    val vendaNumero: String,
    val numero: String,
    val status: String,
    val observacao: String?,
    val enderecoEntrega: String?,
    val dataAgendada: String?,
    val turno: String?,
    val motorista: String?,
    val createdAt: String,
    val itens: List<ItemEntregaResponse>,
)

@Serializable
data class EntregaResumoResponse(
    val id: String,
    val vendaId: String,
    val vendaNumero: String,
    val clienteNome: String?,
    val numero: String,
    val status: String,
    val observacao: String?,
    val enderecoEntrega: String?,
    val dataAgendada: String?,
    val turno: String?,
    val motorista: String?,
    val createdAt: String,
    val totalItens: Int,
    val itensEntregues: Int,
)
