package br.com.madeireira.modules.estoque.api

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

            // GET /api/v1/estoque/saldo/{produtoId}
            get("saldo/{produtoId}") {
                val id = parseUUID(call.parameters["produtoId"]) ?: run {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErroResponse("ID inválido", "O parâmetro 'produtoId' não é um UUID válido"),
                    )
                    return@get
                }
                try {
                    val saldo = service.consultarSaldo(id)
                    call.respond(HttpStatusCode.OK, saldo)
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                }
            }

            // GET /api/v1/estoque/movimentacoes?produtoId=...&tipo=...&limit=100
            get("movimentacoes") {
                val produtoId = call.request.queryParameters["produtoId"]?.let { parseUUID(it) }
                val tipo  = call.request.queryParameters["tipo"]
                val limit = call.request.queryParameters["limit"]?.toIntOrNull()?.coerceIn(1, 500) ?: 100
                val movs = service.listarMovimentacoesGeral(produtoId, tipo, limit)
                call.respond(HttpStatusCode.OK, movs)
            }

            // GET /api/v1/estoque/movimentacoes/{produtoId}?limit=50
            get("movimentacoes/{produtoId}") {
                val id = parseUUID(call.parameters["produtoId"]) ?: run {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErroResponse("ID inválido", "O parâmetro 'produtoId' não é um UUID válido"),
                    )
                    return@get
                }
                val limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 50
                try {
                    val movimentacoes = service.listarMovimentacoes(id, limit)
                    call.respond(HttpStatusCode.OK, movimentacoes)
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                }
            }

            // GET /api/v1/estoque/sublotes/{produtoId}
            get("sublotes/{produtoId}") {
                val id = parseUUID(call.parameters["produtoId"]) ?: run {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErroResponse("ID inválido", "O parâmetro 'produtoId' não é um UUID válido"),
                    )
                    return@get
                }
                try {
                    val sublotes = service.listarSublotes(id)
                    call.respond(HttpStatusCode.OK, sublotes)
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                }
            }

            // POST /api/v1/estoque/ajuste
            post("ajuste") {
                val req = try {
                    call.receive<AjusteEstoqueRequest>()
                } catch (e: Exception) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErroResponse("Requisição inválida", e.message),
                    )
                    return@post
                }
                try {
                    val mov = service.registrarAjuste(req)
                    call.respond(HttpStatusCode.Created, mov)
                } catch (e: IllegalArgumentException) {
                    call.respond(
                        HttpStatusCode.UnprocessableEntity,
                        ErroResponse("Erro de validação", e.message),
                    )
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                } catch (e: ConcurrentModificationException) {
                    call.respond(
                        HttpStatusCode.Conflict,
                        ErroResponse("Conflito de versão", e.message),
                    )
                }
            }
        }
}

private fun parseUUID(value: String?): UUID? =
    value?.let { runCatching { UUID.fromString(it) }.getOrNull() }
