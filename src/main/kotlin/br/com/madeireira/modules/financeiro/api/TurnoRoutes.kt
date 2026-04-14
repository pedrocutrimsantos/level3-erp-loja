package br.com.madeireira.modules.financeiro.api

import br.com.madeireira.core.security.Permissions
import br.com.madeireira.core.security.requerPermissao
import br.com.madeireira.modules.financeiro.api.dto.AbrirCaixaRequest
import br.com.madeireira.modules.financeiro.api.dto.FecharCaixaRequest
import br.com.madeireira.modules.financeiro.api.dto.RegistrarSangriaRequest
import br.com.madeireira.modules.financeiro.application.TurnoService
import br.com.madeireira.modules.produto.api.dto.ErroResponse
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import java.time.LocalDate

fun Route.turnoRoutes(service: TurnoService) {
    route("/api/v1/financeiro/turno") {

            get {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_FIN, Permissions.VISUALIZAR))) return@get
                val data = call.request.queryParameters["data"]
                    ?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
                    ?: LocalDate.now()
                val turno = service.buscarOuNulo(data)
                if (turno == null) call.respond(HttpStatusCode.NoContent)
                else call.respond(HttpStatusCode.OK, turno)
            }

            post("abrir") {
                if (!call.requerPermissao(Permissions.CAI_ABRIR_FECHAR)) return@post
                val req = runCatching { call.receive<AbrirCaixaRequest>() }.getOrElse { AbrirCaixaRequest() }
                try {
                    call.respond(HttpStatusCode.Created, service.abrir(req))
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse(e.message ?: "Erro"))
                } catch (e: IllegalStateException) {
                    call.respond(HttpStatusCode.Conflict, ErroResponse(e.message ?: "Conflito"))
                }
            }

            post("fechar") {
                if (!call.requerPermissao(Permissions.CAI_ABRIR_FECHAR)) return@post
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

            post("reabrir") {
                if (!call.requerPermissao(Permissions.CAI_ABRIR_FECHAR)) return@post
                try {
                    call.respond(HttpStatusCode.OK, service.reabrir())
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse(e.message ?: "Não encontrado"))
                } catch (e: IllegalStateException) {
                    call.respond(HttpStatusCode.Conflict, ErroResponse(e.message ?: "Conflito"))
                }
            }

            post("sangria") {
                if (!call.requerPermissao(Permissions.CAI_SANGRIA_SUPRIMENTO)) return@post
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
