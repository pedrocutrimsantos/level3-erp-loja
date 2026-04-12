package br.com.madeireira.modules.cobranca.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class ParcelaPendenteDto(
    val parcelaId:      String,
    val tituloId:       String,
    val tituloNumero:   String,
    val clienteId:      String?,
    val clienteNome:    String?,
    val telefone:       String?,
    val valor:          Double,
    val dataVencimento: String,    // ISO-8601 (yyyy-MM-dd)
    val diasAtraso:     Int,       // negativo = ainda não venceu
    val temTelefone:    Boolean,
)

@Serializable
data class ResultadoDisparoDto(
    val enviados: Int,
    val semFone:  Int,
    val erros:    Int,
    val detalhes: List<String>,
)

@Serializable
data class CobrancaLogDto(
    val id:         String,
    val parcelaId:  String,
    val tituloId:   String,
    val clienteId:  String?,
    val telefone:   String,
    val mensagem:   String,
    val reguaDia:   Int,
    val status:     String,
    val erroDetalhe: String?,
    val enviadoEm:  String,        // ISO-8601
)
