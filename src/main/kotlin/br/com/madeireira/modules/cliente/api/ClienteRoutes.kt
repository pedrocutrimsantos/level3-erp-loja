package br.com.madeireira.modules.cliente.api

import br.com.madeireira.modules.cliente.api.dto.AtualizarClienteRequest
import br.com.madeireira.modules.cliente.api.dto.CriarClienteRequest
import br.com.madeireira.modules.cliente.application.ClienteService
import br.com.madeireira.modules.produto.api.dto.ErroResponse
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import java.util.UUID

fun Route.clienteRoutes(service: ClienteService) {
    route("/api/v1/clientes") {

            // GET /api/v1/clientes?ativo=true
            get {
                val apenasAtivos = call.request.queryParameters["ativo"]?.lowercase() != "false"
                call.respond(HttpStatusCode.OK, service.listar(apenasAtivos))
            }

            // GET /api/v1/clientes/:id
            get("{id}") {
                val id = parseUUID(call.parameters["id"]) ?: run {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido"))
                    return@get
                }
                try {
                    call.respond(HttpStatusCode.OK, service.buscarPorId(id))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                }
            }

            // POST /api/v1/clientes
            post {
                val req = try {
                    call.receive<CriarClienteRequest>()
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                    return@post
                }
                try {
                    val cliente = service.criar(req)
                    call.respond(HttpStatusCode.Created, cliente)
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
                }
            }

            // PUT /api/v1/clientes/:id
            put("{id}") {
                val id = parseUUID(call.parameters["id"]) ?: run {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido"))
                    return@put
                }
                val req = try {
                    call.receive<AtualizarClienteRequest>()
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                    return@put
                }
                try {
                    call.respond(HttpStatusCode.OK, service.atualizar(id, req))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
                }
            }

            // DELETE /api/v1/clientes/:id  — soft delete
            delete("{id}") {
                val id = parseUUID(call.parameters["id"]) ?: run {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido"))
                    return@delete
                }
                try {
                    call.respond(HttpStatusCode.OK, service.inativar(id))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                }
            }
        }
}

private fun parseUUID(value: String?): UUID? =
    value?.let { runCatching { UUID.fromString(it) }.getOrNull() }
