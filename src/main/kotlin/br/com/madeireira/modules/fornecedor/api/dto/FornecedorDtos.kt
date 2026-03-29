package br.com.madeireira.modules.fornecedor.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class FornecedorResponse(
    val id: String,
    val tipoPessoa: String,
    val cnpjCpf: String,
    val razaoSocial: String,
    val nomeFantasia: String?,
    val email: String?,
    val telefone: String?,
    val uf: String?,
    val cidade: String?,
    val ativo: Boolean,
)

@Serializable
data class CriarFornecedorRequest(
    val tipoPessoa: String,          // "PF" | "PJ"
    val cnpjCpf: String,
    val razaoSocial: String,
    val nomeFantasia: String? = null,
    val inscricaoEstadual: String? = null,
    val email: String? = null,
    val telefone: String? = null,
    val uf: String? = null,
    val cep: String? = null,
    val logradouro: String? = null,
    val numero: String? = null,
    val bairro: String? = null,
    val cidade: String? = null,
)
