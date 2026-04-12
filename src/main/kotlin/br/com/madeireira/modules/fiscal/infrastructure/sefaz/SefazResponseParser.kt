package br.com.madeireira.modules.fiscal.infrastructure.sefaz

import io.github.oshai.kotlinlogging.KotlinLogging
import org.xml.sax.InputSource
import java.io.StringReader
import javax.xml.parsers.DocumentBuilderFactory
import javax.xml.xpath.XPathConstants
import javax.xml.xpath.XPathFactory

private val log = KotlinLogging.logger {}

/**
 * Parseia a resposta SOAP da SEFAZ (NF-e 4.0).
 *
 * Códigos cStat relevantes (Manual de Integração NF-e 4.00):
 *   100 — Autorizado o uso da NF-e
 *   101 — Cancelamento de NF-e homologado
 *   110 — Uso Denegado
 *   135 — Evento registrado e vinculado a NF-e (cancelamento aceito)
 *   204 — Duplicidade de NF-e (consideramos como autorizada — já existe)
 *   301 — Uso Denegado: irregularidade fiscal do emitente
 *   302 — Uso Denegado: irregularidade fiscal do destinatário
 *   999 — Rejeição — ver xMotivo para detalhe
 *   <100 — Erros de processamento / rejeição
 */
object SefazResponseParser {

    data class RetornoAutorizacao(
        val cStat: String,
        val xMotivo: String,
        val chNFe: String?,
        val nProt: String?,
        val xmlProtocolo: String?,
    ) {
        val autorizada: Boolean   get() = cStat == "100"
        val denegada: Boolean     get() = cStat in setOf("110", "301", "302")
        val duplicidade: Boolean  get() = cStat == "204"
    }

    data class RetornoCancelamento(
        val cStat: String,
        val xMotivo: String,
        val nProt: String?,
    ) {
        val cancelado: Boolean get() = cStat in setOf("101", "135")
    }

    /**
     * Parseia o SOAP body da resposta de NFeAutorizacao4 (envio síncrono).
     */
    fun parseAutorizacao(soap: String): RetornoAutorizacao {
        return try {
            val doc  = parseSoap(soap)
            val xp   = XPathFactory.newInstance().newXPath()

            // Resposta fica em retEnviNFe/infRec (async) ou retEnviNFe/protNFe/infProt (sinc)
            // Com indSinc=1 a SEFAZ retorna diretamente o protNFe
            val cStat   = xp.evaluate("//*[local-name()='infProt']/*[local-name()='cStat']/text()", doc).ifBlank {
                xp.evaluate("//*[local-name()='retEnviNFe']/*[local-name()='cStat']/text()", doc)
            }.trim()

            val xMotivo = xp.evaluate("//*[local-name()='infProt']/*[local-name()='xMotivo']/text()", doc).ifBlank {
                xp.evaluate("//*[local-name()='retEnviNFe']/*[local-name()='xMotivo']/text()", doc)
            }.trim()

            val chNFe   = xp.evaluate("//*[local-name()='infProt']/*[local-name()='chNFe']/text()", doc).trim().ifBlank { null }
            val nProt   = xp.evaluate("//*[local-name()='infProt']/*[local-name()='nProt']/text()", doc).trim().ifBlank { null }

            log.info { "SEFAZ Autorização: cStat=$cStat xMotivo=$xMotivo nProt=$nProt" }

            RetornoAutorizacao(
                cStat        = cStat,
                xMotivo      = xMotivo,
                chNFe        = chNFe,
                nProt        = nProt,
                xmlProtocolo = soap,
            )
        } catch (e: Exception) {
            log.error(e) { "Erro ao parsear resposta de autorização SEFAZ" }
            RetornoAutorizacao(
                cStat        = "999",
                xMotivo      = "Erro ao processar resposta SEFAZ: ${e.message}",
                chNFe        = null,
                nProt        = null,
                xmlProtocolo = null,
            )
        }
    }

    /**
     * Parseia o SOAP body da resposta de NFeRecepcaoEvento4 (cancelamento).
     */
    fun parseCancelamento(soap: String): RetornoCancelamento {
        return try {
            val doc    = parseSoap(soap)
            val xp     = XPathFactory.newInstance().newXPath()

            val cStat   = xp.evaluate("//*[local-name()='infEvento']/*[local-name()='cStat']/text()", doc).trim()
            val xMotivo = xp.evaluate("//*[local-name()='infEvento']/*[local-name()='xMotivo']/text()", doc).trim()
            val nProt   = xp.evaluate("//*[local-name()='infEvento']/*[local-name()='nProt']/text()", doc).trim().ifBlank { null }

            log.info { "SEFAZ Cancelamento: cStat=$cStat xMotivo=$xMotivo nProt=$nProt" }

            RetornoCancelamento(cStat = cStat, xMotivo = xMotivo, nProt = nProt)
        } catch (e: Exception) {
            log.error(e) { "Erro ao parsear resposta de cancelamento SEFAZ" }
            RetornoCancelamento(cStat = "999", xMotivo = "Erro ao processar resposta: ${e.message}", nProt = null)
        }
    }

    /**
     * Parseia o SOAP body de consulta de protocolo (NFeConsultaProtocolo4).
     * Retorna RetornoAutorizacao para reuso do mesmo mapeamento de status.
     */
    fun parseConsulta(soap: String): RetornoAutorizacao {
        return try {
            val doc  = parseSoap(soap)
            val xp   = XPathFactory.newInstance().newXPath()

            val cStat   = xp.evaluate("//*[local-name()='protNFe']/*[local-name()='infProt']/*[local-name()='cStat']/text()", doc).trim().ifBlank {
                xp.evaluate("//*[local-name()='retConsSitNFe']/*[local-name()='cStat']/text()", doc).trim()
            }
            val xMotivo = xp.evaluate("//*[local-name()='protNFe']/*[local-name()='infProt']/*[local-name()='xMotivo']/text()", doc).trim().ifBlank {
                xp.evaluate("//*[local-name()='retConsSitNFe']/*[local-name()='xMotivo']/text()", doc).trim()
            }
            val chNFe   = xp.evaluate("//*[local-name()='infProt']/*[local-name()='chNFe']/text()", doc).trim().ifBlank { null }
            val nProt   = xp.evaluate("//*[local-name()='infProt']/*[local-name()='nProt']/text()", doc).trim().ifBlank { null }

            RetornoAutorizacao(cStat = cStat, xMotivo = xMotivo, chNFe = chNFe, nProt = nProt, xmlProtocolo = soap)
        } catch (e: Exception) {
            log.error(e) { "Erro ao parsear resposta de consulta SEFAZ" }
            RetornoAutorizacao(cStat = "999", xMotivo = "Erro: ${e.message}", chNFe = null, nProt = null, xmlProtocolo = null)
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun parseSoap(soap: String): org.w3c.dom.Document {
        val dbf = DocumentBuilderFactory.newInstance().apply { isNamespaceAware = true }
        return dbf.newDocumentBuilder().parse(InputSource(StringReader(soap)))
    }
}
