package br.com.madeireira.modules.compra.api

import br.com.madeireira.core.security.Permissions
import br.com.madeireira.core.security.requerPermissao
import br.com.madeireira.modules.compra.application.CompraService
import br.com.madeireira.modules.compra.api.dto.EntradaCompraRequest
import br.com.madeireira.modules.produto.api.dto.ErroResponse
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route

fun Route.compraRoutes(service: CompraService) {
    route("/api/v1/compras") {
            // GET /api/v1/compras/entradas?limit=50
            get("entradas") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_COM, Permissions.VISUALIZAR))) return@get
                val limit = call.request.queryParameters["limit"]?.toIntOrNull()?.coerceIn(1, 500) ?: 50
                call.respond(HttpStatusCode.OK, service.listarEntradas(limit))
            }

            // POST /api/v1/compras/entrada
            post("entrada") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_COM, Permissions.CRIAR))) return@post
                val req = try {
                    call.receive<EntradaCompraRequest>()
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                    return@post
                }
                try {
                    val resp = service.registrarEntrada(req)
                    call.respond(HttpStatusCode.Created, resp)
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
                } catch (e: IllegalStateException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de configuração", e.message))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                }
            }
        }
}
