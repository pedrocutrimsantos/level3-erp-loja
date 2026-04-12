package br.com.madeireira.modules.fiscal.infrastructure.sefaz

import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

/**
 * Constrói XMLs de eventos NF-e 4.0 (cancelamento, CC-e).
 *
 * Referência: Manual de Integração NF-e 4.00, seção 4.2 — Eventos.
 */
object NFeEventoBuilder {

    private val SP_ZONE      = ZoneId.of("America/Sao_Paulo")
    private val DATETIME_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX")

    /**
     * Constrói o XML de evento de cancelamento (tpEvento 110111).
     * O XML resultante deve ser assinado por [NFeXmlSigner] referenciando o Id do infEvento.
     *
     * @param chaveAcesso    chave de 44 dígitos da NF-e a cancelar
     * @param cnpjEmitente   CNPJ somente dígitos (14)
     * @param justificativa  texto com 15–255 caracteres
     * @param nSeqEvento     número sequencial do evento (1 para 1º cancelamento)
     * @param ambiente       "PRODUCAO" ou "HOMOLOGACAO"
     */
    fun cancelamento(
        chaveAcesso: String,
        cnpjEmitente: String,
        justificativa: String,
        nSeqEvento: Int = 1,
        ambiente: String = "HOMOLOGACAO",
    ): String {
        require(chaveAcesso.length == 44) { "Chave de acesso inválida: $chaveAcesso" }
        require(justificativa.length in 15..255) {
            "Justificativa deve ter entre 15 e 255 caracteres (atual: ${justificativa.length})"
        }

        val tpAmb    = if (ambiente.uppercase() == "PRODUCAO") "1" else "2"
        val dhEvento = ZonedDateTime.now(SP_ZONE).format(DATETIME_FMT)
        val eventoId = "ID110111${chaveAcesso}${nSeqEvento.toString().padStart(2, '0')}"

        return """<envEvento versao="1.00" xmlns="http://www.portalfiscal.inf.br/nfe"><idLote>1</idLote><evento versao="1.00"><infEvento Id="$eventoId"><cOrgao>${chaveAcesso.substring(0, 2)}</cOrgao><tpAmb>$tpAmb</tpAmb><CNPJ>${cnpjEmitente.filter { it.isDigit() }}</CNPJ><chNFe>$chaveAcesso</chNFe><dhEvento>$dhEvento</dhEvento><tpEvento>110111</tpEvento><nSeqEvento>$nSeqEvento</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Cancelamento</descEvento><nProt></nProt><xJust>${NFeXmlBuilder.xmlEscape(justificativa)}</xJust></detEvento></infEvento></evento></envEvento>"""
    }
}
