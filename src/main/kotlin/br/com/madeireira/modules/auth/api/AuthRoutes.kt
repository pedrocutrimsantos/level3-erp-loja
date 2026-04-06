package br.com.madeireira.modules.auth.api

import br.com.madeireira.modules.auth.application.AuthService
import br.com.madeireira.modules.auth.domain.LoginRequest
import br.com.madeireira.modules.auth.domain.MeResponse
import br.com.madeireira.modules.produto.api.dto.ErroResponse
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import kotlinx.serialization.Serializable

@Serializable private data class SolicitarResetRequest(val email: String)
@Serializable private data class ConfirmarResetRequest(val token: String, val novaSenha: String)
@Serializable private data class AlterarSenhaRequest(val senhaAtual: String, val novaSenha: String)

/** Extrai o slug do tenant a partir do subdomínio do Host header.
 *  A detecção por subdomínio só ativa quando USE_SUBDOMAIN_TENANT=true.
 *  Por padrão (Railway, dev local, domínio sem subdomínio) usa DEFAULT_TENANT ou "piloto".
 *
 *  Com USE_SUBDOMAIN_TENANT=true:
 *    "piloto.madex.com.br" → "piloto"
 *
 *  Sem USE_SUBDOMAIN_TENANT (padrão):
 *    qualquer host → DEFAULT_TENANT (ou "piloto")
 */
private fun tenantSlugFromHost(host: String?): String {
    val defaultSlug    = System.getenv("DEFAULT_TENANT")        ?: "piloto"
    val useSubdomain   = System.getenv("USE_SUBDOMAIN_TENANT") == "true"
    if (!useSubdomain) return defaultSlug
    if (host.isNullOrBlank()) return defaultSlug
    val hostname = host.substringBefore(":") // remove porta
    val parts    = hostname.split(".")
    return if (parts.size >= 3) parts[0].lowercase() else defaultSlug
}

fun Route.authRoutes(authService: AuthService) {
    route("/api/v1/auth") {

        // POST /api/v1/auth/login — público
        post("login") {
            val req = try {
                call.receive<LoginRequest>()
            } catch (e: Exception) {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                return@post
            }
            try {
                val slug = tenantSlugFromHost(call.request.headers["Host"])
                val resp = authService.login(req, slug)
                call.respond(HttpStatusCode.OK, resp)
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.Unauthorized, ErroResponse("Autenticação falhou", e.message))
            } catch (e: Exception) {
                call.application.environment.log.error("Erro no login para '${req.email}'", e)
                call.respond(HttpStatusCode.InternalServerError, ErroResponse("Erro interno. Tente novamente."))
            }
        }

        // POST /api/v1/auth/solicitar-reset — público
        post("solicitar-reset") {
            val req = try { call.receive<SolicitarResetRequest>() } catch (e: Exception) {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                return@post
            }
            try {
                val slug  = tenantSlugFromHost(call.request.headers["Host"])
                val token = authService.solicitarReset(req.email, slug)
                call.respond(HttpStatusCode.OK, mapOf("token" to token))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.OK, mapOf("token" to "")) // não revela erros
            }
        }

        // POST /api/v1/auth/confirmar-reset — público
        post("confirmar-reset") {
            val req = try { call.receive<ConfirmarResetRequest>() } catch (e: Exception) {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                return@post
            }
            try {
                val slug = tenantSlugFromHost(call.request.headers["Host"])
                authService.confirmarReset(req.token, req.novaSenha, slug)
                call.respond(HttpStatusCode.OK, mapOf("ok" to true))
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro", e.message))
            }
        }

        // GET /api/v1/auth/me + POST alterar-senha — requer JWT
        authenticate("jwt") {
            get("me") {
                val principal = call.principal<JWTPrincipal>()!!
                val payload   = principal.payload
                call.respond(
                    HttpStatusCode.OK,
                    MeResponse(
                        userId = payload.subject,
                        nome   = payload.getClaim("nome").asString() ?: "",
                        email  = payload.getClaim("email").asString() ?: "",
                        perfil = payload.getClaim("perfil").asString() ?: "",
                        tenant = payload.getClaim("tenant").asString() ?: "",
                    )
                )
            }

            // POST /api/v1/auth/alterar-senha
            post("alterar-senha") {
                val principal = call.principal<JWTPrincipal>()!!
                val userId    = principal.payload.subject
                val slug      = principal.payload.getClaim("tenant").asString() ?: ""
                val req = try { call.receive<AlterarSenhaRequest>() } catch (e: Exception) {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                    return@post
                }
                try {
                    authService.alterarSenha(userId, req.senhaAtual, req.novaSenha, slug)
                    call.respond(HttpStatusCode.OK, mapOf("ok" to true))
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro", e.message))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Usuário não encontrado"))
                }
            }
        }
    }
}
