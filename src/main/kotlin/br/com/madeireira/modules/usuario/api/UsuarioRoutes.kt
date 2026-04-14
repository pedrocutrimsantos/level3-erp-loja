package br.com.madeireira.modules.usuario.api

import br.com.madeireira.core.security.Permissions
import br.com.madeireira.core.security.requerPermissao
import br.com.madeireira.modules.produto.api.dto.ErroResponse
import br.com.madeireira.modules.usuario.api.dto.AtualizarPerfilDto
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

    // ── Rotas do próprio usuário autenticado ──────────────────────────────────

    route("/api/v1/me") {

        // GET /api/v1/me — retorna o perfil do usuário logado
        get {
            val id = call.principal<JWTPrincipal>()?.payload?.subject
                ?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                ?: run {
                    call.respond(HttpStatusCode.Unauthorized, ErroResponse("Token inválido"))
                    return@get
                }
            try {
                call.respond(HttpStatusCode.OK, service.buscarPorId(id))
            } catch (e: NoSuchElementException) {
                call.respond(HttpStatusCode.NotFound, ErroResponse("Usuário não encontrado"))
            }
        }

        // PUT /api/v1/me — atualiza nome e telefone do usuário logado
        put {
            val id = call.principal<JWTPrincipal>()?.payload?.subject
                ?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                ?: run {
                    call.respond(HttpStatusCode.Unauthorized, ErroResponse("Token inválido"))
                    return@put
                }
            val dto = try {
                call.receive<AtualizarPerfilDto>()
            } catch (e: Exception) {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                return@put
            }
            try {
                val atualizado = service.atualizar(id, AtualizarUsuarioDto(
                    nome     = dto.nome,
                    telefone = dto.telefone,
                ))
                call.respond(HttpStatusCode.OK, atualizado)
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
            } catch (e: NoSuchElementException) {
                call.respond(HttpStatusCode.NotFound, ErroResponse("Usuário não encontrado"))
            }
        }
    }

    // GET /api/v1/perfis
    route("/api/v1/perfis") {
        get {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_CFG, Permissions.VISUALIZAR))) return@get
            call.respond(HttpStatusCode.OK, service.listarPerfis())
        }
    }

    route("/api/v1/usuarios") {

        // GET /api/v1/usuarios
        get {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_CFG, Permissions.VISUALIZAR))) return@get
            call.respond(HttpStatusCode.OK, service.listar())
        }

        // GET /api/v1/usuarios/:id
        get("{id}") {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_CFG, Permissions.VISUALIZAR))) return@get
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
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_CFG, Permissions.CRIAR))) return@post
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
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_CFG, Permissions.EDITAR))) return@put
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
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_CFG, Permissions.EDITAR))) return@patch
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
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_CFG, Permissions.EDITAR))) return@patch
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
