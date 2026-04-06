package br.com.madeireira.modules.tenant.api

import br.com.madeireira.modules.tenant.application.NovoTenantRequest
import br.com.madeireira.modules.tenant.application.TenantItem
import br.com.madeireira.modules.tenant.application.TenantProvisioner
import br.com.madeireira.modules.produto.api.dto.ErroResponse
import io.github.cdimascio.dotenv.dotenv
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.patch
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import kotlinx.serialization.Serializable
import java.util.UUID

@Serializable
data class CriarTenantRequest(
    val slug:        String,
    val razaoSocial: String,
    val cnpj:        String,
    val adminEmail:  String,
    val adminNome:   String,
    val adminSenha:  String,
)

@Serializable
data class CriarTenantResponse(
    val tenantId:    String,
    val slug:        String,
    val schemaName:  String,
    val adminUserId: String,
    val mensagem:    String,
)

fun Route.tenantRoutes(provisioner: TenantProvisioner) {

    val env      = dotenv { ignoreIfMissing = true }
    val adminKey = System.getenv("SUPER_ADMIN_KEY")
        ?: runCatching { env["SUPER_ADMIN_KEY"] }.getOrNull()
        ?: "change-this-key-in-production"

    fun checkKey(key: String?): Boolean = key == adminKey

    route("/admin/tenants") {

        // GET /admin/tenants
        get {
            if (!checkKey(call.request.headers["X-Admin-Key"])) {
                call.respond(HttpStatusCode.Forbidden, ErroResponse("Acesso negado"))
                return@get
            }
            call.respond(HttpStatusCode.OK, provisioner.listar())
        }

        // PATCH /admin/tenants/:id/ativar
        patch("{id}/ativar") {
            if (!checkKey(call.request.headers["X-Admin-Key"])) {
                call.respond(HttpStatusCode.Forbidden, ErroResponse("Acesso negado"))
                return@patch
            }
            val id = runCatching { UUID.fromString(call.parameters["id"]) }.getOrNull()
                ?: run { call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido")); return@patch }
            provisioner.setAtivo(id, true)
            call.respond(HttpStatusCode.OK, mapOf("ok" to true))
        }

        // PATCH /admin/tenants/:id/desativar
        patch("{id}/desativar") {
            if (!checkKey(call.request.headers["X-Admin-Key"])) {
                call.respond(HttpStatusCode.Forbidden, ErroResponse("Acesso negado"))
                return@patch
            }
            val id = runCatching { UUID.fromString(call.parameters["id"]) }.getOrNull()
                ?: run { call.respond(HttpStatusCode.BadRequest, ErroResponse("ID inválido")); return@patch }
            provisioner.setAtivo(id, false)
            call.respond(HttpStatusCode.OK, mapOf("ok" to true))
        }

        // POST /admin/tenants — protegido por X-Admin-Key
        post {
            val key = call.request.headers["X-Admin-Key"]
            if (key != adminKey) {
                call.respond(HttpStatusCode.Forbidden, ErroResponse("Acesso negado"))
                return@post
            }

            val req = call.receive<CriarTenantRequest>()
            try {
                val result = provisioner.provisionar(
                    NovoTenantRequest(
                        slug        = req.slug,
                        razaoSocial = req.razaoSocial,
                        cnpj        = req.cnpj,
                        adminEmail  = req.adminEmail,
                        adminNome   = req.adminNome,
                        adminSenha  = req.adminSenha,
                    )
                )
                call.respond(
                    HttpStatusCode.Created,
                    CriarTenantResponse(
                        tenantId    = result.tenantId,
                        slug        = result.slug,
                        schemaName  = result.schemaName,
                        adminUserId = result.adminUserId,
                        mensagem    = "Tenant '${result.slug}' provisionado com sucesso.",
                    )
                )
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.UnprocessableEntity, ErroResponse("Erro de validação", e.message))
            }
        }
    }
}
