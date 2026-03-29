package br.com.madeireira.modules.fornecedor.api

import br.com.madeireira.modules.fornecedor.application.FornecedorService
import br.com.madeireira.modules.fornecedor.api.dto.CriarFornecedorRequest
import br.com.madeireira.modules.produto.api.dto.ErroResponse
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import java.util.UUID

fun Application.fornecedorRoutes(service: FornecedorService) {
    routing {
        route("/api/v1/fornecedores") {
            get {
                val ativo = call.request.queryParameters["ativo"]?.let {
                    it.lowercase() != "false"
                }
                call.respond(HttpStatusCode.OK, service.listar(ativo))
            }

            get("{id}") {
                val id = call.parameters["id"]?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                    ?: return@get call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido"))
                call.respond(HttpStatusCode.OK, service.buscarPorId(id))
            }

            post {
                val req = try {
                    call.receive<CriarFornecedorRequest>()
                } catch (e: Exception) {
                    return@post call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                }
                try {
                    val resp = service.criar(req)
                    call.respond(HttpStatusCode.Created, resp)
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
                }
            }
        }
    }
}
