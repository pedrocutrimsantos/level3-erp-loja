package br.com.madeireira.modules.fiscal.infrastructure.sefaz

/**
 * Tabela de URLs dos web services SEFAZ para NF-e 4.0 (modelo 55).
 *
 * Autorizadores possíveis:
 *   SVAN  — Ambiente Nacional (AM, BA, CE, GO, MA, MS, MT, PA, PE, PI, RN, TO)
 *   SVRS  — Sefaz Virtual do RS (AC, AL, AP, DF, ES, PB, RJ, RO, RR, SC, SE)
 *   SVMG  — Sefaz Minas Gerais
 *   SVSP  — Sefaz São Paulo
 *   SVPR  — Sefaz Paraná
 *   SVRS_PROPRIO — RS (infraestrutura própria)
 *
 * Referência: Ato COTEPE/ICMS nº 44/2018 e atualizações — tabela de WS por UF.
 */
object SefazUrlRouter {

    private enum class Autorizador { SVAN, SVRS, SVMG, SVSP, SVPR, SVRS_PROPRIO }

    private val UF_AUTORIZADOR: Map<String, Autorizador> = mapOf(
        // SVAN (Ambiente Nacional)
        "AM" to Autorizador.SVAN, "BA" to Autorizador.SVAN, "CE" to Autorizador.SVAN,
        "GO" to Autorizador.SVAN, "MA" to Autorizador.SVAN, "MS" to Autorizador.SVAN,
        "MT" to Autorizador.SVAN, "PA" to Autorizador.SVAN, "PE" to Autorizador.SVAN,
        "PI" to Autorizador.SVAN, "RN" to Autorizador.SVAN, "TO" to Autorizador.SVAN,
        // SVRS (Receita Federal / Rio Grande do Sul)
        "AC" to Autorizador.SVRS, "AL" to Autorizador.SVRS, "AP" to Autorizador.SVRS,
        "DF" to Autorizador.SVRS, "ES" to Autorizador.SVRS, "PB" to Autorizador.SVRS,
        "RJ" to Autorizador.SVRS, "RO" to Autorizador.SVRS, "RR" to Autorizador.SVRS,
        "SC" to Autorizador.SVRS, "SE" to Autorizador.SVRS,
        // Infraestrutura própria
        "MG" to Autorizador.SVMG,
        "SP" to Autorizador.SVSP,
        "PR" to Autorizador.SVPR,
        "RS" to Autorizador.SVRS_PROPRIO,
    )

    /** Código numérico IBGE da UF (cUF no XML da NF-e) */
    val UF_CODIGO: Map<String, String> = mapOf(
        "AC" to "12", "AL" to "27", "AM" to "13", "AP" to "16",
        "BA" to "29", "CE" to "23", "DF" to "53", "ES" to "32",
        "GO" to "52", "MA" to "21", "MG" to "31", "MS" to "50",
        "MT" to "51", "PA" to "15", "PB" to "25", "PE" to "26",
        "PI" to "22", "PR" to "41", "RJ" to "33", "RN" to "24",
        "RO" to "11", "RR" to "14", "RS" to "43", "SC" to "42",
        "SE" to "28", "SP" to "35", "TO" to "17",
    )

    data class SefazUrls(
        /** NFeAutorizacao4 — envio síncrono do lote */
        val autorizacao: String,
        /** NFeRetAutorizacao4 — consulta do lote assíncrono (raramente necessário com indSinc=1) */
        val retAutorizacao: String,
        /** NFeConsultaProtocolo4 — consulta por chave de acesso */
        val consultaProtocolo: String,
        /** NFeStatusServico4 — ping de disponibilidade da SEFAZ */
        val statusServico: String,
        /** NFeRecepcaoEvento4 — cancelamento, CC-e */
        val recepcaoEvento: String,
    )

    /** Resolve as URLs corretas para a UF e ambiente informados. */
    fun resolver(uf: String, ambiente: String): SefazUrls {
        val autorizador = UF_AUTORIZADOR[uf.uppercase()] ?: Autorizador.SVRS
        val prod = ambiente.uppercase() == "PRODUCAO"
        return when (autorizador) {
            Autorizador.SVAN         -> svan(prod)
            Autorizador.SVRS         -> svrs(prod)
            Autorizador.SVMG         -> svmg(prod)
            Autorizador.SVSP         -> svsp(prod)
            Autorizador.SVPR         -> svpr(prod)
            Autorizador.SVRS_PROPRIO -> svrs_proprio(prod)
        }
    }

    // ── SVAN — Ambiente Nacional (fazenda.gov.br) ─────────────────────────────

