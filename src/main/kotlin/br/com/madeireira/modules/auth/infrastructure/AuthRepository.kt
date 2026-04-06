package br.com.madeireira.modules.auth.infrastructure

import br.com.madeireira.modules.auth.domain.TenantRecord
import br.com.madeireira.modules.auth.domain.UsuarioAuth
import kotlinx.coroutines.Dispatchers
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import org.jetbrains.exposed.sql.JoinType
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.select
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import org.jetbrains.exposed.sql.update
import org.jetbrains.exposed.sql.kotlin.datetime.timestamp

// ── Exposed tables para queries de autenticação ───────────────────────────────

/** Tabela pública de tenants — sempre no schema "public". */
private object TenantTable : Table("public.tenant") {
    val id          = uuid("id")
    val slug        = varchar("slug", 50)
    val tenantSchema = varchar("schema_name", 63)
    val ativo       = bool("ativo")
    override val primaryKey = PrimaryKey(id)
}

/** Tabela de usuários — resolvida via search_path do tenant ativo. */
private object UsuarioTable : Table("usuario") {
    val id                 = uuid("id")
    val nome               = varchar("nome", 120)
    val email              = varchar("email", 120)
    val senhaHash          = varchar("senha_hash", 255)
    val perfilId           = uuid("perfil_id")
    val ativo              = bool("ativo")
    val ultimoAcesso       = timestamp("ultimo_acesso").nullable()
    val resetToken         = varchar("reset_token", 64).nullable()
    val resetTokenExpira   = timestamp("reset_token_expira").nullable()
    val telefone           = varchar("telefone", 20).nullable()
    override val primaryKey = PrimaryKey(id)
}

/** Tabela de perfis — resolvida via search_path do tenant ativo. */
private object PerfilTable : Table("perfil") {
    val id     = uuid("id")
    val codigo = varchar("codigo", 30)
    override val primaryKey = PrimaryKey(id)
}

// ── Repositório ───────────────────────────────────────────────────────────────

class AuthRepository {

    /** Busca tenant em public.tenant — sem search_path customizado. */
    suspend fun findTenant(slug: String): TenantRecord? =
        newSuspendedTransaction(Dispatchers.IO) {
            TenantTable
                .select { TenantTable.slug eq slug }
                .singleOrNull()
                ?.let {
                    TenantRecord(
                        id         = it[TenantTable.id].toString(),
                        slug       = it[TenantTable.slug],
                        schemaName = it[TenantTable.tenantSchema],
                        ativo      = it[TenantTable.ativo],
                    )
                }
        }

    /** Busca usuário por e-mail dentro do schema do tenant. */
    suspend fun findUsuarioByEmail(email: String, schemaName: String): UsuarioAuth? =
        newSuspendedTransaction(Dispatchers.IO) {
            val safe = schemaName.replace(Regex("[^a-zA-Z0-9_]"), "")
            exec("SET LOCAL search_path = \"$safe\", public")

            UsuarioTable
                .join(PerfilTable, JoinType.INNER, UsuarioTable.perfilId, PerfilTable.id)
                .select { UsuarioTable.email eq email }
                .singleOrNull()
                ?.let {
                    UsuarioAuth(
                        id        = it[UsuarioTable.id].toString(),
                        nome      = it[UsuarioTable.nome],
                        email     = it[UsuarioTable.email],
                        senhaHash = it[UsuarioTable.senhaHash],
                        ativo     = it[UsuarioTable.ativo],
                        perfil    = it[PerfilTable.codigo],
                        telefone  = it[UsuarioTable.telefone],
                    )
                }
        }

    /** Atualiza ultimo_acesso do usuário no schema do tenant. */
    suspend fun atualizarUltimoAcesso(userId: String, schemaName: String) =
        newSuspendedTransaction(Dispatchers.IO) {
            val safe = schemaName.replace(Regex("[^a-zA-Z0-9_]"), "")
            exec("SET LOCAL search_path = \"$safe\", public")
            UsuarioTable.update({ UsuarioTable.id eq java.util.UUID.fromString(userId) }) {
                it[ultimoAcesso] = Clock.System.now()
            }
        }

    /** Salva token de reset (1 hora de validade). */
    suspend fun salvarResetToken(email: String, token: String, expira: Instant, schemaName: String) =
        newSuspendedTransaction(Dispatchers.IO) {
            val safe = schemaName.replace(Regex("[^a-zA-Z0-9_]"), "")
            exec("SET LOCAL search_path = \"$safe\", public")
            UsuarioTable.update({ UsuarioTable.email eq email }) {
                it[resetToken]       = token
                it[resetTokenExpira] = expira
            }
        }

    /** Busca usuário pelo token de reset, apenas se ainda válido. */
    suspend fun findByResetToken(token: String, schemaName: String): UsuarioAuth? =
        newSuspendedTransaction(Dispatchers.IO) {
            val safe = schemaName.replace(Regex("[^a-zA-Z0-9_]"), "")
            exec("SET LOCAL search_path = \"$safe\", public")
            val agora = Clock.System.now()
            UsuarioTable
                .join(PerfilTable, JoinType.INNER, UsuarioTable.perfilId, PerfilTable.id)
                .select {
                    (UsuarioTable.resetToken eq token) and
                    (UsuarioTable.resetTokenExpira greaterEq agora)
                }
                .singleOrNull()
                ?.let {
                    UsuarioAuth(
                        id        = it[UsuarioTable.id].toString(),
                        nome      = it[UsuarioTable.nome],
                        email     = it[UsuarioTable.email],
                        senhaHash = it[UsuarioTable.senhaHash],
                        ativo     = it[UsuarioTable.ativo],
                        perfil    = it[PerfilTable.codigo],
                        telefone  = it[UsuarioTable.telefone],
                    )
                }
        }

    /** Redefine a senha e limpa o token de reset. */
    suspend fun redefinirSenha(userId: String, novaSenhaHash: String, schemaName: String) =
        newSuspendedTransaction(Dispatchers.IO) {
            val safe = schemaName.replace(Regex("[^a-zA-Z0-9_]"), "")
            exec("SET LOCAL search_path = \"$safe\", public")
            UsuarioTable.update({ UsuarioTable.id eq java.util.UUID.fromString(userId) }) {
                it[senhaHash]        = novaSenhaHash
                it[resetToken]       = null
                it[resetTokenExpira] = null
            }
        }

    /** Busca apenas o hash da senha atual (para verificação ao alterar senha). */
    suspend fun findSenhaHash(userId: String, schemaName: String): String? =
        newSuspendedTransaction(Dispatchers.IO) {
            val safe = schemaName.replace(Regex("[^a-zA-Z0-9_]"), "")
            exec("SET LOCAL search_path = \"$safe\", public")
            UsuarioTable
                .select { UsuarioTable.id eq java.util.UUID.fromString(userId) }
                .singleOrNull()
                ?.get(UsuarioTable.senhaHash)
        }
}