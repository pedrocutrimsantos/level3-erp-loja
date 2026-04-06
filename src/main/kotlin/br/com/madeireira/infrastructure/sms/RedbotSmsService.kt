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
        val body   = """{"key":"$key","destinatario":"$numero","mensagem":"${mensagem.replace("\"", "\\\"")}"}"""
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
        fun fromEnv(client: HttpClient): RedbotWhatsAppService? {
            val url = System.getenv("REDBOT_URL") ?: "https://redbot.redoctopus.com.br/send"
            val key = System.getenv("REDBOT_KEY") ?: return null
            return RedbotWhatsAppService(client, url, key)
        }
    }
}
