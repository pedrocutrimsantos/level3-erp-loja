package br.com.madeireira.modules.financeiro.api

import br.com.madeireira.modules.venda.application.VendaService
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.call
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import java.time.LocalDate

fun Application.caixaRoutes(vendaService: VendaService) {
    routing {
        route("/api/v1/financeiro/caixa") {
            get {
                val dataParam = call.request.queryParameters["data"]
                val data = if (dataParam != null) {
                    runCatching { LocalDate.parse(dataParam) }.getOrElse {
                        call.respond(HttpStatusCode.BadRequest, mapOf("erro" to "Parâmetro 'data' inválido. Use yyyy-MM-dd."))
                        return@get
                    }
                } else {
                    LocalDate.now()
                }

                val resultado = vendaService.resumoCaixa(data)
                call.respond(resultado)
            }
        }
    }
}
