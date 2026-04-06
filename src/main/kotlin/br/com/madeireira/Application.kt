package br.com.madeireira

import br.com.madeireira.core.auth.JwtConfig
import br.com.madeireira.core.auth.TenantSchema
import br.com.madeireira.infrastructure.database.DatabaseConfig
import br.com.madeireira.modules.auth.api.authRoutes
import br.com.madeireira.modules.auth.application.AuthService
import br.com.madeireira.modules.auth.infrastructure.AuthRepository
import br.com.madeireira.modules.cliente.api.clienteRoutes
import br.com.madeireira.modules.cliente.application.ClienteService
import br.com.madeireira.modules.cliente.infrastructure.ClienteRepositoryImpl
import br.com.madeireira.modules.compra.api.compraRoutes
import br.com.madeireira.modules.compra.application.CompraService
import br.com.madeireira.modules.devolucao.api.devolucaoRoutes
import br.com.madeireira.modules.devolucao.application.DevolucaoService
import br.com.madeireira.modules.devolucao.infrastructure.DevolucaoRepositoryImpl
import br.com.madeireira.modules.entrega.api.entregaRoutes
import br.com.madeireira.modules.entrega.application.EntregaService
import br.com.madeireira.modules.entrega.infrastructure.EntregaRepositoryImpl
import br.com.madeireira.modules.estoque.api.estoqueRoutes
import br.com.madeireira.modules.estoque.application.EstoqueService
import br.com.madeireira.modules.estoque.infrastructure.EstoqueRepositoryImpl
import br.com.madeireira.modules.financeiro.api.caixaRoutes
import br.com.madeireira.modules.financeiro.api.tituloRoutes
import br.com.madeireira.modules.financeiro.api.turnoRoutes
import br.com.madeireira.modules.financeiro.application.TituloService
import br.com.madeireira.modules.financeiro.application.TurnoService
import br.com.madeireira.modules.financeiro.infrastructure.TituloRepositoryImpl
import br.com.madeireira.modules.financeiro.infrastructure.TurnoRepositoryImpl
import br.com.madeireira.modules.fiscal.api.nfeRoutes
import br.com.madeireira.modules.fiscal.application.NfeService
import br.com.madeireira.modules.fiscal.application.NfEmissaoStub
import br.com.madeireira.modules.fiscal.infrastructure.FocusNFeAdapter
import br.com.madeireira.modules.fiscal.infrastructure.FocusNFeConfig
import br.com.madeireira.modules.fiscal.infrastructure.NfRepositoryImpl
import br.com.madeireira.modules.fornecedor.api.fornecedorRoutes
import br.com.madeireira.modules.fornecedor.application.FornecedorService
import br.com.madeireira.modules.fornecedor.infrastructure.FornecedorRepositoryImpl
import br.com.madeireira.modules.produto.api.dto.ErroResponse
import br.com.madeireira.modules.produto.api.produtoRoutes
import br.com.madeireira.modules.produto.application.ProdutoService
import br.com.madeireira.modules.produto.infrastructure.ProdutoRepositoryImpl
import br.com.madeireira.modules.relatorio.api.relatorioRoutes
import br.com.madeireira.modules.relatorio.application.RelatorioService
import br.com.madeireira.modules.tenant.api.tenantRoutes
import br.com.madeireira.modules.tenant.application.TenantProvisioner
import br.com.madeireira.modules.usuario.api.usuarioRoutes
import br.com.madeireira.modules.usuario.application.UsuarioService
import br.com.madeireira.modules.usuario.infrastructure.UsuarioRepositoryImpl
import br.com.madeireira.modules.venda.api.vendaRoutes
import br.com.madeireira.modules.venda.application.VendaService
import br.com.madeireira.modules.venda.infrastructure.VendaRepositoryImpl
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.auth.Authentication
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.jwt.jwt
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.callloging.CallLogging
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.cors.routing.CORS
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.response.respond
import io.ktor.server.application.ApplicationCallPipeline
import io.ktor.server.routing.routing
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.call
import io.ktor.server.auth.principal
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json

