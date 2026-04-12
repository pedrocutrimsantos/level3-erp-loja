package br.com.madeireira.modules.auth.infrastructure

import kotlinx.coroutines.Dispatchers
import kotlinx.datetime.Instant
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.kotlin.datetime.timestamp
import org.jetbrains.exposed.sql.select
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import org.jetbrains.exposed.sql.update
import org.mindrot.jbcrypt.BCrypt
import java.util.UUID

// ── Tabelas Exposed (privadas a este arquivo) ────────────────────────────────

private object UsuarioPaTable : Table("usuario") {
    val id                     = uuid("id")
    val email                  = varchar("email", 120)
    val nome                   = varchar("nome", 120)
    val telefone               = varchar("telefone", 20).nullable()
    val ativo                  = bool("ativo")
    val primeiroAcessoPendente = bool("primeiro_acesso_pendente")
    val senhaHash              = varchar("senha_hash", 255).nullable()
    override val primaryKey    = PrimaryKey(id)
}

private object TokenTable : Table("primeiro_acesso_token") {
    val id             = uuid("id").autoGenerate()
    val usuarioId      = uuid("usuario_id")
    val tokenHash      = varchar("token_hash", 64)
    val canalEnvio     = varchar("canal_envio", 20)
    val expiraEm       = timestamp("expira_em")
    val utilizadoEm    = timestamp("utilizado_em").nullable()
    val tentativas     = integer("tentativas")
    val bloqueado      = bool("bloqueado")
    val reenvios       = integer("reenvios")
    val ultimoReenvio  = timestamp("ultimo_reenvio").nullable()
    val createdAt      = timestamp("created_at")
    override val primaryKey = PrimaryKey(id)
}

// ── DTO interno do token ─────────────────────────────────────────────────────

data class TokenRecord(
    val id:            UUID,
    val usuarioId:     UUID,
    val tokenHash:     String,
    val expiraEm:      Instant,
    val utilizadoEm:   Instant?,
    val tentativas:    Int,
    val bloqueado:     Boolean,
    val reenvios:      Int,
    val ultimoReenvio: Instant?,
)

// ── DTO de usuário simplificado para este fluxo ──────────────────────────────

data class UsuarioPa(
    val id:                     UUID,
    val nome:                   String,
    val email:                  String,
    val telefone:               String?,
    val ativo:                  Boolean,
    val primeiroAcessoPendente: Boolean,
)

// ── Repositório ───────────────────────────────────────────────────────────────

class PrimeiroAcessoRepository {

    /** Busca usuário por email dentro do schema do tenant. */
    suspend fun findByEmail(email: String, schemaName: String): UsuarioPa? =
        newSuspendedTransaction(Dispatchers.IO) {
            exec("SET LOCAL search_path = \"${safe(schemaName)}\", public")
            UsuarioPaTable
                .select { UsuarioPaTable.email eq email.trim().lowercase() }
                .singleOrNull()
                ?.let { row ->
                    UsuarioPa(
                        id                     = row[UsuarioPaTable.id],
                        nome                   = row[UsuarioPaTable.nome],
                        email                  = row[UsuarioPaTable.email],
                        telefone               = row[UsuarioPaTable.telefone],
                        ativo                  = row[UsuarioPaTable.ativo],
                        primeiroAcessoPendente = row[UsuarioPaTable.primeiroAcessoPendente],
                    )
                }
        }

    /** Salva novo token (invalida qualquer anterior ao inserir; a política de reenvio é feita no service). */
    suspend fun salvarToken(
        usuarioId: UUID,
        tokenHash: String,
        canal: String,
        expiraEm: Instant,
        reenviosAnteriores: Int,
        schemaName: String,
    ): UUID = newSuspendedTransaction(Dispatchers.IO) {
        exec("SET LOCAL search_path = \"${safe(schemaName)}\", public")
        val novoId = UUID.randomUUID()
        TokenTable.insert {
            it[id]            = novoId
            it[this.usuarioId] = usuarioId
            it[this.tokenHash] = tokenHash
            it[canalEnvio]    = canal
            it[this.expiraEm]  = expiraEm
            it[tentativas]    = 0
            it[bloqueado]     = false
            it[reenvios]      = reenviosAnteriores
            it[createdAt]     = kotlinx.datetime.Clock.System.now()
        }
        novoId
    }

