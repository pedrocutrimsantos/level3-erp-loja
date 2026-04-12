package br.com.madeireira.modules.empresa.infrastructure

import br.com.madeireira.infrastructure.database.DatabaseConfig.dbQuery
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.kotlin.datetime.timestamp
import java.util.UUID

// ── Tabela ───────────────────────────────────────────────────────────────────

private object EmpresaTable : Table("empresa") {
    val id                  = uuid("id")
    val cnpj                = varchar("cnpj", 18)
    val razaoSocial         = varchar("razao_social", 150)
    val nomeFantasia        = varchar("nome_fantasia", 100).nullable()
    val ie                  = varchar("ie", 20).nullable()
    val logradouro          = varchar("logradouro", 150)
    val numero              = varchar("numero", 10)
    val bairro              = varchar("bairro", 80)
    val cidade              = varchar("cidade", 80)
    val uf                  = char("uf", 2)
    val cep                 = char("cep", 9)
    val regimeTributario    = varchar("regime_tributario", 30)
    // ── Campos fiscais (V029) ─────────────────────────────────────────────────
    val cfopPadrao          = varchar("cfop_padrao", 5)
    val codigoMunicipioIbge = varchar("codigo_municipio_ibge", 7).nullable()
    val serieNfe            = varchar("serie_nfe", 3)
    val ambienteNfe         = varchar("ambiente_nfe", 20)
    // ── Certificado A1 (V031) ─────────────────────────────────────────────────
    val certificadoNfeBytes      = binary("certificado_nfe_bytes").nullable()
    val certificadoNfeSenha      = varchar("certificado_nfe_senha", 120).nullable()
    val certificadoNfeNome       = varchar("certificado_nfe_nome", 200).nullable()
    val certificadoNfeVencimento = timestamp("certificado_nfe_vencimento").nullable()
    override val primaryKey = PrimaryKey(id)
}

// ── Domínio ───────────────────────────────────────────────────────────────────

