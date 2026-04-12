package br.com.madeireira.modules.fiscal.application

import io.github.oshai.kotlinlogging.KotlinLogging
import org.xml.sax.SAXParseException
import javax.xml.XMLConstants
import javax.xml.transform.stream.StreamSource
import javax.xml.validation.SchemaFactory

private val log = KotlinLogging.logger {}

/**
 * Valida o XML de uma NF-e contra os XSDs oficiais da SEFAZ (NF-e 4.00).
 *
 * Problema mitigado (Risco 4):
 *   Enviar XML malformado à SEFAZ resulta em rejeição com código 891 ou similar.
 *   A validação local detecta o erro antes de consumir o número de NF-e.
 *
 * Os XSDs devem estar em:
 *   src/main/resources/fiscal/xsd/nfe/
 *     nfe_v4.00.xsd          — schema principal
 *     xmldsig-core-schema.xsd — assinaturas XML
 *     leiauteNFe_v4.00.xsd   — leiaute completo (importado pelo principal)
 *
 * Se os XSDs não estiverem presentes no classpath, a validação é ignorada com aviso.
 * Isso mantém o sistema funcional durante o desenvolvimento antes de adicionar os schemas.
 *
 * Fontes dos XSDs: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w=
 */
object NFeXmlValidator {

    private const val XSD_PATH = "/fiscal/xsd/nfe/nfe_v4.00.xsd"

    private val validator by lazy { carregarValidator() }

    /**
     * Valida o XML fornecido. Lança [IllegalArgumentException] se inválido.
     * Não faz nada se os XSDs não estiverem disponíveis no classpath.
     */
    fun validar(xml: String) {
        val v = validator ?: run {
            log.warn { "[NF-e] XSD não encontrado em $XSD_PATH — validação local desabilitada" }
            return
        }

        try {
            v.validate(StreamSource(xml.reader()))
            log.debug { "[NF-e] XML validado com sucesso contra XSD" }
        } catch (e: SAXParseException) {
            val msg = "XML NF-e inválido (linha ${e.lineNumber}, col ${e.columnNumber}): ${e.message}"
            log.warn { msg }
            throw IllegalArgumentException(msg, e)
        }
    }

    private fun carregarValidator() = runCatching {
        val xsdStream = NFeXmlValidator::class.java.getResourceAsStream(XSD_PATH)
            ?: return@runCatching null

        val factory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI).apply {
            // Bloqueia entidades externas — previne XXE
            setProperty(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "")
            setProperty(XMLConstants.ACCESS_EXTERNAL_DTD, "")
        }

        val schema = xsdStream.use { factory.newSchema(StreamSource(it)) }
        schema.newValidator().also {
            log.info { "[NF-e] XSD carregado: $XSD_PATH" }
        }
    }.getOrElse { e ->
        log.warn { "[NF-e] Falha ao carregar XSD ($XSD_PATH): ${e.message}" }
        null
    }
}
