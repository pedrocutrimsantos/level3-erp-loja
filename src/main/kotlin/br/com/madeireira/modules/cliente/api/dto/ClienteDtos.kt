package br.com.madeireira.modules.cliente.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class CriarClienteRequest(
    val tipoPessoa: String,        // "PF" | "PJ"
    val cnpjCpf: String? = null,   // apenas dígitos ou formatado
    val razaoSocial: String,       // nome completo (PF) ou razão social (PJ)
    val nomeFantasia: String? = null,
    val email: String? = null,
    val telefone: String? = null,
)

@Serializable
data class AtualizarClienteRequest(
    val razaoSocial: String,
    val nomeFantasia: String? = null,
    val email: String? = null,
    val telefone: String? = null,
)

@Serializable
data class ClienteResponse(
    val id: String,
    val tipoPessoa: String,
    val cnpjCpf: String?,
    val razaoSocial: String,
    val nomeFantasia: String?,
    val email: String?,
    val telefone: String?,
    val limiteCred: String,
    val saldoDevedor: String,
    val statusInad: String,
    val ativo: Boolean,
)