    /** Busca o token ativo (não utilizado, não bloqueado) de um usuário. */
    suspend fun findTokenAtivo(usuarioId: UUID, schemaName: String): TokenRecord? =
        newSuspendedTransaction(Dispatchers.IO) {
            exec("SET LOCAL search_path = \"${safe(schemaName)}\", public")
            TokenTable
                .select {
                    (TokenTable.usuarioId eq usuarioId) and
                    (TokenTable.utilizadoEm.isNull()) and
                    (TokenTable.bloqueado eq false)
                }
                .orderBy(TokenTable.createdAt, org.jetbrains.exposed.sql.SortOrder.DESC)
                .firstOrNull()
                ?.toRecord()
        }

    /** Incrementa tentativas e retorna o novo valor. */
    suspend fun incrementarTentativas(tokenId: UUID, schemaName: String): Int =
        newSuspendedTransaction(Dispatchers.IO) {
            exec("SET LOCAL search_path = \"${safe(schemaName)}\", public")
            // Lê valor atual
            val atual = TokenTable
                .select { TokenTable.id eq tokenId }
                .single()[TokenTable.tentativas]
            val novo = atual + 1
            TokenTable.update({ TokenTable.id eq tokenId }) {
                it[tentativas] = novo
            }
            novo
        }

    /** Bloqueia o token (muitas tentativas). */
    suspend fun bloquearToken(tokenId: UUID, schemaName: String) =
        newSuspendedTransaction(Dispatchers.IO) {
            exec("SET LOCAL search_path = \"${safe(schemaName)}\", public")
            TokenTable.update({ TokenTable.id eq tokenId }) {
                it[bloqueado] = true
            }
        }

    /** Marca token como utilizado. */
    suspend fun marcarUtilizado(tokenId: UUID, schemaName: String) =
        newSuspendedTransaction(Dispatchers.IO) {
            exec("SET LOCAL search_path = \"${safe(schemaName)}\", public")
            TokenTable.update({ TokenTable.id eq tokenId }) {
                it[utilizadoEm] = kotlinx.datetime.Clock.System.now()
            }
        }

    /** Registra reenvio: atualiza ultimo_reenvio e incrementa reenvios no token anterior. */
    suspend fun registrarReenvio(tokenId: UUID, schemaName: String) =
        newSuspendedTransaction(Dispatchers.IO) {
            exec("SET LOCAL search_path = \"${safe(schemaName)}\", public")
            val reenviosAtuais = TokenTable
                .select { TokenTable.id eq tokenId }
                .single()[TokenTable.reenvios]
            TokenTable.update({ TokenTable.id eq tokenId }) {
                it[reenvios]      = reenviosAtuais + 1
                it[ultimoReenvio] = kotlinx.datetime.Clock.System.now()
            }
        }

    /** Define a senha e limpa o flag de primeiro acesso. */
    suspend fun definirSenha(usuarioId: UUID, novaSenhaHash: String, schemaName: String) =
        newSuspendedTransaction(Dispatchers.IO) {
            exec("SET LOCAL search_path = \"${safe(schemaName)}\", public")
            UsuarioPaTable.update({ UsuarioPaTable.id eq usuarioId }) {
                it[senhaHash]              = novaSenhaHash
                it[primeiroAcessoPendente] = false
            }
        }

    // ── helpers ───────────────────────────────────────────────────────────────

    private fun safe(schema: String) = schema.replace(Regex("[^a-zA-Z0-9_]"), "")

    private fun org.jetbrains.exposed.sql.ResultRow.toRecord() = TokenRecord(
        id            = this[TokenTable.id],
        usuarioId     = this[TokenTable.usuarioId],
        tokenHash     = this[TokenTable.tokenHash],
        expiraEm      = this[TokenTable.expiraEm],
        utilizadoEm   = this[TokenTable.utilizadoEm],
        tentativas    = this[TokenTable.tentativas],
        bloqueado     = this[TokenTable.bloqueado],
        reenvios      = this[TokenTable.reenvios],
        ultimoReenvio = this[TokenTable.ultimoReenvio],
    )
}
