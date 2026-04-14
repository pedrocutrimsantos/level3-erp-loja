package br.com.madeireira.core.security

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.ApplicationCall
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.response.respond
import kotlinx.serialization.Serializable

@Serializable
private data class SemPermissaoResponse(
    val erro: String,
    val requerido: String,
    val perfil: String,
)

/**
 * Verifica se o usuário autenticado possui a permissão solicitada.
 *
 * Retorna `false` e responde com 403 automaticamente caso não tenha.
 * O handler deve fazer `return@<verbo>` imediatamente após receber `false`.
 *
 * Uso:
 * ```kotlin
 * post("/emitir") {
 *     if (!call.requerPermissao(Permissions.FIS_EMITIR_NF)) return@post
 *     // ... lógica protegida
 * }
 * ```
 */
suspend fun ApplicationCall.requerPermissao(permissao: String): Boolean {
    val principal = principal<JWTPrincipal>() ?: run {
        respond(HttpStatusCode.Unauthorized, mapOf("erro" to "Não autenticado"))
        return false
    }
    val perfil = principal.payload.getClaim("perfil").asString() ?: ""
    if (!Permissions.perfilTemPermissao(perfil, permissao)) {
        respond(
            HttpStatusCode.Forbidden,
            SemPermissaoResponse(
                erro      = "Acesso negado — perfil '$perfil' não tem permissão '$permissao'",
                requerido = permissao,
                perfil    = perfil,
            )
        )
        return false
    }
    return true
}
