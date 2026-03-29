package br.com.madeireira.modules.fornecedor.domain.model

import java.util.UUID

data class Fornecedor(
    val id: UUID,
    val tipoPessoa: String,
    val cnpjCpf: String,
    val razaoSocial: String,
    val nomeFantasia: String?,
    val inscricaoEstadual: String?,
    val email: String?,
    val telefone: String?,
    val uf: String,
    val cep: String,
    val logradouro: String,
    val numero: String,
    val bairro: String,
    val cidade: String,
    val ativo: Boolean,
)
