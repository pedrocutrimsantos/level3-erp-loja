package br.com.madeireira.modules.fiscal.sped

import br.com.madeireira.core.security.Permissions
import br.com.madeireira.core.security.requerPermissao
import br.com.madeireira.modules.produto.api.dto.ErroResponse
import io.ktor.http.ContentDisposition
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.response.header
import io.ktor.server.response.respond
import io.ktor.server.response.respondText
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.route
import java.time.LocalDate

fun Route.spedRoutes(spedService: SpedEfdService) {

    route("/api/v1/fiscal/sped") {

        get("/efd") {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_REL, Permissions.EXPORTAR))) return@get
            val ano = call.request.queryParameters["ano"]?.toIntOrNull()
            val mes = call.request.queryParameters["mes"]?.toIntOrNull()

            if (ano == null || mes == null || mes !in 1..12) {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("Parâmetros inválidos", "Informe ano (ex: 2024) e mes (1–12)."))
                return@get
            }
            if (ano < 2000 || ano > LocalDate.now().year + 1) {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("Ano inválido", "Informe um ano entre 2000 e ${LocalDate.now().year + 1}."))
                return@get
            }

            try {
                val conteudo = spedService.gerarEfd(ano, mes)
                val aamm     = "${ano}${mes.toString().padStart(2, '0')}"
                call.response.header(
                    HttpHeaders.ContentDisposition,
                    ContentDisposition.Attachment.withParameter(ContentDisposition.Parameters.FileName, "EFD_ICMS_IPI_${aamm}.txt").toString()
                )
                call.respondText(conteudo, ContentType.Text.Plain)
            } catch (e: IllegalStateException) {
                call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Configuração incompleta", e.message))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErroResponse("Erro ao gerar EFD", e.message))
            }
        }
    }
}
