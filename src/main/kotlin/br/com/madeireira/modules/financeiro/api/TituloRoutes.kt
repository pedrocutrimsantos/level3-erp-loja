package br.com.madeireira.modules.financeiro.api

import br.com.madeireira.modules.financeiro.api.dto.BaixaTituloRequest
import br.com.madeireira.modules.financeiro.api.dto.CriarDespesaRequest
import br.com.madeireira.modules.financeiro.application.TituloService
import br.com.madeireira.modules.financeiro.domain.model.StatusTitulo
import br.com.madeireira.modules.financeiro.domain.model.TipoTitulo
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

fun Application.tituloRoutes(service: TituloService) {
    routing {
        // GET /api/v1/financeiro/fluxo-caixa?dias=30
        get("/api/v1/financeiro/fluxo-caixa") {
            val dias = call.request.queryParameters["dias"]?.toIntOrNull()?.coerceIn(1, 365) ?: 30
            call.respond(HttpStatusCode.OK, service.fluxoCaixa(dias))
        }

        route("/api/v1/titulos") {

            // POST /api/v1/titulos  (despesa manual)
            post {
                val req = try {
                    call.receive<CriarDespesaRequest>()
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                    return@post
                }
                try {
                    call.respond(HttpStatusCode.Created, service.criarDespesa(req))
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse(e.message ?: "Erro"))
                }
            }

            // GET /api/v1/titulos?tipo=RECEBER&status=ABERTO&limit=100
            get {
                val tipo   = call.request.queryParameters["tipo"]?.let { runCatching { TipoTitulo.valueOf(it) }.getOrNull() }
                val status = call.request.queryParameters["status"]?.let { runCatching { StatusTitulo.valueOf(it) }.getOrNull() }
                val limit  = call.request.queryParameters["limit"]?.toIntOrNull()?.coerceIn(1, 500) ?: 100
                call.respond(HttpStatusCode.OK, service.listar(tipo, status, limit))
            }

            // POST /api/v1/titulos/:id/baixa
            post("{id}/baixa") {
                val id = call.parameters["id"]?.let { runCatching { UUID.fromString(it) }.getOrNull() } ?: run {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido"))
                    return@post
                }
                val req = try {
                    call.receive<BaixaTituloRequest>()
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                    return@post
                }
                try {
                    call.respond(HttpStatusCode.OK, service.registrarBaixa(id, req))
                } catch (e: NoSuchElementException) {
                    call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", e.message))
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
                } catch (e: IllegalStateException) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Estado inválido", e.message))
                }
            }
        }
    }
}
