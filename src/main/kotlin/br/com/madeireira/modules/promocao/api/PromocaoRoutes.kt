package br.com.madeireira.modules.promocao.api

import br.com.madeireira.core.security.Permissions
import br.com.madeireira.core.security.requerPermissao
import br.com.madeireira.modules.promocao.api.dto.*
import br.com.madeireira.modules.promocao.application.ItemCalculo
import br.com.madeireira.modules.promocao.application.PromocaoService
import br.com.madeireira.modules.promocao.domain.EscopoPromocao
import br.com.madeireira.modules.promocao.domain.ItemComDesconto
import br.com.madeireira.modules.promocao.domain.Promocao
import br.com.madeireira.modules.promocao.domain.TipoPromocao
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

fun Route.promocaoRoutes(service: PromocaoService) {
    route("/api/v1/promocoes") {

        get {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_CAD, Permissions.VISUALIZAR))) return@get
            call.respond(service.listar().map { it.toResponse() })
        }

        get("/ativas") {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_VEN, Permissions.VISUALIZAR))) return@get
            call.respond(service.listarAtivas().map { it.toResponse() })
        }

        get("/produto/{produtoId}") {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_VEN, Permissions.VISUALIZAR))) return@get
            val pid = call.parameters["produtoId"]
                ?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                ?: return@get call.respond(HttpStatusCode.BadRequest, mapOf("erro" to "produtoId inválido"))

            call.respond(service.listarAtivasPorProduto(pid).map { it.toResponse() })
        }

        get("/{id}") {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_CAD, Permissions.VISUALIZAR))) return@get
            val id = call.parameters["id"]
                ?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                ?: return@get call.respond(HttpStatusCode.BadRequest, mapOf("erro" to "id inválido"))

            call.respond(service.buscarPorId(id).toResponse())
        }

        post {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_CAD, Permissions.CRIAR))) return@post
            val req = call.receive<PromocaoRequest>()
            val p = service.criar(
                nome               = req.nome,
                descricao          = req.descricao,
                tipo               = TipoPromocao.valueOf(req.tipo),
                valor              = BigDecimal.valueOf(req.valor),
                escopo             = EscopoPromocao.valueOf(req.escopo),
                dataInicio         = req.dataInicio?.let { LocalDate.parse(it) },
                dataFim            = req.dataFim?.let { LocalDate.parse(it) },
                quantidadeMinima   = req.quantidadeMinima?.let { BigDecimal.valueOf(it) },
                valorMinimoPedido  = req.valorMinimoPedido?.let { BigDecimal.valueOf(it) },
                produtoIds         = req.produtoIds.map { UUID.fromString(it) },
            )
            call.respond(HttpStatusCode.Created, p.toResponse())
        }

        put("/{id}") {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_CAD, Permissions.EDITAR))) return@put
            val id = call.parameters["id"]
                ?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                ?: return@put call.respond(HttpStatusCode.BadRequest, mapOf("erro" to "id inválido"))

            val req = call.receive<PromocaoRequest>()
            val p = service.atualizar(
                id                 = id,
                nome               = req.nome,
                descricao          = req.descricao,
                tipo               = TipoPromocao.valueOf(req.tipo),
                valor              = BigDecimal.valueOf(req.valor),
                escopo             = EscopoPromocao.valueOf(req.escopo),
                ativo              = true,
                dataInicio         = req.dataInicio?.let { LocalDate.parse(it) },
                dataFim            = req.dataFim?.let { LocalDate.parse(it) },
                quantidadeMinima   = req.quantidadeMinima?.let { BigDecimal.valueOf(it) },
                valorMinimoPedido  = req.valorMinimoPedido?.let { BigDecimal.valueOf(it) },
                produtoIds         = req.produtoIds.map { UUID.fromString(it) },
            )
            call.respond(p.toResponse())
        }

        delete("/{id}") {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_CAD, Permissions.EXCLUIR))) return@delete
            val id = call.parameters["id"]
                ?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                ?: return@delete call.respond(HttpStatusCode.BadRequest, mapOf("erro" to "id inválido"))

            service.desativar(id)
            call.respond(HttpStatusCode.NoContent)
        }

        /** Calcula descontos para um carrinho. */
        post("/calcular") {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_VEN, Permissions.VISUALIZAR))) return@post
            val req = call.receive<CalculoRequest>()
            val itens = req.itens.map {
                ItemCalculo(
                    produtoId     = UUID.fromString(it.produtoId),
                    quantidade    = BigDecimal.valueOf(it.quantidade),
                    precoUnitario = BigDecimal.valueOf(it.precoUnitario),
                )
            }
            val resultado = service.calcular(itens)
            call.respond(
                CalculoResponse(
                    itens         = resultado.itens.map { it.toResponse() },
                    valorOriginal = resultado.valorOriginal.toDouble(),
                    descontoTotal = resultado.descontoTotal.toDouble(),
                    valorFinal    = resultado.valorFinal.toDouble(),
                )
            )
        }
    }
}

// ── Mappers ───────────────────────────────────────────────────────────────────

private fun Promocao.toResponse(): PromocaoResponse {
    val hoje = LocalDate.now()
    val vigente = ativo &&
        (dataInicio == null || !dataInicio.isAfter(hoje)) &&
        (dataFim == null || !dataFim.isBefore(hoje))
    return PromocaoResponse(
        id                = id.toString(),
        nome              = nome,
        descricao         = descricao,
        tipo              = tipo.name,
        valor             = valor.toDouble(),
        escopo            = escopo.name,
        ativo             = ativo,
        dataInicio        = dataInicio?.toString(),
        dataFim           = dataFim?.toString(),
        quantidadeMinima  = quantidadeMinima?.toDouble(),
        valorMinimoPedido = valorMinimoPedido?.toDouble(),
        produtoIds        = produtoIds.map { it.toString() },
        vigente           = vigente,
        createdAt         = createdAt.toString(),
    )
}

private fun ItemComDesconto.toResponse() = ItemCalculoResponse(
    produtoId          = produtoId.toString(),
    precoOriginal      = precoOriginal.toDouble(),
    precoFinal         = precoFinal.toDouble(),
    desconto           = desconto.toDouble(),
    percentualDesconto = percentualDesconto.toDouble(),
    promocaoId         = promocaoId?.toString(),
    promocaoNome       = promocaoNome,
    temDesconto        = temDesconto,
)
