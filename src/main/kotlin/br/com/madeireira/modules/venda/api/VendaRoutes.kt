package br.com.madeireira.modules.venda.api

import br.com.madeireira.modules.produto.api.dto.ErroResponse
import br.com.madeireira.modules.venda.api.dto.VendaBalcaoRequest
import br.com.madeireira.modules.venda.application.VendaService
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import java.util.UUID

fun Application.vendaRoutes(service: VendaService) {
    routing {
        route("/api/v1/vendas") {
            get {
                val limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 50
                val vendas = service.listarVendas(limit)
                call.respond(HttpStatusCode.OK, vendas)
            }

            // GET /api/v1/vendas/{id}
            get("{id}") {
                val id = call.parameters["id"]?.let { runCatching { UUID.fromString(it) }.getOrNull() } ?: run {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido"))
                    return@get
                }
                try {
                    call.respond(HttpStatusCode.OK, service.buscarVendaDetalhe(id))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse(e.message ?: "Não encontrado"))
                }
            }

            post("balcao") {
                val req = try {
                    call.receive<VendaBalcaoRequest>()
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                    return@post
                }
                try {
                    val resp = service.registrarVendaBalcao(req)
                    call.respond(HttpStatusCode.Created, resp)
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
                } catch (e: IllegalStateException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de configuração", e.message))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                }
            }

            // GET  /api/v1/vendas/orcamentos
            get("orcamentos") {
                val limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 100
                call.respond(HttpStatusCode.OK, service.listarOrcamentos(limit))
            }

            // POST /api/v1/vendas/orcamentos
            post("orcamentos") {
                val req = try {
                    call.receive<VendaBalcaoRequest>()
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                    return@post
                }
                try {
                    val resp = service.registrarOrcamento(req)
                    call.respond(HttpStatusCode.Created, resp)
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
                } catch (e: IllegalStateException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de configuração", e.message))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                }
            }

            // POST /api/v1/vendas/orcamentos/{id}/confirmar
            post("orcamentos/{id}/confirmar") {
                val id = call.parameters["id"]?.let { runCatching { UUID.fromString(it) }.getOrNull() } ?: run {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido"))
                    return@post
                }
                try {
                    val resp = service.confirmarOrcamento(id)
                    call.respond(HttpStatusCode.OK, resp)
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
                } catch (e: IllegalStateException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Estado inválido", e.message))
                }
            }

            // DELETE /api/v1/vendas/orcamentos/{id}
            delete("orcamentos/{id}") {
                val id = call.parameters["id"]?.let { runCatching { UUID.fromString(it) }.getOrNull() } ?: run {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido"))
                    return@delete
                }
                try {
                    service.cancelarOrcamento(id)
                    call.respond(HttpStatusCode.NoContent)
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
                }
            }
        }
    }
}
