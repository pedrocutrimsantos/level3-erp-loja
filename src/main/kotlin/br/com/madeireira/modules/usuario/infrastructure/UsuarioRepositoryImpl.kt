package br.com.madeireira.modules.usuario.infrastructure

import br.com.madeireira.infrastructure.database.DatabaseConfig.dbQuery
import br.com.madeireira.modules.usuario.domain.AtualizarUsuarioRequest
import br.com.madeireira.modules.usuario.domain.CriarUsuarioRequest
import br.com.madeireira.modules.usuario.domain.PerfilSimples
import br.com.madeireira.modules.usuario.domain.UsuarioListItem
import kotlinx.datetime.toJavaInstant
import org.jetbrains.exposed.sql.JoinType
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.kotlin.datetime.timestamp
import org.jetbrains.exposed.sql.select
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.update
import org.mindrot.jbcrypt.BCrypt
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.UUID

// ── Tabelas Exposed ──────────────────────────────────────────────────────────

private object UsuarioTable : Table("usuario") {
    val id                     = uuid("id").autoGenerate()
    val nome                   = varchar("nome", 120)
    val email                  = varchar("email", 120)
    val senhaHash              = varchar("senha_hash", 255).nullable()
    val telefone               = varchar("telefone", 20).nullable()
    val perfilId               = uuid("perfil_id")
    val vendedor               = bool("vendedor")
    val ativo                  = bool("ativo")
    val primeiroAcessoPendente = bool("primeiro_acesso_pendente")
    val ultimoAcesso           = timestamp("ultimo_acesso").nullable()
    val createdAt              = timestamp("created_at")
    override val primaryKey = PrimaryKey(id)
}

private object PerfilTable : Table("perfil") {
    val id       = uuid("id")
    val codigo   = varchar("codigo", 30)
    val descricao = varchar("descricao", 100)
    val ativo    = bool("ativo")
    override val primaryKey = PrimaryKey(id)
}

// ── Implementação ────────────────────────────────────────────────────────────

private val isoFormatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME

class UsuarioRepositoryImpl : UsuarioRepository {

    override suspend fun findAll(): List<UsuarioListItem> = dbQuery {
        UsuarioTable
            .join(PerfilTable, JoinType.INNER, UsuarioTable.perfilId, PerfilTable.id)
            .selectAll()
            .orderBy(UsuarioTable.nome)
            .map { toItem(it) }
    }

    override suspend fun findById(id: UUID): UsuarioListItem? = dbQuery {
        UsuarioTable
            .join(PerfilTable, JoinType.INNER, UsuarioTable.perfilId, PerfilTable.id)
            .select { UsuarioTable.id eq id }
            .singleOrNull()
            ?.let { toItem(it) }
    }

    override suspend fun emailJaExiste(email: String, excluirId: UUID?): Boolean = dbQuery {
        val rows = UsuarioTable
            .select { UsuarioTable.email eq email }
            .toList()
        if (excluirId != null) rows.any { it[UsuarioTable.id] != excluirId }
        else rows.isNotEmpty()
    }

    override suspend fun criar(req: CriarUsuarioRequest): UsuarioListItem = dbQuery {
        val perfilId = PerfilTable
            .select { PerfilTable.codigo eq req.perfilCodigo }
            .single()[PerfilTable.id]

        val novoId = UUID.randomUUID()

        UsuarioTable.insert {
            it[id]                     = novoId
            it[nome]                   = req.nome.trim()
            it[email]                  = req.email.trim().lowercase()
            it[senhaHash]              = null
            it[telefone]               = req.telefone.filter { c -> c.isDigit() }.takeIf { t -> t.isNotEmpty() }
            it[this.perfilId]          = perfilId
            it[vendedor]               = req.vendedor
            it[ativo]                  = true
            it[primeiroAcessoPendente] = true
        }

        UsuarioTable
            .join(PerfilTable, JoinType.INNER, UsuarioTable.perfilId, PerfilTable.id)
            .select { UsuarioTable.id eq novoId }
            .single()
            .let { toItem(it) }
    }

    override suspend fun atualizar(id: UUID, req: AtualizarUsuarioRequest): UsuarioListItem = dbQuery {
        val perfilId = if (req.perfilCodigo != null) {
            PerfilTable
                .select { PerfilTable.codigo eq req.perfilCodigo }
                .single()[PerfilTable.id]
        } else null

        UsuarioTable.update({ UsuarioTable.id eq id }) { stmt ->
            if (req.nome != null)         stmt[nome]     = req.nome.trim()
            if (req.email != null)        stmt[email]    = req.email.trim().lowercase()
            if (req.senha != null)        stmt[senhaHash] = BCrypt.hashpw(req.senha, BCrypt.gensalt(12))
            if (perfilId != null)         stmt[this.perfilId] = perfilId
            if (req.vendedor != null)     stmt[vendedor] = req.vendedor
            if (req.telefone != null)     stmt[telefone] = req.telefone.filter { it.isDigit() }.takeIf { it.isNotEmpty() }
        }

        UsuarioTable
            .join(PerfilTable, JoinType.INNER, UsuarioTable.perfilId, PerfilTable.id)
            .select { UsuarioTable.id eq id }
            .single()
            .let { toItem(it) }
    }

    override suspend fun setAtivo(id: UUID, ativo: Boolean): UsuarioListItem = dbQuery {
        UsuarioTable.update({ UsuarioTable.id eq id }) {
            it[this.ativo] = ativo
        }

        UsuarioTable
            .join(PerfilTable, JoinType.INNER, UsuarioTable.perfilId, PerfilTable.id)
            .select { UsuarioTable.id eq id }
            .single()
            .let { toItem(it) }
    }

    override suspend fun listarPerfis(): List<PerfilSimples> = dbQuery {
        PerfilTable
            .select { PerfilTable.ativo eq true }
            .orderBy(PerfilTable.codigo)
            .map { PerfilSimples(it[PerfilTable.id], it[PerfilTable.codigo], it[PerfilTable.descricao]) }
    }

    override suspend fun perfilExiste(codigo: String): Boolean = dbQuery {
        PerfilTable
            .select { (PerfilTable.codigo eq codigo) }
            .count() > 0
    }

    private fun toItem(row: ResultRow): UsuarioListItem {
        val ultimoAcesso = row[UsuarioTable.ultimoAcesso]
            ?.toJavaInstant()
            ?.atOffset(ZoneOffset.UTC)?.toLocalDateTime()
            ?.format(isoFormatter)
        val createdAt = row[UsuarioTable.createdAt]
            .toJavaInstant()
            .atOffset(ZoneOffset.UTC).toLocalDateTime()
            .format(isoFormatter)

        return UsuarioListItem(
            id                      = row[UsuarioTable.id],
            nome                    = row[UsuarioTable.nome],
            email                   = row[UsuarioTable.email],
            telefone                = row[UsuarioTable.telefone],
            perfilId                = row[UsuarioTable.perfilId],
            perfilCodigo            = row[PerfilTable.codigo],
            perfilDescricao         = row[PerfilTable.descricao],
            vendedor                = row[UsuarioTable.vendedor],
            ativo                   = row[UsuarioTable.ativo],
            primeiroAcessoPendente  = row[UsuarioTable.primeiroAcessoPendente],
            ultimoAcesso            = ultimoAcesso,
            createdAt               = createdAt,
        )
    }
}
