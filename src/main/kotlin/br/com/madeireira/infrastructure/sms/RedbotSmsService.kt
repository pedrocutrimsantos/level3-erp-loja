package br.com.madeireira.infrastructure.sms

import io.ktor.client.HttpClient
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType

class RedbotWhatsAppService(
    private val client: HttpClient,
    private val url: String,
    private val key: String,
) {
    suspend fun enviar(telefone: String, mensagem: String) {
        val numero = normalizar(telefone)
        val msgEscapada = mensagem
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t")
        val body = """{"key":"$key","destinatario":"$numero","mensagem":"$msgEscapada"}"""
        client.post(url) {
            contentType(ContentType.Application.Json)
            setBody(body)
        }
    }

    /** Remove formatação e garante código do país 55 (Brasil). */
    private fun normalizar(telefone: String): String {
        val digits = telefone.filter { it.isDigit() }
        return if (digits.startsWith("55")) digits else "55$digits"
    }

    companion object {
        private const val DEFAULT_KEY = "HcKH9V67HAfiWmec4vSsyp"
        private const val DEFAULT_URL = "https://redbot.redoctopus.com.br/send"

        fun fromEnv(client: HttpClient): RedbotWhatsAppService {
            val url = System.getenv("REDBOT_URL") ?: DEFAULT_URL
            val key = System.getenv("REDBOT_KEY") ?: DEFAULT_KEY
            return RedbotWhatsAppService(client, url, key)
        }
    }
}
