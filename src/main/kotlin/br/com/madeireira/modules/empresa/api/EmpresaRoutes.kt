package br.com.madeireira.modules.empresa.api

import br.com.madeireira.modules.empresa.infrastructure.EmpresaData
import br.com.madeireira.modules.empresa.infrastructure.EmpresaRepositoryImpl
import br.com.madeireira.modules.produto.api.dto.ErroResponse
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import kotlinx.serialization.Serializable

@Serializable
data class EmpresaRequest(
    val cnpj:             String,
    val razaoSocial:      String,
    val nomeFantasia:     String?  = null,
    val ie:               String?  = null,
    val logradouro:       String,
    val numero:           String,
    val bairro:           String,
    val cidade:           String,
    val uf:               String,
    val cep:              String,
    val regimeTributario: String   = "SIMPLES",
)

@Serializable
data class EmpresaResponse(
    val id:               String?,
    val cnpj:             String,
    val razaoSocial:      String,
    val nomeFantasia:     String?,
    val ie:               String?,
    val logradouro:       String,
    val numero:           String,
    val bairro:           String,
    val cidade:           String,
    val uf:               String,
    val cep:              String,
    val regimeTributario: String,
)

fun Route.empresaRoutes(repo: EmpresaRepositoryImpl) {

    route("/api/v1/empresa") {

        // GET /api/v1/empresa
        get {
            val empresa = repo.get()
            if (empresa == null) {
                call.respond(HttpStatusCode.NotFound, ErroResponse("Empresa não configurada"))
            } else {
                call.respond(HttpStatusCode.OK, toResponse(empresa))
            }
        }

        // PUT /api/v1/empresa — cria ou atualiza (upsert)
        put {
            val req = try {
                call.receive<EmpresaRequest>()
            } catch (e: Exception) {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                return@put
            }
            try {
                require(req.cnpj.isNotBlank())        { "CNPJ é obrigatório" }
                require(req.razaoSocial.isNotBlank())  { "Razão social é obrigatória" }
                require(req.logradouro.isNotBlank())   { "Logradouro é obrigatório" }
                require(req.cidade.isNotBlank())       { "Cidade é obrigatória" }
                require(req.uf.length == 2)            { "UF deve ter 2 caracteres" }
                require(req.cep.isNotBlank())          { "CEP é obrigatório" }

                val saved = repo.upsert(
                    EmpresaData(
                        id               = null,
                        cnpj             = req.cnpj,
                        razaoSocial      = req.razaoSocial,
                        nomeFantasia     = req.nomeFantasia,
                        ie               = req.ie,
                        logradouro       = req.logradouro,
                        numero           = req.numero,
                        bairro           = req.bairro,
                        cidade           = req.cidade,
                        uf               = req.uf,
                        cep              = req.cep,
                        regimeTributario = req.regimeTributario,
                    )
                )
                call.respond(HttpStatusCode.OK, toResponse(saved))
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
            }
        }
    }
}

private fun toResponse(d: EmpresaData) = EmpresaResponse(
    id               = d.id,
    cnpj             = d.cnpj,
    razaoSocial      = d.razaoSocial,
    nomeFantasia     = d.nomeFantasia,
    ie               = d.ie,
    logradouro       = d.logradouro,
    numero           = d.numero,
    bairro           = d.bairro,
    cidade           = d.cidade,
    uf               = d.uf,
    cep              = d.cep,
    regimeTributario = d.regimeTributario,
)
