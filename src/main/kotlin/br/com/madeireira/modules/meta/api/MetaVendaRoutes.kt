package br.com.madeireira.modules.meta.api

import br.com.madeireira.core.security.Permissions
import br.com.madeireira.core.security.requerPermissao
import br.com.madeireira.modules.meta.api.dto.SalvarMetaDto
import br.com.madeireira.modules.meta.application.MetaVendaService
import br.com.madeireira.modules.produto.api.dto.ErroResponse
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import java.util.UUID

fun Route.metaVendaRoutes(service: MetaVendaService) {

    route("/api/v1/meta-vendas") {

        // GET /api/v1/meta-vendas/desempenho?ano=2026&mes=4
        get("/desempenho") {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_REL, Permissions.VISUALIZAR))) return@get
            val ano = call.request.queryParameters["ano"]?.toIntOrNull()
            val mes = call.request.queryParameters["mes"]?.toIntOrNull()
            if (ano == null || mes == null || mes !in 1..12) {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("Parâmetros ano e mes são obrigatórios"))
                return@get
            }
            call.respond(service.desempenho(ano, mes))
        }

        // PUT /api/v1/meta-vendas/{vendedorId}?ano=2026&mes=4
        put("{vendedorId}") {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_REL, Permissions.VISUALIZAR))) return@put
            val vendedorId = call.parameters["vendedorId"]
                ?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                ?: run {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("vendedorId inválido"))
                    return@put
                }
            val ano = call.request.queryParameters["ano"]?.toIntOrNull()
            val mes = call.request.queryParameters["mes"]?.toIntOrNull()
            if (ano == null || mes == null || mes !in 1..12) {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("Parâmetros ano e mes são obrigatórios"))
                return@put
            }
            val dto = try {
                call.receive<SalvarMetaDto>()
            } catch (e: Exception) {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                return@put
            }
            val solicitanteId = call.principal<JWTPrincipal>()?.payload?.subject
                ?.let { runCatching { UUID.fromString(it) }.getOrNull() }
            try {
                call.respond(HttpStatusCode.OK, service.salvar(vendedorId, ano, mes, dto, solicitanteId))
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
            }
        }

        // DELETE /api/v1/meta-vendas/{vendedorId}?ano=2026&mes=4
        delete("{vendedorId}") {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_REL, Permissions.VISUALIZAR))) return@delete
            val vendedorId = call.parameters["vendedorId"]
                ?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                ?: run {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("vendedorId inválido"))
                    return@delete
                }
            val ano = call.request.queryParameters["ano"]?.toIntOrNull()
            val mes = call.request.queryParameters["mes"]?.toIntOrNull()
            if (ano == null || mes == null) {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("Parâmetros ano e mes são obrigatórios"))
                return@delete
            }
            service.remover(vendedorId, ano, mes)
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
