package br.com.madeireira.modules.fiscal.infrastructure.sefaz

import br.com.madeireira.modules.empresa.infrastructure.EmpresaData

/**
 * Configuração do emissor SEFAZ direto — carregada da tabela empresa por tenant.
 *
 * Dados obrigatórios para emissão:
 *   - cnpj, uf, codigoMunicipioIbge — identidade fiscal do emitente
 *   - ambiente — HOMOLOGACAO ou PRODUCAO
 *   - certificado A1 — configurado via env vars (NFE_CERT_PATH / NFE_CERT_SENHA)
 *
 * Dados opcionais (melhoram o DANFE e evitam rejeição por dados incompletos):
 *   - razaoSocial, logradouro, cidade, etc.
 */
data class SefazEmissorConfig(
    val cnpj:                String,    // 14 dígitos, sem formatação
    val uf:                  String,    // 2 letras
    val ambiente:            String,    // "HOMOLOGACAO" | "PRODUCAO"
    val cfopPadrao:          String = "5102",
    val serieNfe:            String = "001",
    val codigoMunicipioIbge: String?,   // 7 dígitos IBGE — obrigatório pelo leiaute NF-e
    val razaoSocial:         String?,
    val nomeFantasia:        String?,
    val logradouro:          String?,
    val numero:              String?,
    val bairro:              String?,
    val cidade:              String?,
    val cep:                 String?,   // 8 dígitos, sem formatação
    val ie:                  String?,
    val regimeTributario:    String = "SIMPLES",  // "SIMPLES" | "LUCRO_PRESUMIDO" | "LUCRO_REAL"
) {
    val producao: Boolean get() = ambiente.uppercase() == "PRODUCAO"

    companion object {
        fun fromEmpresa(e: EmpresaData) = SefazEmissorConfig(
            cnpj                = e.cnpj.filter { it.isDigit() },
            uf                  = e.uf,
            ambiente            = e.ambienteNfe,
            cfopPadrao          = e.cfopPadrao.ifBlank { "5102" },
            serieNfe            = e.serieNfe.ifBlank { "001" },
            codigoMunicipioIbge = e.codigoMunicipioIbge,
            razaoSocial         = e.razaoSocial,
            nomeFantasia        = e.nomeFantasia,
            logradouro          = e.logradouro,
            numero              = e.numero,
            bairro              = e.bairro,
            cidade              = e.cidade,
            cep                 = e.cep.filter { it.isDigit() },
            ie                  = e.ie,
            regimeTributario    = e.regimeTributario,
        )
    }
}
