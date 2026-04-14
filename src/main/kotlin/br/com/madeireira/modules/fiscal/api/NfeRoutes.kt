package br.com.madeireira.modules.fiscal.api

import br.com.madeireira.core.security.Permissions
import br.com.madeireira.core.security.requerPermissao
import br.com.madeireira.modules.fiscal.api.dto.CancelarNfRequest
import br.com.madeireira.modules.fiscal.api.dto.EmitirNfRequest
import br.com.madeireira.modules.fiscal.api.dto.NfeXmlConfirmarRequest
import br.com.madeireira.modules.fiscal.application.NfeService
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

fun Route.nfeRoutes(nfeService: NfeService) {
    route("/api/v1/fiscal/nfe") {

        get {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_FIS, Permissions.VISUALIZAR))) return@get
            call.respond(nfeService.listar())
        }

        get("/pendentes") {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_FIS, Permissions.VISUALIZAR))) return@get
            call.respond(nfeService.listarPendentes())
        }

        post("/emitir") {
            if (!call.requerPermissao(Permissions.FIS_EMITIR_NF)) return@post
            val req = call.receive<EmitirNfRequest>()
            val vendaId = runCatching { UUID.fromString(req.vendaId) }.getOrElse {
                call.respond(HttpStatusCode.BadRequest, mapOf("erro" to "vendaId inválido"))
                return@post
            }
            call.respond(HttpStatusCode.Created, nfeService.emitir(vendaId))
        }

        post("/{id}/cancelar") {
            if (!call.requerPermissao(Permissions.VEN_CANCELAR_NF)) return@post
            val id = runCatching { UUID.fromString(call.parameters["id"]) }.getOrElse {
                call.respond(HttpStatusCode.BadRequest, mapOf("erro" to "id inválido"))
                return@post
            }
            val req = call.receive<CancelarNfRequest>()
            call.respond(nfeService.cancelar(id, req.justificativa))
        }

        post("/{id}/reprocessar") {
            if (!call.requerPermissao(Permissions.FIS_EMITIR_NF)) return@post
            val id = runCatching { UUID.fromString(call.parameters["id"]) }.getOrElse {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("id inválido"))
                return@post
            }
            try {
                call.respond(nfeService.reprocessar(id))
            } catch (e: IllegalStateException) {
                call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse(e.message ?: "Erro"))
            } catch (e: NoSuchElementException) {
                call.respond(HttpStatusCode.NotFound, ErroResponse("NF não encontrada"))
            }
        }

        get("/{id}/danfe") {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_FIS, Permissions.VISUALIZAR))) return@get
            val id = runCatching { UUID.fromString(call.parameters["id"]) }.getOrElse {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("id inválido"))
                return@get
            }
            try {
                call.respond(nfeService.getDanfeData(id))
            } catch (e: NoSuchElementException) {
                call.respond(HttpStatusCode.NotFound, ErroResponse("NF não encontrada"))
            }
        }

        post("/xml/preview") {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_FIS, Permissions.VISUALIZAR))) return@post
            val xmlBytes = call.receive<ByteArray>()
            if (xmlBytes.isEmpty()) {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("Body XML vazio"))
                return@post
            }
            try {
                call.respond(nfeService.previewXml(xmlBytes))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro ao processar XML", e.message))
            }
        }

        post("/xml/importar") {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_COM, Permissions.CRIAR))) return@post
            val req = call.receive<NfeXmlConfirmarRequest>()
            try {
                call.respond(nfeService.importarXml(req))
            } catch (e: IllegalStateException) {
                call.respond(HttpStatusCode.ServiceUnavailable, ErroResponse(e.message ?: "Erro"))
            }
        }
    }
}
