package br.com.madeireira.modules.venda.api

import br.com.madeireira.core.security.Permissions
import br.com.madeireira.core.security.requerPermissao
import br.com.madeireira.modules.produto.api.dto.ErroResponse
import br.com.madeireira.modules.venda.api.dto.VendaBalcaoRequest
import br.com.madeireira.modules.venda.application.VendaService
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import java.util.UUID

fun Route.vendaRoutes(service: VendaService) {
    route("/api/v1/vendas") {
            get {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_VEN, Permissions.VISUALIZAR))) return@get
                val limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 50
                val vendas = service.listarVendas(limit)
                call.respond(HttpStatusCode.OK, vendas)
            }

            get("{id}") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_VEN, Permissions.VISUALIZAR))) return@get
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
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_VEN, Permissions.CRIAR))) return@post
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

            get("orcamentos") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_VEN, Permissions.VISUALIZAR))) return@get
                val limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 100
                call.respond(HttpStatusCode.OK, service.listarOrcamentos(limit))
            }

            post("orcamentos") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_VEN, Permissions.CRIAR))) return@post
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

            post("orcamentos/{id}/confirmar") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_VEN, Permissions.APROVAR))) return@post
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

            delete("orcamentos/{id}") {
                if (!call.requerPermissao(Permissions.VEN_CANCELAR)) return@delete
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
