package br.com.madeireira.modules.fiscal.infrastructure.sefaz

import io.github.oshai.kotlinlogging.KotlinLogging
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.security.KeyStore
import java.security.SecureRandom
import java.time.Duration
import javax.net.ssl.KeyManagerFactory
import javax.net.ssl.SSLContext

private val log = KotlinLogging.logger {}

/**
 * Cliente SOAP 1.2 para os webservices NF-e da SEFAZ.
 *
 * Autenticação mTLS obrigatória: a SEFAZ exige que cada requisição seja
 * acompanhada do certificado A1 do emitente no handshake TLS.
 *
 * Notas de implementação:
 *   - Usa java.net.http.HttpClient (Java 11+) para controle total do SSLContext
 *   - Trust-all TrustManager para ICP-Brasil (CAs governo não estão no cacerts padrão)
 *   - Timeout de 30 s por requisição (SEFAZ recomenda max 30 s para indSinc=1)
 *   - Content-Type: application/soap+xml;charset=utf-8;action="..."  (SOAP 1.2)
 */
class SefazSoapClient(
    private val keyStore: KeyStore,
    private val senha: CharArray,
    private val ambiente: String = "HOMOLOGACAO",
) {

    private val httpClient: HttpClient by lazy { buildHttpClient() }

    /**
     * Envia um lote de NF-e para autorização síncrona (NFeAutorizacao4).
     *
     * @param url       URL do webservice NFeAutorizacao4 para a UF/ambiente
     * @param cuf       código IBGE da UF emitente (2 dígitos)
     * @param xmlSigned XML assinado da NF-e (sem declaração XML)
     * @return corpo da resposta SOAP como string
     */
    fun enviarNfe(url: String, cuf: String, xmlSigned: String): String {
        val envelope = buildEnvioEnvelope(cuf = cuf, xmlSigned = xmlSigned)
        log.debug { "SEFAZ → POST $url (${envelope.length} bytes)" }
        return post(url, action = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote", body = envelope)
    }

    /**
     * Envia evento de cancelamento (NFeRecepcaoEvento4).
     *
     * @param url           URL do webservice NFeRecepcaoEvento4
     * @param cuf           código da UF
     * @param xmlEvento     XML do evento assinado
     */
    fun enviarEvento(url: String, cuf: String, xmlEvento: String): String {
        val envelope = buildEventoEnvelope(cuf = cuf, xmlEvento = xmlEvento)
        log.debug { "SEFAZ → POST evento $url" }
        return post(url, action = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento", body = envelope)
    }

    /**
     * Consulta protocolo de uma NF-e por chave de acesso (NFeConsultaProtocolo4).
     */
    fun consultarProtocolo(url: String, cuf: String, chaveAcesso: String): String {
        val envelope = buildConsultaEnvelope(cuf = cuf, chaveAcesso = chaveAcesso)
        log.debug { "SEFAZ → POST consulta $url chave=${chaveAcesso.take(8)}…" }
        return post(url, action = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF", body = envelope)
    }

    // ── Envelopes SOAP 1.2 ────────────────────────────────────────────────────

    private fun buildEnvioEnvelope(cuf: String, xmlSigned: String): String = """
        <soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"
                         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                         xmlns:xsd="http://www.w3.org/2001/XMLSchema">
          <soap12:Header>
            <nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
              <cUF>$cuf</cUF>
              <versaoDados>4.00</versaoDados>
            </nfeCabecMsg>
          </soap12:Header>
          <soap12:Body>
            <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
              <enviNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
                <idLote>1</idLote>
                <indSinc>1</indSinc>
                $xmlSigned
              </enviNFe>
            </nfeDadosMsg>
          </soap12:Body>
        </soap12:Envelope>
    """.trimIndent()

    private fun buildEventoEnvelope(cuf: String, xmlEvento: String): String = """
        <soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"
                         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                         xmlns:xsd="http://www.w3.org/2001/XMLSchema">
          <soap12:Header>
            <nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">
              <cUF>$cuf</cUF>
              <versaoDados>1.00</versaoDados>
            </nfeCabecMsg>
          </soap12:Header>
          <soap12:Body>
            <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">
              $xmlEvento
            </nfeDadosMsg>
          </soap12:Body>
        </soap12:Envelope>
    """.trimIndent()

    private fun buildConsultaEnvelope(cuf: String, chaveAcesso: String): String {
        val tpAmb = if (ambiente.uppercase() == "PRODUCAO") "1" else "2"
        return """
        <soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"
                         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                         xmlns:xsd="http://www.w3.org/2001/XMLSchema">
          <soap12:Header>
            <nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4">
              <cUF>$cuf</cUF>
              <versaoDados>4.00</versaoDados>
            </nfeCabecMsg>
          </soap12:Header>
          <soap12:Body>
            <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4">
              <consSitNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
                <tpAmb>$tpAmb</tpAmb>
                <xServ>CONSULTAR</xServ>
                <chNFe>$chaveAcesso</chNFe>
              </consSitNFe>
            </nfeDadosMsg>
          </soap12:Body>
        </soap12:Envelope>
    """.trimIndent()
    }

    // ── HTTP ─────────────────────────────────────────────────────────────────

    private fun post(url: String, action: String, body: String): String {
        val request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .timeout(Duration.ofSeconds(30))
            .header("Content-Type", "application/soap+xml;charset=utf-8;action=\"$action\"")
            .POST(HttpRequest.BodyPublishers.ofString(body, Charsets.UTF_8))
            .build()

        val response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(Charsets.UTF_8))
        log.debug { "SEFAZ ← HTTP ${response.statusCode()} (${response.body().length} bytes)" }

        if (response.statusCode() !in 200..299) {
            log.warn { "SEFAZ HTTP ${response.statusCode()}: ${response.body().take(500)}" }
            error("SEFAZ retornou HTTP ${response.statusCode()}")
        }

        return response.body()
    }

    // ── mTLS setup ───────────────────────────────────────────────────────────

    private fun buildHttpClient(): HttpClient {
        val kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm())
        kmf.init(keyStore, senha)

        // Carrega cadeia ICP-Brasil (CAs raiz da SEFAZ não estão no cacerts padrão da JVM).
        // Em produção configure ICP_BRASIL_TRUSTSTORE_PATH. Ver IcpBrasilTrustManager.kt.
        val trustManagers = IcpBrasilTrustManager.carregar(ambiente)

        val sslCtx = SSLContext.getInstance("TLS")
        sslCtx.init(kmf.keyManagers, trustManagers, SecureRandom())

        return HttpClient.newBuilder()
            .sslContext(sslCtx)
            .connectTimeout(Duration.ofSeconds(15))
            .build()
    }
}
