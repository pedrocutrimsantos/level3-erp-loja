package br.com.madeireira.modules.cliente.api

import br.com.madeireira.core.security.Permissions
import br.com.madeireira.core.security.requerPermissao
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

            get {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_CAD, Permissions.VISUALIZAR))) return@get
                val apenasAtivos = call.request.queryParameters["ativo"]?.lowercase() != "false"
                call.respond(HttpStatusCode.OK, service.listar(apenasAtivos))
            }

            get("{id}") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_CAD, Permissions.VISUALIZAR))) return@get
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

            post {
                if (!call.requerPermissao("CAD:CLIENTE:CRIAR")) return@post
                val req = try {
                    call.receive<CriarClienteRequest>()
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                    return@post
                }
                try {
                    call.respond(HttpStatusCode.Created, service.criar(req))
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
                }
            }

            put("{id}") {
                if (!call.requerPermissao("CAD:CLIENTE:EDITAR")) return@put
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

            delete("{id}") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_CAD, Permissions.EXCLUIR))) return@delete
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
