package br.com.madeireira.modules.cobranca.api

import br.com.madeireira.modules.cobranca.api.dto.CobrancaLogDto
import br.com.madeireira.modules.cobranca.api.dto.ParcelaPendenteDto
import br.com.madeireira.modules.cobranca.api.dto.ResultadoDisparoDto
import br.com.madeireira.modules.cobranca.application.CobrancaService
import br.com.madeireira.modules.cobranca.domain.CobrancaLog
import br.com.madeireira.modules.cobranca.domain.ParcelaPendente
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import java.util.UUID

fun Route.cobrancaRoutes(service: CobrancaService) {
    route("/api/v1/cobranca") {

        /** Lista parcelas elegíveis para cobrança hoje */
        get("/pendentes") {
            val pendentes = service.findPendentes()
            call.respond(pendentes.map { it.toDto() })
        }

        /** Dispara régua completa (todas as parcelas do dia) */
        post("/disparar-lote") {
            val resultado = service.dispararLote()
            call.respond(
                ResultadoDisparoDto(
                    enviados = resultado.enviados,
                    semFone  = resultado.semFone,
                    erros    = resultado.erros,
                    detalhes = resultado.detalhes,
                )
            )
        }

        /** Dispara cobrança manual para uma parcela específica */
        post("/disparar/{parcelaId}") {
            val parcelaId = call.parameters["parcelaId"]
                ?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                ?: return@post call.respond(HttpStatusCode.BadRequest, mapOf("erro" to "parcelaId inválido"))

            val resultado = service.dispararUnica(parcelaId)
            call.respond(
                ResultadoDisparoDto(
                    enviados = resultado.enviados,
                    semFone  = resultado.semFone,
                    erros    = resultado.erros,
                    detalhes = resultado.detalhes,
                )
            )
        }

        /** Histórico geral de cobranças */
        get("/historico") {
            val limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 100
            call.respond(service.findHistorico(limit).map { it.toDto() })
        }

        /** Histórico de cobranças de uma parcela */
        get("/historico/{parcelaId}") {
            val parcelaId = call.parameters["parcelaId"]
                ?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                ?: return@get call.respond(HttpStatusCode.BadRequest, mapOf("erro" to "parcelaId inválido"))

            call.respond(service.findHistoricoParcela(parcelaId).map { it.toDto() })
        }
    }
}

// ── Mappers ───────────────────────────────────────────────────────────────────

private fun ParcelaPendente.toDto() = ParcelaPendenteDto(
    parcelaId      = parcelaId.toString(),
    tituloId       = tituloId.toString(),
    tituloNumero   = tituloNumero,
    clienteId      = clienteId?.toString(),
    clienteNome    = clienteNome,
    telefone       = telefone,
    valor          = valor.toDouble(),
    dataVencimento = dataVencimento.toString(),
    diasAtraso     = diasAtraso,
    temTelefone    = !telefone.isNullOrBlank(),
)

private fun CobrancaLog.toDto() = CobrancaLogDto(
    id          = id.toString(),
    parcelaId   = parcelaId.toString(),
    tituloId    = tituloId.toString(),
    clienteId   = clienteId?.toString(),
    telefone    = telefone,
    mensagem    = mensagem,
    reguaDia    = reguaDia,
    status      = status,
    erroDetalhe = erroDetalhe,
    enviadoEm   = enviadoEm.toString(),
)
