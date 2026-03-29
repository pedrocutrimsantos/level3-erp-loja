package br.com.madeireira.modules.relatorio.api

import br.com.madeireira.modules.relatorio.application.RelatorioService
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.call
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import java.time.LocalDate
import java.time.format.DateTimeParseException

fun Application.relatorioRoutes(relatorioService: RelatorioService) {
    routing {
        route("/api/v1/relatorios") {

            get("/dashboard") {
                call.respond(relatorioService.dashboard())
            }

            // GET /api/v1/relatorios/vendas?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD
            get("/vendas") {
                val (ini, fim) = parsePeriodo(call.request.queryParameters["dataInicio"], call.request.queryParameters["dataFim"])
                    ?: run {
                        call.respond(HttpStatusCode.BadRequest, mapOf("erro" to "dataInicio e dataFim são obrigatórios (formato YYYY-MM-DD)"))
                        return@get
                    }
                call.respond(relatorioService.vendasExport(ini, fim))
            }

            // GET /api/v1/relatorios/estoque
            get("/estoque") {
                call.respond(relatorioService.estoqueExport())
            }

            // GET /api/v1/relatorios/margem
            get("/margem") {
                call.respond(relatorioService.margemExport())
            }

            // GET /api/v1/relatorios/fluxo-caixa?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD
            get("/fluxo-caixa") {
                val (ini, fim) = parsePeriodo(call.request.queryParameters["dataInicio"], call.request.queryParameters["dataFim"])
                    ?: run {
                        call.respond(HttpStatusCode.BadRequest, mapOf("erro" to "dataInicio e dataFim são obrigatórios (formato YYYY-MM-DD)"))
                        return@get
                    }
                call.respond(relatorioService.fluxoCaixaExport(ini, fim))
            }
        }
    }
}

private fun parsePeriodo(inicio: String?, fim: String?): Pair<LocalDate, LocalDate>? {
    if (inicio.isNullOrBlank() || fim.isNullOrBlank()) return null
    return try {
        Pair(LocalDate.parse(inicio), LocalDate.parse(fim))
    } catch (_: DateTimeParseException) {
        null
    }
}
