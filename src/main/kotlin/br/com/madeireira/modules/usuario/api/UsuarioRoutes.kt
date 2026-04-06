package br.com.madeireira.modules.usuario.api

import br.com.madeireira.modules.produto.api.dto.ErroResponse
import br.com.madeireira.modules.usuario.api.dto.AtualizarUsuarioDto
import br.com.madeireira.modules.usuario.api.dto.CriarUsuarioDto
import br.com.madeireira.modules.usuario.application.UsuarioService
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.patch
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import java.util.UUID

fun Route.usuarioRoutes(service: UsuarioService) {

    // GET /api/v1/perfis
    route("/api/v1/perfis") {
        get {
            call.respond(HttpStatusCode.OK, service.listarPerfis())
        }
    }

    route("/api/v1/usuarios") {

        // GET /api/v1/usuarios
        get {
            call.respond(HttpStatusCode.OK, service.listar())
        }

        // GET /api/v1/usuarios/:id
        get("{id}") {
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

        // POST /api/v1/usuarios
        post {
            val dto = try {
                call.receive<CriarUsuarioDto>()
            } catch (e: Exception) {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                return@post
            }
            try {
                val usuario = service.criar(dto)
                call.respond(HttpStatusCode.Created, usuario)
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
            }
        }

        // PUT /api/v1/usuarios/:id
        put("{id}") {
            val id = parseUUID(call.parameters["id"]) ?: run {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido"))
                return@put
            }
            val dto = try {
                call.receive<AtualizarUsuarioDto>()
            } catch (e: Exception) {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                return@put
            }
            try {
                call.respond(HttpStatusCode.OK, service.atualizar(id, dto))
            } catch (e: NoSuchElementException) {
                call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
            }
        }

        // PATCH /api/v1/usuarios/:id/ativar
        patch("{id}/ativar") {
            val id = parseUUID(call.parameters["id"]) ?: run {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido"))
                return@patch
            }
            val solicitanteId = call.principal<JWTPrincipal>()!!.payload.subject.let {
                runCatching { UUID.fromString(it) }.getOrNull()
            } ?: run {
                call.respond(HttpStatusCode.Unauthorized, ErroResponse("Token inválido"))
                return@patch
            }
            try {
                call.respond(HttpStatusCode.OK, service.ativar(id, solicitanteId))
            } catch (e: NoSuchElementException) {
                call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
            }
        }

        // PATCH /api/v1/usuarios/:id/desativar
        patch("{id}/desativar") {
            val id = parseUUID(call.parameters["id"]) ?: run {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido"))
                return@patch
            }
            val solicitanteId = call.principal<JWTPrincipal>()!!.payload.subject.let {
                runCatching { UUID.fromString(it) }.getOrNull()
            } ?: run {
                call.respond(HttpStatusCode.Unauthorized, ErroResponse("Token inválido"))
                return@patch
            }
            try {
                call.respond(HttpStatusCode.OK, service.desativar(id, solicitanteId))
            } catch (e: NoSuchElementException) {
                call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
            }
        }
    }
}

private fun parseUUID(value: String?): UUID? =
    value?.let { runCatching { UUID.fromString(it) }.getOrNull() }
