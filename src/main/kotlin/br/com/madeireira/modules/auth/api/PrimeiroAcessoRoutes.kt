package br.com.madeireira.modules.auth.api

import br.com.madeireira.modules.auth.application.PrimeiroAcessoService
import br.com.madeireira.modules.produto.api.dto.ErroResponse
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import kotlinx.serialization.Serializable

// ── DTOs de entrada ───────────────────────────────────────────────────────────

@Serializable private data class SolicitarPaRequest(
    val email: String,
    val canal: String = "WHATSAPP",
)

@Serializable private data class ValidarTokenPaRequest(
    val email: String,
    val token: String,
)

@Serializable private data class DefinirSenhaPaRequest(
    val email: String,
    val token: String,
    val novaSenha: String,
    val confirmacaoSenha: String,
)

// ── Rotas (todas públicas — sem JWT) ─────────────────────────────────────────

fun Route.primeiroAcessoRoutes(service: PrimeiroAcessoService) {
    route("/api/v1/auth/primeiro-acesso") {

        // POST /solicitar — envia token via WhatsApp
        post("solicitar") {
            val req = try {
                call.receive<SolicitarPaRequest>()
            } catch (e: Exception) {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                return@post
            }
            val slug = tenantSlugFromCall(call)
            runCatching { service.solicitar(req.email, req.canal, slug) }
            // Resposta sempre genérica — não revela se o e-mail existe
            call.respond(HttpStatusCode.OK, mapOf("mensagem" to "Se o e-mail estiver cadastrado e em situação de primeiro acesso, o código foi enviado."))
        }

        // POST /validar-token — verifica se o token está correto (sem definir senha ainda)
        post("validar-token") {
            val req = try {
                call.receive<ValidarTokenPaRequest>()
            } catch (e: Exception) {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                return@post
            }
            val slug = tenantSlugFromCall(call)
            try {
                service.validarToken(req.email, req.token, slug)
                call.respond(HttpStatusCode.OK, mapOf("valido" to true))
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Código inválido", e.message))
            }
        }

        // POST /definir-senha — valida token e persiste a nova senha
        post("definir-senha") {
            val req = try {
                call.receive<DefinirSenhaPaRequest>()
            } catch (e: Exception) {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                return@post
            }
            val slug = tenantSlugFromCall(call)
            try {
                service.definirSenha(req.email, req.token, req.novaSenha, req.confirmacaoSenha, slug)
                call.respond(HttpStatusCode.OK, mapOf("ok" to true, "mensagem" to "Senha definida com sucesso. Você já pode fazer login."))
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro", e.message))
            }
        }

        // POST /reenviar — reenvio com cooldown e limite
        post("reenviar") {
            val req = try {
                call.receive<SolicitarPaRequest>()
            } catch (e: Exception) {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                return@post
            }
            val slug = tenantSlugFromCall(call)
            runCatching { service.reenviar(req.email, req.canal, slug) }
            call.respond(HttpStatusCode.OK, mapOf("mensagem" to "Se o reenvio for permitido, um novo código foi enviado."))
        }
    }
}

/** Reutiliza a mesma lógica de extração de tenant já existente no AuthRoutes. */
private fun tenantSlugFromCall(call: io.ktor.server.application.ApplicationCall): String {
    val defaultSlug  = System.getenv("DEFAULT_TENANT") ?: "piloto"
    val useSubdomain = System.getenv("USE_SUBDOMAIN_TENANT") == "true"
    if (!useSubdomain) return defaultSlug
    val host  = call.request.headers["Host"]
    if (host.isNullOrBlank()) return defaultSlug
    val parts = host.substringBefore(":").split(".")
    return if (parts.size >= 3) parts[0].lowercase() else defaultSlug
}