data class EmpresaData(
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
    // ── Certificado A1 ────────────────────────────────────────────────────────
    val certificadoNfeBytes:      ByteArray? = null,
    val certificadoNfeSenha:      String?    = null,
    val certificadoNfeNome:       String?    = null,
    val certificadoNfeVencimento: java.time.Instant? = null,
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
                it[id]                  = newId
                it[cnpj]                = req.cnpj.filter { c -> c.isDigit() || c == '.' || c == '/' || c == '-' }
                it[razaoSocial]         = req.razaoSocial.trim()
                it[nomeFantasia]        = req.nomeFantasia?.trim()?.takeIf { s -> s.isNotBlank() }
                it[ie]                  = req.ie?.trim()?.takeIf { s -> s.isNotBlank() }
                it[logradouro]          = req.logradouro.trim()
                it[numero]              = req.numero.trim()
                it[bairro]              = req.bairro.trim()
                it[cidade]              = req.cidade.trim()
                it[uf]                  = req.uf.trim().uppercase()
                it[cep]                 = req.cep.trim()
                it[regimeTributario]    = req.regimeTributario
                it[cfopPadrao]          = req.cfopPadrao.trim().ifBlank { "5102" }
                it[codigoMunicipioIbge] = req.codigoMunicipioIbge?.filter { c -> c.isDigit() }?.takeIf { s -> s.isNotBlank() }
                it[serieNfe]            = req.serieNfe.trim().ifBlank { "001" }
                it[ambienteNfe]         = normalizeAmbiente(req.ambienteNfe)
            }
            req.copy(id = newId.toString())
        } else {
            val existingId = existing[EmpresaTable.id]
            EmpresaTable.update({ EmpresaTable.id eq existingId }) {
                it[cnpj]                = req.cnpj.filter { c -> c.isDigit() || c == '.' || c == '/' || c == '-' }
                it[razaoSocial]         = req.razaoSocial.trim()
                it[nomeFantasia]        = req.nomeFantasia?.trim()?.takeIf { s -> s.isNotBlank() }
                it[ie]                  = req.ie?.trim()?.takeIf { s -> s.isNotBlank() }
                it[logradouro]          = req.logradouro.trim()
                it[numero]              = req.numero.trim()
                it[bairro]              = req.bairro.trim()
                it[cidade]              = req.cidade.trim()
                it[uf]                  = req.uf.trim().uppercase()
                it[cep]                 = req.cep.trim()
                it[regimeTributario]    = req.regimeTributario
                it[cfopPadrao]          = req.cfopPadrao.trim().ifBlank { "5102" }
                it[codigoMunicipioIbge] = req.codigoMunicipioIbge?.filter { c -> c.isDigit() }?.takeIf { s -> s.isNotBlank() }
                it[serieNfe]            = req.serieNfe.trim().ifBlank { "001" }
                it[ambienteNfe]         = normalizeAmbiente(req.ambienteNfe)
                // certificado NÃO é alterado pelo upsert — use salvarCertificado()
            }
            req.copy(id = existingId.toString())
        }
    }

    /**
     * Salva (ou substitui) o certificado A1 do emitente.
     * Separado do upsert principal para evitar que um form de dados cadastrais
     * apague acidentalmente o certificado.
     *
     * @param bytes  bytes brutos do arquivo .pfx
     * @param senha  senha do .pfx (armazenada em texto — ver V031 para contexto)
     * @param nome   Common Name do titular extraído do certificado (para exibição)
     */
    suspend fun salvarCertificado(
        bytes: ByteArray,
        senha: String,
        nome: String,
        vencimento: java.time.Instant,
    ) = dbQuery {
        val existing = EmpresaTable.selectAll().firstOrNull()
            ?: error("Empresa não cadastrada. Salve os dados da empresa antes de enviar o certificado.")

        val existingId = existing[EmpresaTable.id]
        EmpresaTable.update({ EmpresaTable.id eq existingId }) {
            it[certificadoNfeBytes]      = bytes
            it[certificadoNfeSenha]      = senha
            it[certificadoNfeNome]       = nome
            it[certificadoNfeVencimento] = kotlinx.datetime.Instant.fromEpochMilliseconds(vencimento.toEpochMilli())
        }
    }

    /** Remove o certificado salvo no banco. */
    suspend fun removerCertificado() = dbQuery {
        val existing = EmpresaTable.selectAll().firstOrNull() ?: return@dbQuery
        EmpresaTable.update({ EmpresaTable.id eq existing[EmpresaTable.id] }) {
            it[certificadoNfeBytes]      = null as ByteArray?
            it[certificadoNfeSenha]      = null as String?
            it[certificadoNfeNome]       = null as String?
            it[certificadoNfeVencimento] = null as kotlinx.datetime.Instant?
        }
    }

    private fun toData(row: ResultRow) = EmpresaData(
        id                  = row[EmpresaTable.id].toString(),
        cnpj                = row[EmpresaTable.cnpj],
        razaoSocial         = row[EmpresaTable.razaoSocial],
        nomeFantasia        = row[EmpresaTable.nomeFantasia],
        ie                  = row[EmpresaTable.ie],
        logradouro          = row[EmpresaTable.logradouro],
        numero              = row[EmpresaTable.numero],
        bairro              = row[EmpresaTable.bairro],
        cidade              = row[EmpresaTable.cidade],
        uf                  = row[EmpresaTable.uf],
        cep                 = row[EmpresaTable.cep],
        regimeTributario    = row[EmpresaTable.regimeTributario],
        cfopPadrao          = row[EmpresaTable.cfopPadrao],
        codigoMunicipioIbge = row[EmpresaTable.codigoMunicipioIbge],
        serieNfe            = row[EmpresaTable.serieNfe],
        ambienteNfe         = row[EmpresaTable.ambienteNfe],
        certificadoNfeBytes      = row[EmpresaTable.certificadoNfeBytes],
        certificadoNfeSenha      = row[EmpresaTable.certificadoNfeSenha],
        certificadoNfeNome       = row[EmpresaTable.certificadoNfeNome],
        certificadoNfeVencimento = row[EmpresaTable.certificadoNfeVencimento]
            ?.let { java.time.Instant.ofEpochMilli(it.toEpochMilliseconds()) },
    )

    private fun normalizeAmbiente(v: String) =
        if (v.uppercase() == "PRODUCAO") "PRODUCAO" else "HOMOLOGACAO"
}
