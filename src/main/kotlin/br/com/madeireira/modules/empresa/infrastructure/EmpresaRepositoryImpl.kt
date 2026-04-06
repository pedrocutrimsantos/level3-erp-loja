package br.com.madeireira.modules.empresa.infrastructure

import br.com.madeireira.infrastructure.database.DatabaseConfig.dbQuery
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.util.UUID

// ── Tabela ───────────────────────────────────────────────────────────────────

private object EmpresaTable : Table("empresa") {
    val id              = uuid("id")
    val cnpj            = varchar("cnpj", 18)
    val razaoSocial     = varchar("razao_social", 150)
    val nomeFantasia    = varchar("nome_fantasia", 100).nullable()
    val ie              = varchar("ie", 20).nullable()
    val logradouro      = varchar("logradouro", 150)
    val numero          = varchar("numero", 10)
    val bairro          = varchar("bairro", 80)
    val cidade          = varchar("cidade", 80)
    val uf              = char("uf", 2)
    val cep             = char("cep", 9)
    val regimeTributario = varchar("regime_tributario", 30)
    override val primaryKey = PrimaryKey(id)
}

// ── Domínio ───────────────────────────────────────────────────────────────────

data class EmpresaData(
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

// ── Repositório ───────────────────────────────────────────────────────────────

class EmpresaRepositoryImpl {

    suspend fun get(): EmpresaData? = dbQuery {
        EmpresaTable.selectAll().firstOrNull()?.let { toData(it) }
    }

    suspend fun upsert(req: EmpresaData): EmpresaData = dbQuery {
        val existing = EmpresaTable.selectAll().firstOrNull()

        if (existing == null) {
            val newId = UUID.randomUUID()
            EmpresaTable.insert {
                it[id]               = newId
                it[cnpj]             = req.cnpj.filter { c -> c.isDigit() || c == '.' || c == '/' || c == '-' }
                it[razaoSocial]      = req.razaoSocial.trim()
                it[nomeFantasia]     = req.nomeFantasia?.trim()?.takeIf { s -> s.isNotBlank() }
                it[ie]               = req.ie?.trim()?.takeIf { s -> s.isNotBlank() }
                it[logradouro]       = req.logradouro.trim()
                it[numero]           = req.numero.trim()
                it[bairro]           = req.bairro.trim()
                it[cidade]           = req.cidade.trim()
                it[uf]               = req.uf.trim().uppercase()
                it[cep]              = req.cep.trim()
                it[regimeTributario] = req.regimeTributario
            }
            req.copy(id = newId.toString())
        } else {
            val existingId = existing[EmpresaTable.id]
            EmpresaTable.update({ EmpresaTable.id eq existingId }) {
                it[cnpj]             = req.cnpj.filter { c -> c.isDigit() || c == '.' || c == '/' || c == '-' }
                it[razaoSocial]      = req.razaoSocial.trim()
                it[nomeFantasia]     = req.nomeFantasia?.trim()?.takeIf { s -> s.isNotBlank() }
                it[ie]               = req.ie?.trim()?.takeIf { s -> s.isNotBlank() }
                it[logradouro]       = req.logradouro.trim()
                it[numero]           = req.numero.trim()
                it[bairro]           = req.bairro.trim()
                it[cidade]           = req.cidade.trim()
                it[uf]               = req.uf.trim().uppercase()
                it[cep]              = req.cep.trim()
                it[regimeTributario] = req.regimeTributario
            }
            req.copy(id = existingId.toString())
        }
    }

    private fun toData(row: ResultRow) = EmpresaData(
        id               = row[EmpresaTable.id].toString(),
        cnpj             = row[EmpresaTable.cnpj],
        razaoSocial      = row[EmpresaTable.razaoSocial],
        nomeFantasia     = row[EmpresaTable.nomeFantasia],
        ie               = row[EmpresaTable.ie],
        logradouro       = row[EmpresaTable.logradouro],
        numero           = row[EmpresaTable.numero],
        bairro           = row[EmpresaTable.bairro],
        cidade           = row[EmpresaTable.cidade],
        uf               = row[EmpresaTable.uf],
        cep              = row[EmpresaTable.cep],
        regimeTributario = row[EmpresaTable.regimeTributario],
    )
}
