package br.com.madeireira.modules.estoque.api

import br.com.madeireira.core.security.Permissions
import br.com.madeireira.core.security.requerPermissao
import br.com.madeireira.modules.estoque.api.dto.AjusteEstoqueRequest
import br.com.madeireira.modules.estoque.application.EstoqueService
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

fun Route.estoqueRoutes(service: EstoqueService) {
    route("/api/v1/estoque") {

            get("saldo/{produtoId}") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_EST, Permissions.VISUALIZAR))) return@get
                val id = parseUUID(call.parameters["produtoId"]) ?: run {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido", "O parâmetro 'produtoId' não é um UUID válido"))
                    return@get
                }
                try {
                    call.respond(HttpStatusCode.OK, service.consultarSaldo(id))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                }
            }

            get("movimentacoes") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_EST, Permissions.VISUALIZAR))) return@get
                val produtoId = call.request.queryParameters["produtoId"]?.let { parseUUID(it) }
                val tipo  = call.request.queryParameters["tipo"]
                val limit = call.request.queryParameters["limit"]?.toIntOrNull()?.coerceIn(1, 500) ?: 100
                call.respond(HttpStatusCode.OK, service.listarMovimentacoesGeral(produtoId, tipo, limit))
            }

            get("movimentacoes/{produtoId}") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_EST, Permissions.VISUALIZAR))) return@get
                val id = parseUUID(call.parameters["produtoId"]) ?: run {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido", "O parâmetro 'produtoId' não é um UUID válido"))
                    return@get
                }
                val limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 50
                try {
                    call.respond(HttpStatusCode.OK, service.listarMovimentacoes(id, limit))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                }
            }

            get("sublotes/{produtoId}") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_EST, Permissions.VISUALIZAR))) return@get
                val id = parseUUID(call.parameters["produtoId"]) ?: run {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido", "O parâmetro 'produtoId' não é um UUID válido"))
                    return@get
                }
                try {
                    call.respond(HttpStatusCode.OK, service.listarSublotes(id))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                }
            }

            post("ajuste") {
                if (!call.requerPermissao(Permissions.EST_AJUSTE_ESTOQUE)) return@post
                val req = try {
                    call.receive<AjusteEstoqueRequest>()
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                    return@post
                }
                try {
                    call.respond(HttpStatusCode.Created, service.registrarAjuste(req))
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                } catch (e: ConcurrentModificationException) {
                    call.respond(HttpStatusCode.Conflict, ErroResponse("Conflito de versão", e.message))
                }
            }
        }
}

private fun parseUUID(value: String?): UUID? =
    value?.let { runCatching { UUID.fromString(it) }.getOrNull() }