    private fun svan(prod: Boolean) = if (prod) SefazUrls(
        autorizacao       = "https://nfe.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx",
        retAutorizacao    = "https://nfe.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
        consultaProtocolo = "https://nfe.fazenda.gov.br/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx",
        statusServico     = "https://nfe.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx",
        recepcaoEvento    = "https://nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
    ) else SefazUrls(
        autorizacao       = "https://hom.nfe.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx",
        retAutorizacao    = "https://hom.nfe.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
        consultaProtocolo = "https://hom.nfe.fazenda.gov.br/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx",
        statusServico     = "https://hom.nfe.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx",
        recepcaoEvento    = "https://hom.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
    )

    // ── SVRS — Sefaz Virtual do Rio Grande do Sul ─────────────────────────────

    private fun svrs(prod: Boolean) = if (prod) SefazUrls(
        autorizacao       = "https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
        retAutorizacao    = "https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
        consultaProtocolo = "https://nfe.svrs.rs.gov.br/ws/NfeConsulta2/NfeConsulta2.asmx",
        statusServico     = "https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
        recepcaoEvento    = "https://nfe.svrs.rs.gov.br/ws/recepcaoEvento/recepcaoEvento4.asmx",
    ) else SefazUrls(
        autorizacao       = "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
        retAutorizacao    = "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
        consultaProtocolo = "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta2/NfeConsulta2.asmx",
        statusServico     = "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
        recepcaoEvento    = "https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoEvento/recepcaoEvento4.asmx",
    )

    // ── MG ───────────────────────────────────────────────────────────────────

    private fun svmg(prod: Boolean) = if (prod) SefazUrls(
        autorizacao       = "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4",
        retAutorizacao    = "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4",
        consultaProtocolo = "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4",
        statusServico     = "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4",
        recepcaoEvento    = "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4",
    ) else SefazUrls(
        autorizacao       = "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4",
        retAutorizacao    = "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4",
        consultaProtocolo = "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4",
        statusServico     = "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4",
        recepcaoEvento    = "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4",
    )

    // ── SP ───────────────────────────────────────────────────────────────────

    private fun svsp(prod: Boolean) = if (prod) SefazUrls(
        autorizacao       = "https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
        retAutorizacao    = "https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx",
        consultaProtocolo = "https://nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx",
        statusServico     = "https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx",
        recepcaoEvento    = "https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx",
    ) else SefazUrls(
        autorizacao       = "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
        retAutorizacao    = "https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx",
        consultaProtocolo = "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx",
        statusServico     = "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx",
        recepcaoEvento    = "https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx",
    )

    // ── PR ───────────────────────────────────────────────────────────────────

    private fun svpr(prod: Boolean) = if (prod) SefazUrls(
        autorizacao       = "https://nfe.fazenda.pr.gov.br/nfe/NFeAutorizacao4",
        retAutorizacao    = "https://nfe.fazenda.pr.gov.br/nfe/NFeRetAutorizacao4",
        consultaProtocolo = "https://nfe.fazenda.pr.gov.br/nfe/NFeConsultaProtocolo4",
        statusServico     = "https://nfe.fazenda.pr.gov.br/nfe/NFeStatusServico4",
        recepcaoEvento    = "https://nfe.fazenda.pr.gov.br/nfe/NFeRecepcaoEvento4",
    ) else SefazUrls(
        autorizacao       = "https://homologacao.nfe.fazenda.pr.gov.br/nfe/NFeAutorizacao4",
        retAutorizacao    = "https://homologacao.nfe.fazenda.pr.gov.br/nfe/NFeRetAutorizacao4",
        consultaProtocolo = "https://homologacao.nfe.fazenda.pr.gov.br/nfe/NFeConsultaProtocolo4",
        statusServico     = "https://homologacao.nfe.fazenda.pr.gov.br/nfe/NFeStatusServico4",
        recepcaoEvento    = "https://homologacao.nfe.fazenda.pr.gov.br/nfe/NFeRecepcaoEvento4",
    )

    // ── RS (próprio) ─────────────────────────────────────────────────────────

    private fun svrs_proprio(prod: Boolean) = if (prod) SefazUrls(
        autorizacao       = "https://nfe.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
        retAutorizacao    = "https://nfe.sefazrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
        consultaProtocolo = "https://nfe.sefazrs.rs.gov.br/ws/NfeConsulta2/NfeConsulta2.asmx",
        statusServico     = "https://nfe.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
        recepcaoEvento    = "https://nfe.sefazrs.rs.gov.br/ws/recepcaoEvento/recepcaoEvento4.asmx",
    ) else SefazUrls(
        autorizacao       = "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
        retAutorizacao    = "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
        consultaProtocolo = "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeConsulta2/NfeConsulta2.asmx",
        statusServico     = "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
        recepcaoEvento    = "https://nfe-homologacao.sefazrs.rs.gov.br/ws/recepcaoEvento/recepcaoEvento4.asmx",
    )
}
