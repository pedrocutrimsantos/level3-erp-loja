package br.com.madeireira.modules.empresa.api

import br.com.madeireira.core.security.Permissions
import br.com.madeireira.core.security.requerPermissao
import br.com.madeireira.modules.empresa.infrastructure.EmpresaData
import br.com.madeireira.modules.empresa.infrastructure.EmpresaRepositoryImpl
import br.com.madeireira.modules.fiscal.infrastructure.sefaz.SefazCertificadoLoader  // valida cert no upload
import br.com.madeireira.modules.produto.api.dto.ErroResponse
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
import kotlinx.serialization.Serializable
import java.time.Instant
import java.util.Base64

@Serializable
data class EmpresaRequest(
    val cnpj:                String,
    val razaoSocial:         String,
    val nomeFantasia:        String?  = null,
    val ie:                  String?  = null,
    val logradouro:          String,
    val numero:              String,
    val bairro:              String,
    val cidade:              String,
    val uf:                  String,
    val cep:                 String,
    val regimeTributario:    String   = "SIMPLES",
    // ── Campos fiscais ────────────────────────────────────────────────────────
    val cfopPadrao:          String   = "5102",
    val codigoMunicipioIbge: String?  = null,
    val serieNfe:            String   = "001",
    val ambienteNfe:         String   = "HOMOLOGACAO",
)

@Serializable
data class EmpresaResponse(
    val id:                  String?,
    val cnpj:                String,
    val razaoSocial:         String,
    val nomeFantasia:        String?,
    val ie:                  String?,
    val logradouro:          String,
    val numero:              String,
    val bairro:              String,
    val cidade:              String,
    val uf:                  String,
    val cep:                 String,
    val regimeTributario:    String,
    // ── Campos fiscais ────────────────────────────────────────────────────────
    val cfopPadrao:          String,
    val codigoMunicipioIbge: String?,
    val serieNfe:            String,
    val ambienteNfe:         String,
    val nfeConfigurada:      Boolean,
    // ── Certificado A1 ────────────────────────────────────────────────────────
    val certificadoConfigurado: Boolean,
    val certificadoNome:        String?,   // Common Name do titular
    val certificadoVencimento:  String?,   // ISO-8601
)

/** Request de upload do certificado A1 — bytes em Base64 + senha em texto. */
@Serializable
data class CertificadoUploadRequest(
    val certificadoBase64: String,
    val senha: String,
)

@Serializable
data class CertificadoInfoResponse(
    val nome:       String,
    val vencimento: String,
)

fun Route.empresaRoutes(repo: EmpresaRepositoryImpl) {

    route("/api/v1/empresa") {

        // GET /api/v1/empresa
        get {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_CFG, Permissions.VISUALIZAR))) return@get
            val empresa = repo.get()
            if (empresa == null) {
                call.respond(HttpStatusCode.NotFound, ErroResponse("Empresa não configurada"))
            } else {
                call.respond(HttpStatusCode.OK, toResponse(empresa))
            }
        }

        // PUT /api/v1/empresa — cria ou atualiza dados cadastrais (upsert)
        put {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_CFG, Permissions.EDITAR))) return@put
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
                require(req.cfopPadrao.matches(Regex("[0-9]{4}"))) {
                    "CFOP deve ter exatamente 4 dígitos numéricos (ex: 5102)"
                }
                req.codigoMunicipioIbge?.let { cod ->
                    require(cod.filter { it.isDigit() }.length == 7) {
                        "Código IBGE do município deve ter 7 dígitos"
                    }
                }
                require(req.ambienteNfe.uppercase() in setOf("HOMOLOGACAO", "PRODUCAO")) {
                    "ambienteNfe deve ser HOMOLOGACAO ou PRODUCAO"
                }

                val saved = repo.upsert(
                    EmpresaData(
                        id                  = null,
                        cnpj                = req.cnpj,
                        razaoSocial         = req.razaoSocial,
                        nomeFantasia        = req.nomeFantasia,
                        ie                  = req.ie,
                        logradouro          = req.logradouro,
                        numero              = req.numero,
                        bairro              = req.bairro,
                        cidade              = req.cidade,
                        uf                  = req.uf,
                        cep                 = req.cep,
                        regimeTributario    = req.regimeTributario,
                        cfopPadrao          = req.cfopPadrao,
                        codigoMunicipioIbge = req.codigoMunicipioIbge,
                        serieNfe            = req.serieNfe,
                        ambienteNfe         = req.ambienteNfe,
                    )
                )
                // Re-lê para incluir campos do certificado que possam já existir
                val completo = repo.get() ?: saved
                call.respond(HttpStatusCode.OK, toResponse(completo))
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
            }
        }

        // ── Certificado A1 ───────────────────────────────────────────────────

        // POST /api/v1/empresa/certificado — envia o .pfx como base64 + senha
        post("/certificado") {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_CFG, Permissions.EDITAR))) return@post
            val req = try {
                call.receive<CertificadoUploadRequest>()
            } catch (e: Exception) {
                call.respond(HttpStatusCode.BadRequest, ErroResponse("Requisição inválida", e.message))
                return@post
            }

            try {
                require(req.certificadoBase64.isNotBlank()) { "Arquivo do certificado é obrigatório" }
                require(req.senha.isNotBlank())             { "Senha do certificado é obrigatória" }

                val bytes = try {
                    Base64.getDecoder().decode(req.certificadoBase64.trim())
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Base64 inválido", e.message))
                    return@post
                }

                require(bytes.size <= 512_000) { "Arquivo muito grande — certificados A1 têm no máximo 500 KB" }

                // Valida o certificado antes de persistir
                val cert = try {
                    SefazCertificadoLoader.carregarDeBytes(bytes, req.senha)
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Certificado inválido", e.message))
                    return@post
                }

                repo.salvarCertificado(
                    bytes      = bytes,
                    senha      = req.senha,
                    nome       = cert.titularNome,
                    vencimento = cert.vencimento,
                )

                call.respond(
                    HttpStatusCode.OK,
                    CertificadoInfoResponse(
                        nome       = cert.titularNome,
                        vencimento = cert.vencimento.toString(),
                    )
                )
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
            }
        }

        // DELETE /api/v1/empresa/certificado — remove o certificado
        delete("/certificado") {
            if (!call.requerPermissao(Permissions.of(Permissions.MOD_CFG, Permissions.EDITAR))) return@delete
            repo.removerCertificado()
            call.respond(HttpStatusCode.NoContent)
        }
    }
}

private fun toResponse(d: EmpresaData) = EmpresaResponse(
    id                      = d.id,
    cnpj                    = d.cnpj,
    razaoSocial             = d.razaoSocial,
    nomeFantasia            = d.nomeFantasia,
    ie                      = d.ie,
    logradouro              = d.logradouro,
    numero                  = d.numero,
    bairro                  = d.bairro,
    cidade                  = d.cidade,
    uf                      = d.uf,
    cep                     = d.cep,
    regimeTributario        = d.regimeTributario,
    cfopPadrao              = d.cfopPadrao,
    codigoMunicipioIbge     = d.codigoMunicipioIbge,
    serieNfe                = d.serieNfe,
    ambienteNfe             = d.ambienteNfe,
    nfeConfigurada          = !d.codigoMunicipioIbge.isNullOrBlank() && d.certificadoNfeBytes != null,
    certificadoConfigurado  = d.certificadoNfeBytes != null,
    certificadoNome         = d.certificadoNfeNome,
    certificadoVencimento   = d.certificadoNfeVencimento?.toString(),
)
