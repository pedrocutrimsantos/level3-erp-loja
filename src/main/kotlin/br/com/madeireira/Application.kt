package br.com.madeireira

import br.com.madeireira.infrastructure.database.DatabaseConfig
import br.com.madeireira.modules.cliente.api.clienteRoutes
import br.com.madeireira.modules.cliente.application.ClienteService
import br.com.madeireira.modules.cliente.infrastructure.ClienteRepositoryImpl
import br.com.madeireira.modules.financeiro.api.caixaRoutes
import br.com.madeireira.modules.financeiro.api.tituloRoutes
import br.com.madeireira.modules.financeiro.api.turnoRoutes
import br.com.madeireira.modules.financeiro.application.TurnoService
import br.com.madeireira.modules.financeiro.infrastructure.TurnoRepositoryImpl
import br.com.madeireira.modules.fiscal.api.nfeRoutes
import br.com.madeireira.modules.fiscal.application.NfeService
import br.com.madeireira.modules.fiscal.infrastructure.NfRepositoryImpl
import br.com.madeireira.modules.devolucao.api.devolucaoRoutes
import br.com.madeireira.modules.devolucao.application.DevolucaoService
import br.com.madeireira.modules.devolucao.infrastructure.DevolucaoRepositoryImpl
import br.com.madeireira.modules.entrega.api.entregaRoutes
import br.com.madeireira.modules.entrega.application.EntregaService
import br.com.madeireira.modules.entrega.infrastructure.EntregaRepositoryImpl
import br.com.madeireira.modules.fornecedor.api.fornecedorRoutes
import br.com.madeireira.modules.fornecedor.application.FornecedorService
import br.com.madeireira.modules.fornecedor.infrastructure.FornecedorRepositoryImpl
import br.com.madeireira.modules.relatorio.api.relatorioRoutes
import br.com.madeireira.modules.relatorio.application.RelatorioService
import br.com.madeireira.modules.financeiro.application.TituloService
import br.com.madeireira.modules.financeiro.infrastructure.TituloRepositoryImpl
import br.com.madeireira.modules.compra.api.compraRoutes
import br.com.madeireira.modules.compra.application.CompraService
import br.com.madeireira.modules.estoque.api.estoqueRoutes
import br.com.madeireira.modules.estoque.application.EstoqueService
import br.com.madeireira.modules.estoque.infrastructure.EstoqueRepositoryImpl
import br.com.madeireira.modules.produto.api.dto.ErroResponse
import br.com.madeireira.modules.produto.api.produtoRoutes
import br.com.madeireira.modules.produto.application.ProdutoService
import br.com.madeireira.modules.produto.infrastructure.ProdutoRepositoryImpl
import br.com.madeireira.modules.venda.api.vendaRoutes
import br.com.madeireira.modules.venda.application.VendaService
import br.com.madeireira.modules.venda.infrastructure.VendaRepositoryImpl
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.callloging.CallLogging
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.server.plugins.cors.routing.CORS
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.response.respond
import io.ktor.server.routing.routing
import kotlinx.serialization.json.Json

fun main() {
    val port = System.getenv("PORT")?.toIntOrNull() ?: 8080
    embeddedServer(Netty, port = port, module = Application::module).start(wait = true)
}

fun Application.module() {
    // Database init
    DatabaseConfig.init()

    // Plugins
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = false
            isLenient = false
            ignoreUnknownKeys = true
        })
    }

    install(CORS) {
        anyHost() // dev only — restringir em produção
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Patch)
        allowMethod(HttpMethod.Delete)
        allowMethod(HttpMethod.Options)
        allowHeader(HttpHeaders.ContentType)
        allowHeader(HttpHeaders.Authorization)
    }

    install(CallLogging)

    install(StatusPages) {
        exception<IllegalArgumentException> { call, cause ->
            call.respond(
                HttpStatusCode.UnprocessableEntity,
                ErroResponse("Erro de validação", cause.message),
            )
        }
        exception<NoSuchElementException> { call, cause ->
            call.respond(
                HttpStatusCode.NotFound,
                ErroResponse("Não encontrado", cause.message),
            )
        }
        status(HttpStatusCode.NotFound) { call, _ ->
            call.respond(HttpStatusCode.NotFound, ErroResponse("Recurso não encontrado"))
        }
        exception<Throwable> { call, cause ->
            call.respond(
                HttpStatusCode.InternalServerError,
                ErroResponse("Erro interno", cause.message),
            )
        }
    }

    // Wiring manual de dependências
    val produtoRepository    = ProdutoRepositoryImpl()
    val produtoService       = ProdutoService(produtoRepository)

    val estoqueRepository    = EstoqueRepositoryImpl()
    val estoqueService       = EstoqueService(estoqueRepository, produtoRepository)

    val vendaRepository      = VendaRepositoryImpl()
    val clienteRepository    = ClienteRepositoryImpl()
    val clienteService       = ClienteService(clienteRepository)
    val fornecedorRepository = FornecedorRepositoryImpl()
    val fornecedorService    = FornecedorService(fornecedorRepository)
    val tituloRepository     = TituloRepositoryImpl()
    val tituloService        = TituloService(tituloRepository, clienteRepository, vendaRepository, fornecedorRepository)
    val turnoRepository      = TurnoRepositoryImpl()
    val compraService        = CompraService(estoqueRepository, produtoRepository, tituloService)
    val vendaService         = VendaService(vendaRepository, estoqueRepository, produtoRepository, tituloService, turnoRepository)
    val turnoService         = TurnoService(turnoRepository, vendaService)
    val devolucaoRepository  = DevolucaoRepositoryImpl()
    val devolucaoService     = DevolucaoService(devolucaoRepository, vendaRepository, estoqueRepository, produtoRepository)
    val entregaRepository    = EntregaRepositoryImpl()
    val entregaService       = EntregaService(entregaRepository, vendaRepository, produtoRepository)

    // Rotas
    produtoRoutes(produtoService)
    estoqueRoutes(estoqueService)
    vendaRoutes(vendaService)
    compraRoutes(compraService)
    clienteRoutes(clienteService)
    fornecedorRoutes(fornecedorService)
    devolucaoRoutes(devolucaoService)
    entregaRoutes(entregaService)
    tituloRoutes(tituloService)
    turnoRoutes(turnoService)
    caixaRoutes(vendaService)
    val nfRepository = NfRepositoryImpl()
    val nfeService   = NfeService(nfRepository, vendaRepository, produtoRepository, vendaService)
    nfeRoutes(nfeService)
    relatorioRoutes(RelatorioService())
}
