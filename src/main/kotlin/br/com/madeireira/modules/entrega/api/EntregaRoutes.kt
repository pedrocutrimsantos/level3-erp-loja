package br.com.madeireira.modules.entrega.api

import br.com.madeireira.core.security.Permissions
import br.com.madeireira.core.security.requerPermissao
import br.com.madeireira.modules.entrega.api.dto.CriarEntregaRequest
import br.com.madeireira.modules.entrega.api.dto.ConfirmarEntregaRequest
import br.com.madeireira.modules.entrega.application.EntregaService
import br.com.madeireira.modules.produto.api.dto.ErroResponse
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.util.UUID

fun Route.entregaRoutes(service: EntregaService) {
    route("/api/v1") {
            post("/vendas/{id}/entrega") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_ENT, Permissions.CRIAR))) return@post
                val vendaId = call.parameters["id"]?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                    ?: return@post call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido"))
                val req = try {
                    call.receive<CriarEntregaRequest>()
                } catch (e: Exception) {
                    return@post call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                }
                try {
                    call.respond(HttpStatusCode.Created, service.criarEntrega(vendaId, req))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
                }
            }

            get("/entregas") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_ENT, Permissions.VISUALIZAR))) return@get
                call.respond(service.listar())
            }

            get("/entregas/{id}") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_ENT, Permissions.VISUALIZAR))) return@get
                val id = call.parameters["id"]?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                    ?: return@get call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido"))
                try {
                    call.respond(service.buscarPorId(id))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                }
            }

            post("/entregas/{id}/confirmar") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_ENT, Permissions.EDITAR))) return@post
                val id = call.parameters["id"]?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                    ?: return@post call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido"))
                val req = try {
                    call.receive<ConfirmarEntregaRequest>()
                } catch (e: Exception) {
                    return@post call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                }
                try {
                    call.respond(service.confirmarEntrega(id, req))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
                }
            }

            post("/entregas/{id}/cancelar") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_ENT, Permissions.EDITAR))) return@post
                val id = call.parameters["id"]?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                    ?: return@post call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido"))
                try {
                    call.respond(service.cancelarEntrega(id))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
                }
            }
        }
}
