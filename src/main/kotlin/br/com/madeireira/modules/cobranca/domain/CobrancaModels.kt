package br.com.madeireira.modules.cobranca.domain

import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/**
 * Parcela pendente de cobrança — resultado do join parcela + título + cliente.
 */
data class ParcelaPendente(
    val parcelaId:      UUID,
    val tituloId:       UUID,
    val tituloNumero:   String,
    val clienteId:      UUID?,
    val clienteNome:    String?,
    val telefone:       String?,             // null = sem telefone cadastrado — não enviável
    val valor:          BigDecimal,
    val dataVencimento: LocalDate,
    val diasAtraso:     Int,                 // negativo = ainda não venceu (ex: -1 = vence amanhã)
)

/**
 * Registro de uma cobrança enviada (espelha a tabela cobranca_log).
 */
data class CobrancaLog(
    val id:           UUID,
    val parcelaId:    UUID,
    val tituloId:     UUID,
    val clienteId:    UUID?,
    val telefone:     String,
    val mensagem:     String,
    val reguaDia:     Int,                   // -1=véspera, 0=vencimento, 3,7,15,30=dias após
    val status:       String,                // ENVIADO | ERRO
    val erroDetalhe:  String?,
    val enviadoEm:    Instant,
)

/**
 * Resposta de disparo de cobrança.
 */
data class ResultadoDisparo(
    val enviados:  Int,
    val semFone:   Int,                      // ignorados por falta de telefone
    val erros:     Int,
    val detalhes:  List<String>,
)

/**
 * Dias da régua de cobrança — determina se/quando enviar mensagem.
 *
 * Negativo = antes do vencimento, 0 = no vencimento, positivo = após.
 * Ex: [-1, 0, 3, 7, 15, 30] envia na véspera, no dia, e 3/7/15/30 dias depois.
 */
val REGUA_DIAS = listOf(-1, 0, 3, 7, 15, 30)
