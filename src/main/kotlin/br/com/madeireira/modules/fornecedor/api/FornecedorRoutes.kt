package br.com.madeireira.modules.fornecedor.api

import br.com.madeireira.core.security.Permissions
import br.com.madeireira.core.security.requerPermissao
import br.com.madeireira.modules.fornecedor.application.FornecedorService
import br.com.madeireira.modules.fornecedor.api.dto.CriarFornecedorRequest
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

fun Route.fornecedorRoutes(service: FornecedorService) {
    route("/api/v1/fornecedores") {
            get {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_CAD, Permissions.VISUALIZAR))) return@get
                val ativo = call.request.queryParameters["ativo"]?.let { it.lowercase() != "false" }
                call.respond(HttpStatusCode.OK, service.listar(ativo))
            }

            get("{id}") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_CAD, Permissions.VISUALIZAR))) return@get
                val id = call.parameters["id"]?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                    ?: return@get call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido"))
                call.respond(HttpStatusCode.OK, service.buscarPorId(id))
            }

            post {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_CAD, Permissions.CRIAR))) return@post
                val req = try {
                    call.receive<CriarFornecedorRequest>()
                } catch (e: Exception) {
                    return@post call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                }
                try {
                    call.respond(HttpStatusCode.Created, service.criar(req))
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
                }
            }
        }
}
