package br.com.madeireira.modules.devolucao.api

import br.com.madeireira.core.security.Permissions
import br.com.madeireira.core.security.requerPermissao
import br.com.madeireira.modules.devolucao.api.dto.RegistrarDevolucaoRequest
import br.com.madeireira.modules.devolucao.application.DevolucaoService
import br.com.madeireira.modules.produto.api.dto.ErroResponse
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import java.util.UUID

fun Route.devolucaoRoutes(service: DevolucaoService) {

    route("/api/v1/devolucoes") {
        get {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_VEN, Permissions.VISUALIZAR))) return@get
            val limit = call.request.queryParameters["limit"]?.toIntOrNull()?.coerceIn(1, 500) ?: 200
            call.respond(HttpStatusCode.OK, service.listarTodas(limit))
        }
    }

    route("/api/v1/vendas") {
            get("{id}/itens") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_VEN, Permissions.VISUALIZAR))) return@get
                val id = call.parameters["id"]?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                    ?: return@get call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido"))
                try {
                    call.respond(HttpStatusCode.OK, service.buscarItensVenda(id))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                }
            }

            post("{id}/devolver") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_VEN, Permissions.CRIAR))) return@post
                val id = call.parameters["id"]?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                    ?: return@post call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido"))
                val req = try {
                    call.receive<RegistrarDevolucaoRequest>()
                } catch (e: Exception) {
                    return@post call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                }
                try {
                    call.respond(HttpStatusCode.Created, service.registrarDevolucao(id, req))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
                } catch (e: IllegalStateException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Estado inválido", e.message))
                }
            }
        }
}
