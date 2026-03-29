package br.com.madeireira.modules.fiscal.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class NfListItemResponse(
    val id: String,
    val vendaId: String?,
    val vendaNumero: String?,
    val numero: Int,
    val serie: String,
    val statusSefaz: String,
    val ambiente: String,
    val chaveAcesso: String?,
    val dataEmissao: String,
    val dataAutorizacao: String?,
    val protocoloAutorizacao: String?,
    val motivoRejeicao: String?,
)

@Serializable
data class VendaPendenteNfResponse(
    val vendaId: String,
    val vendaNumero: String,
    val clienteNome: String?,
    val valorTotal: String,
    val formaPagamento: String?,
    val createdAt: String,
)

@Serializable
data class EmitirNfRequest(
    val vendaId: String,
)

@Serializable
data class CancelarNfRequest(
    val justificativa: String,
)
