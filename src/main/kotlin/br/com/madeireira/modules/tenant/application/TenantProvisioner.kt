package br.com.madeireira.modules.tenant.application

import br.com.madeireira.infrastructure.database.DatabaseConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.datetime.toJavaInstant
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.kotlin.datetime.timestamp
import org.jetbrains.exposed.sql.select
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import org.jetbrains.exposed.sql.update
import org.mindrot.jbcrypt.BCrypt
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.UUID

private object TenantTable : Table("public.tenant") {
    val id           = uuid("id")
    val slug         = varchar("slug", 50)
    val razaoSocial  = varchar("razao_social", 150)
    val cnpj         = varchar("cnpj", 18)
    val tenantSchema = varchar("schema_name", 63)
    val ativo        = bool("ativo")
    val createdAt    = timestamp("created_at")
    override val primaryKey = PrimaryKey(id)
}

private val isoFmt = DateTimeFormatter.ISO_LOCAL_DATE_TIME

data class TenantItem(
    val id:          String,
    val slug:        String,
    val razaoSocial: String,
    val cnpj:        String,
    val schemaName:  String,
    val ativo:       Boolean,
    val createdAt:   String,
)

data class NovoTenantRequest(
    val slug:         String,
    val razaoSocial:  String,
    val cnpj:         String,
    val adminEmail:   String,
    val adminNome:    String,
    val adminSenha:   String,
)

data class TenantProvisionado(
    val tenantId:    String,
    val slug:        String,
    val schemaName:  String,
    val adminUserId: String,
)

class TenantProvisioner {

    suspend fun provisionar(req: NovoTenantRequest): TenantProvisionado {
        val slug = req.slug.trim().lowercase().replace(Regex("[^a-z0-9_]"), "_")
        require(slug.isNotBlank() && slug.length >= 3) { "Slug inválido (mínimo 3 caracteres, apenas letras, números e _)" }
        require(req.adminSenha.length >= 8) { "Senha do admin deve ter ao menos 8 caracteres" }

        val schemaName = "t_$slug"

        // 1. Verifica se slug já existe
        val jaExiste = newSuspendedTransaction(Dispatchers.IO) {
            TenantTable.select { TenantTable.slug eq slug }.count() > 0
        }
        require(!jaExiste) { "Slug '$slug' já está em uso" }

        // 2. Cria schema e roda migrations (Flyway)
        DatabaseConfig.provisionTenant(schemaName)

        // 3. Registra tenant em public.tenant
        val tenantId = UUID.randomUUID()
        newSuspendedTransaction(Dispatchers.IO) {
            TenantTable.insert {
                it[id]          = tenantId
                it[TenantTable.slug]       = slug
                it[razaoSocial] = req.razaoSocial
                it[cnpj]        = req.cnpj
                it[TenantTable.tenantSchema] = schemaName
                it[ativo]       = true
            }
        }

        // 4. Cria usuário admin no schema do tenant
        val adminId = UUID.randomUUID()
        val senhaHash = BCrypt.hashpw(req.adminSenha, BCrypt.gensalt(12))

        newSuspendedTransaction(Dispatchers.IO) {
            exec("SET LOCAL search_path = \"$schemaName\", public")
            exec("""
                INSERT INTO usuario (id, nome, email, senha_hash, perfil_id, ativo)
                SELECT '$adminId', '${req.adminNome.replace("'", "''")}',
                       '${req.adminEmail.trim().lowercase().replace("'", "''")}',
                       '$senhaHash',
                       p.id, true
                FROM perfil p WHERE p.codigo = 'ADMIN'
                LIMIT 1
            """.trimIndent())
        }

        return TenantProvisionado(
            tenantId    = tenantId.toString(),
            slug        = slug,
            schemaName  = schemaName,
            adminUserId = adminId.toString(),
        )
    }

    suspend fun listar(): List<TenantItem> = newSuspendedTransaction(Dispatchers.IO) {
        TenantTable.selectAll()
            .orderBy(TenantTable.createdAt)
            .map {
                TenantItem(
                    id          = it[TenantTable.id].toString(),
                    slug        = it[TenantTable.slug],
                    razaoSocial = it[TenantTable.razaoSocial],
                    cnpj        = it[TenantTable.cnpj],
                    schemaName  = it[TenantTable.tenantSchema],
                    ativo       = it[TenantTable.ativo],
                    createdAt   = it[TenantTable.createdAt].toJavaInstant()
                        .atOffset(ZoneOffset.UTC).toLocalDateTime().format(isoFmt),
                )
            }
    }

    suspend fun setAtivo(id: UUID, ativo: Boolean) = newSuspendedTransaction(Dispatchers.IO) {
        TenantTable.update({ TenantTable.id eq id }) { it[TenantTable.ativo] = ativo }
    }
}
