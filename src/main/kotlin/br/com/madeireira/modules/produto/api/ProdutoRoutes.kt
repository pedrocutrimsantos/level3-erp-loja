package br.com.madeireira.modules.produto.api

import br.com.madeireira.modules.produto.api.dto.AtualizarDimensaoRequest
import br.com.madeireira.modules.produto.api.dto.AtualizarPrecoRequest
import br.com.madeireira.modules.produto.api.dto.AtualizarProdutoRequest
import br.com.madeireira.modules.produto.api.dto.CriarProdutoRequest
import br.com.madeireira.modules.produto.api.dto.ErroResponse
import br.com.madeireira.modules.produto.api.dto.SalvarPrecificacaoRequest
import br.com.madeireira.modules.produto.application.ProdutoService
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.patch
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import java.util.UUID

fun Application.produtoRoutes(service: ProdutoService) {
    routing {
        route("/api/v1/produtos") {

            // GET /api/v1/produtos/unidades
            get("unidades") {
                val unidades = service.listarUnidades()
                call.respond(HttpStatusCode.OK, unidades)
            }

            // GET /api/v1/produtos?ativo=true|false
            get {
                val ativoParam = call.request.queryParameters["ativo"]
                val apenasAtivos = ativoParam?.lowercase() != "false"
                val produtos = service.listar(apenasAtivos)
                call.respond(HttpStatusCode.OK, produtos)
            }

            // GET /api/v1/produtos/{id}
            get("{id}") {
                val id = parseUUID(call.parameters["id"]) ?: run {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErroResponse("ID inválido", "O parâmetro 'id' não é um UUID válido"),
                    )
                    return@get
                }
                try {
                    val produto = service.buscarPorId(id)
                    call.respond(HttpStatusCode.OK, produto)
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                }
            }

            // POST /api/v1/produtos
            post {
                val req = try {
                    call.receive<CriarProdutoRequest>()
                } catch (e: Exception) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErroResponse("Requisição inválida", e.message),
                    )
                    return@post
                }
                try {
                    val produto = service.criar(req)
                    call.respond(HttpStatusCode.Created, produto)
                } catch (e: IllegalArgumentException) {
                    call.respond(
                        HttpStatusCode.UnprocessableEntity,
                        ErroResponse("Erro de validação", e.message),
                    )
                }
            }

            // PUT /api/v1/produtos/{id}
            put("{id}") {
                val id = parseUUID(call.parameters["id"]) ?: run {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido", "O parâmetro 'id' não é um UUID válido"))
                    return@put
                }
                val req = try {
                    call.receive<AtualizarProdutoRequest>()
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                    return@put
                }
                try {
                    val produto = service.atualizar(id, req)
                    call.respond(HttpStatusCode.OK, produto)
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
                }
            }

            // DELETE /api/v1/produtos/{id}  — soft delete (inativa)
            delete("{id}") {
                val id = parseUUID(call.parameters["id"]) ?: run {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido", "O parâmetro 'id' não é um UUID válido"))
                    return@delete
                }
                try {
                    val produto = service.inativar(id)
                    call.respond(HttpStatusCode.OK, produto)
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                }
            }

            // GET /api/v1/produtos/{id}/precificacao
            get("{id}/precificacao") {
                val id = parseUUID(call.parameters["id"]) ?: run {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido", "O parâmetro 'id' não é um UUID válido"))
                    return@get
                }
                try {
                    val prec = service.buscarPrecificacao(id)
                    call.respond(HttpStatusCode.OK, prec)
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                }
            }

            // PUT /api/v1/produtos/{id}/precificacao
            put("{id}/precificacao") {
                val id = parseUUID(call.parameters["id"]) ?: run {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido", "O parâmetro 'id' não é um UUID válido"))
                    return@put
                }
                val req = try {
                    call.receive<SalvarPrecificacaoRequest>()
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                    return@put
                }
                try {
                    val prec = service.salvarPrecificacao(id, req)
                    call.respond(HttpStatusCode.OK, prec)
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
                }
            }

            // PATCH /api/v1/produtos/{id}/preco
            patch("{id}/preco") {
                val id = parseUUID(call.parameters["id"]) ?: run {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido", "O parâmetro 'id' não é um UUID válido"))
                    return@patch
                }
                val req = try {
                    call.receive<AtualizarPrecoRequest>()
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                    return@patch
                }
                try {
                    val produto = service.atualizarPreco(id, req)
                    call.respond(HttpStatusCode.OK, produto)
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                }
            }

            // PUT /api/v1/produtos/{id}/dimensao
            put("{id}/dimensao") {
                val id = parseUUID(call.parameters["id"]) ?: run {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErroResponse("ID inválido", "O parâmetro 'id' não é um UUID válido"),
                    )
                    return@put
                }
                val req = try {
                    call.receive<AtualizarDimensaoRequest>()
                } catch (e: Exception) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErroResponse("Requisição inválida", e.message),
                    )
                    return@put
                }
                try {
                    val dimensao = service.atualizarDimensao(id, req)
                    call.respond(HttpStatusCode.OK, dimensao)
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                } catch (e: IllegalArgumentException) {
                    call.respond(
                        HttpStatusCode.UnprocessableEntity,
                        ErroResponse("Erro de validação", e.message),
                    )
                }
            }
        }
    }
}

private fun parseUUID(value: String?): UUID? =
    value?.let { runCatching { UUID.fromString(it) }.getOrNull() }
