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

/** Extrai o slug do tenant a partir do subdomínio do Host header.
 *  Ex.: "piloto.seuapp.com" → "piloto"
 *  Fallback para dev local (localhost / IP / domínio sem subdomínio): env DEFAULT_TENANT ou "piloto".
 */
private fun tenantSlugFromHost(host: String?): String {
    val defaultSlug = System.getenv("DEFAULT_TENANT") ?: "piloto"
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

        // GET /api/v1/auth/me — requer JWT
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
        }
    }
}
