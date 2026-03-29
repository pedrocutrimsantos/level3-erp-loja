package br.com.madeireira.modules.financeiro.api

import br.com.madeireira.modules.financeiro.api.dto.AbrirCaixaRequest
import br.com.madeireira.modules.financeiro.api.dto.FecharCaixaRequest
import br.com.madeireira.modules.financeiro.api.dto.RegistrarSangriaRequest
import br.com.madeireira.modules.financeiro.application.TurnoService
import br.com.madeireira.modules.produto.api.dto.ErroResponse
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import java.time.LocalDate

fun Application.turnoRoutes(service: TurnoService) {
    routing {
        route("/api/v1/financeiro/turno") {

            // GET /api/v1/financeiro/turno?data=yyyy-MM-dd   (sem data = hoje)
            get {
                val data = call.request.queryParameters["data"]
                    ?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
                    ?: LocalDate.now()
                val turno = service.buscarOuNulo(data)
                if (turno == null) {
                    call.respond(HttpStatusCode.NoContent)
                } else {
                    call.respond(HttpStatusCode.OK, turno)
                }
            }

            // POST /api/v1/financeiro/turno/abrir
            post("abrir") {
                val req = runCatching { call.receive<AbrirCaixaRequest>() }.getOrElse {
                    AbrirCaixaRequest()
                }
                try {
                    call.respond(HttpStatusCode.Created, service.abrir(req))
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse(e.message ?: "Erro"))
                } catch (e: IllegalStateException) {
                    call.respond(HttpStatusCode.Conflict, ErroResponse(e.message ?: "Conflito"))
                }
            }

            // POST /api/v1/financeiro/turno/fechar
            post("fechar") {
                val req = try { call.receive<FecharCaixaRequest>() } catch (e: Exception) {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                    return@post
                }
                try {
                    call.respond(HttpStatusCode.OK, service.fechar(req))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse(e.message ?: "Não encontrado"))
                } catch (e: IllegalStateException) {
                    call.respond(HttpStatusCode.Conflict, ErroResponse(e.message ?: "Conflito"))
                }
            }

            // POST /api/v1/financeiro/turno/reabrir
            post("reabrir") {
                try {
                    call.respond(HttpStatusCode.OK, service.reabrir())
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse(e.message ?: "Não encontrado"))
                } catch (e: IllegalStateException) {
                    call.respond(HttpStatusCode.Conflict, ErroResponse(e.message ?: "Conflito"))
                }
            }

            // POST /api/v1/financeiro/turno/sangria
            post("sangria") {
                val req = try { call.receive<RegistrarSangriaRequest>() } catch (e: Exception) {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                    return@post
                }
                try {
                    call.respond(HttpStatusCode.OK, service.registrarSangria(req))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse(e.message ?: "Não encontrado"))
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse(e.message ?: "Erro"))
                } catch (e: IllegalStateException) {
                    call.respond(HttpStatusCode.Conflict, ErroResponse(e.message ?: "Conflito"))
                }
            }
        }
    }
}
