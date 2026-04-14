package br.com.madeireira.modules.relatorio.api

import br.com.madeireira.core.security.Permissions
import br.com.madeireira.core.security.requerPermissao
import br.com.madeireira.modules.relatorio.application.RelatorioService
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.route
import java.time.LocalDate
import java.time.format.DateTimeParseException

fun Route.relatorioRoutes(relatorioService: RelatorioService) {
    route("/api/v1/relatorios") {

            get("/dashboard") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_REL, Permissions.VISUALIZAR))) return@get
                call.respond(relatorioService.dashboard())
            }

            get("/notificacoes") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_REL, Permissions.VISUALIZAR))) return@get
                call.respond(relatorioService.notificacoes())
            }

            get("/vendas") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_REL, Permissions.EXPORTAR))) return@get
                val (ini, fim) = parsePeriodo(call.request.queryParameters["dataInicio"], call.request.queryParameters["dataFim"])
                    ?: run {
                        call.respond(HttpStatusCode.BadRequest, mapOf("erro" to "dataInicio e dataFim são obrigatórios (formato YYYY-MM-DD)"))
                        return@get
                    }
                call.respond(relatorioService.vendasExport(ini, fim))
            }

            get("/estoque") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_REL, Permissions.EXPORTAR))) return@get
                call.respond(relatorioService.estoqueExport())
            }

            get("/margem") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_REL, Permissions.VISUALIZAR))) return@get
                call.respond(relatorioService.margemExport())
            }

            get("/fluxo-caixa") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_REL, Permissions.EXPORTAR))) return@get
                val (ini, fim) = parsePeriodo(call.request.queryParameters["dataInicio"], call.request.queryParameters["dataFim"])
                    ?: run {
                        call.respond(HttpStatusCode.BadRequest, mapOf("erro" to "dataInicio e dataFim são obrigatórios (formato YYYY-MM-DD)"))
                        return@get
                    }
                call.respond(relatorioService.fluxoCaixaExport(ini, fim))
            }

            get("/margem-periodo") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_REL, Permissions.VISUALIZAR))) return@get
                val (ini, fim) = parsePeriodo(call.request.queryParameters["dataInicio"], call.request.queryParameters["dataFim"])
                    ?: run {
                        call.respond(HttpStatusCode.BadRequest, mapOf("erro" to "dataInicio e dataFim são obrigatórios (formato YYYY-MM-DD)"))
                        return@get
                    }
                call.respond(relatorioService.margemPeriodo(ini, fim))
            }

            get("/dre") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_REL, Permissions.VISUALIZAR))) return@get
                val (ini, fim) = parsePeriodo(call.request.queryParameters["dataInicio"], call.request.queryParameters["dataFim"])
                    ?: run {
                        call.respond(HttpStatusCode.BadRequest, mapOf("erro" to "dataInicio e dataFim são obrigatórios (formato YYYY-MM-DD)"))
                        return@get
                    }
                call.respond(relatorioService.dre(ini, fim))
            }

            get("/volume-vendido") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_REL, Permissions.EXPORTAR))) return@get
                val (ini, fim) = parsePeriodo(call.request.queryParameters["dataInicio"], call.request.queryParameters["dataFim"])
                    ?: run {
                        call.respond(HttpStatusCode.BadRequest, mapOf("erro" to "dataInicio e dataFim são obrigatórios (formato YYYY-MM-DD)"))
                        return@get
                    }
                call.respond(relatorioService.volumeVendido(ini, fim))
            }

            get("/vendas-por-vendedor") {
                if (!call.requerPermissao(Permissions.of(Permissions.MOD_REL, Permissions.EXPORTAR))) return@get
                val (ini, fim) = parsePeriodo(call.request.queryParameters["dataInicio"], call.request.queryParameters["dataFim"])
                    ?: run {
                        call.respond(HttpStatusCode.BadRequest, mapOf("erro" to "dataInicio e dataFim são obrigatórios (formato YYYY-MM-DD)"))
                        return@get
                    }
                call.respond(relatorioService.vendasPorVendedor(ini, fim))
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
