package br.com.madeireira.modules.devolucao.api

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

    // GET /api/v1/devolucoes  — lista todas as devoluções
    route("/api/v1/devolucoes") {
        get {
            val limit = call.request.queryParameters["limit"]?.toIntOrNull()?.coerceIn(1, 500) ?: 200
            call.respond(HttpStatusCode.OK, service.listarTodas(limit))
        }
    }

    route("/api/v1/vendas") {
            // GET /api/v1/vendas/{id}/itens  — lista itens para o modal de devolução
            get("{id}/itens") {
                val id = call.parameters["id"]?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                    ?: return@get call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido"))
                try {
                    call.respond(HttpStatusCode.OK, service.buscarItensVenda(id))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                }
            }

            // POST /api/v1/vendas/{id}/devolver
            post("{id}/devolver") {
                val id = call.parameters["id"]?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                    ?: return@post call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido"))
                val req = try {
                    call.receive<RegistrarDevolucaoRequest>()
                } catch (e: Exception) {
                    return@post call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                }
                try {
                    val resp = service.registrarDevolucao(id, req)
                    call.respond(HttpStatusCode.Created, resp)
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