fun main() {
    val port = System.getenv("PORT")?.toIntOrNull() ?: 8080
    embeddedServer(Netty, port = port, module = Application::module).start(wait = true)
}

fun Application.module() {
    // Database init
    DatabaseConfig.init()

    // ── Plugins ──────────────────────────────────────────────────────────────

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
            call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", cause.message))
        }
        exception<NoSuchElementException> { call, cause ->
            call.respond(HttpStatusCode.NotFound, ErroResponse("Não encontrado", cause.message))
        }
        status(HttpStatusCode.NotFound) { call, _ ->
            call.respond(HttpStatusCode.NotFound, ErroResponse("Recurso não encontrado"))
        }
        status(HttpStatusCode.Unauthorized) { call, _ ->
            call.respond(HttpStatusCode.Unauthorized, ErroResponse("Não autenticado"))
        }
        exception<Throwable> { call, cause ->
            call.respond(HttpStatusCode.InternalServerError, ErroResponse("Erro interno", cause.message))
        }
    }

    install(Authentication) {
        jwt("jwt") {
            realm = JwtConfig.realm
            verifier(JwtConfig.verifier)
            validate { credential ->
                val subject = credential.payload.subject
                val schema  = credential.payload.getClaim("schema").asString()
                if (subject != null && schema != null) JWTPrincipal(credential.payload) else null
            }
            challenge { _, _ ->
                call.respond(HttpStatusCode.Unauthorized, ErroResponse("Token inválido ou expirado"))
            }
        }
    }

    // ── Wiring de dependências ────────────────────────────────────────────────

    val produtoRepository    = ProdutoRepositoryImpl()
    val produtoService       = ProdutoService(produtoRepository)

    val estoqueRepository    = EstoqueRepositoryImpl()
    val estoqueService       = EstoqueService(estoqueRepository, produtoRepository)

    val clienteRepository    = ClienteRepositoryImpl()
    val clienteService       = ClienteService(clienteRepository)

    val fornecedorRepository = FornecedorRepositoryImpl()
    val fornecedorService    = FornecedorService(fornecedorRepository)

    val vendaRepository      = VendaRepositoryImpl()
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

    val nfRepository         = NfRepositoryImpl()
    val nfEmissor            = FocusNFeConfig.fromEnv()?.let { FocusNFeAdapter(it) } ?: NfEmissaoStub()
    val nfeService           = NfeService(nfRepository, vendaRepository, produtoRepository, vendaService, compraService, nfEmissor, clienteRepository)

    val usuarioRepository    = UsuarioRepositoryImpl()
    val usuarioService       = UsuarioService(usuarioRepository)

    val authService          = AuthService(AuthRepository())
    val tenantProvisioner    = TenantProvisioner()

    // ── Rotas ────────────────────────────────────────────────────────────────

    routing {

        // Rotas públicas (sem JWT)
        authRoutes(authService)
        tenantRoutes(tenantProvisioner)

        // Rotas protegidas — JWT obrigatório
        // O interceptor lê o claim "schema" do token e injeta TenantSchema no
        // contexto de coroutine, permitindo que DatabaseConfig.dbQuery() faça
        // SET LOCAL search_path automaticamente para o schema do tenant.
        authenticate("jwt") {
            // Injeta TenantSchema no contexto de coroutine para que
            // DatabaseConfig.dbQuery() faça SET LOCAL search_path automaticamente.
            intercept(ApplicationCallPipeline.Call) {
                val principal = call.principal<JWTPrincipal>() ?: return@intercept proceed()
                val slug   = principal.payload.getClaim("tenant").asString() ?: "piloto"
                val schema = principal.payload.getClaim("schema").asString() ?: "public"
                withContext(TenantSchema(slug = slug, schemaName = schema)) {
                    proceed()
                }
            }

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
            nfeRoutes(nfeService)
            relatorioRoutes(RelatorioService())
            usuarioRoutes(usuarioService)
        }
    }
}
