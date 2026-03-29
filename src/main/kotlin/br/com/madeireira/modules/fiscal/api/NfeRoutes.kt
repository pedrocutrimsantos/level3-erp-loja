package br.com.madeireira.modules.fiscal.api

import br.com.madeireira.modules.fiscal.api.dto.CancelarNfRequest
import br.com.madeireira.modules.fiscal.api.dto.EmitirNfRequest
import br.com.madeireira.modules.fiscal.application.NfeService
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

fun Application.nfeRoutes(nfeService: NfeService) {
    routing {
        route("/api/v1/fiscal/nfe") {

            get {
                call.respond(nfeService.listar())
            }

            get("/pendentes") {
                call.respond(nfeService.listarPendentes())
            }

            post("/emitir") {
                val req = call.receive<EmitirNfRequest>()
                val vendaId = runCatching { UUID.fromString(req.vendaId) }.getOrElse {
                    call.respond(HttpStatusCode.BadRequest, mapOf("erro" to "vendaId inválido"))
                    return@post
                }
                call.respond(HttpStatusCode.Created, nfeService.emitir(vendaId))
            }

            post("/{id}/cancelar") {
                val id = runCatching { UUID.fromString(call.parameters["id"]) }.getOrElse {
                    call.respond(HttpStatusCode.BadRequest, mapOf("erro" to "id inválido"))
                    return@post
                }
                val req = call.receive<CancelarNfRequest>()
                call.respond(nfeService.cancelar(id, req.justificativa))
            }
        }
    }
}
