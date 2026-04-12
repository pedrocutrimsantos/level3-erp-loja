package br.com.madeireira.modules.fiscal.infrastructure.sefaz

import java.io.StringReader
import java.io.StringWriter
import java.security.KeyStore
import java.security.PrivateKey
import java.security.cert.X509Certificate
import java.util.Collections
import javax.xml.crypto.dsig.*
import javax.xml.crypto.dsig.dom.DOMSignContext
import javax.xml.crypto.dsig.keyinfo.KeyInfoFactory
import javax.xml.crypto.dsig.spec.C14NMethodParameterSpec
import javax.xml.crypto.dsig.spec.TransformParameterSpec
import javax.xml.parsers.DocumentBuilderFactory
import javax.xml.transform.TransformerFactory
import javax.xml.transform.dom.DOMSource
import javax.xml.transform.stream.StreamResult
import org.xml.sax.InputSource

/**
 * Assina um XML de NF-e 4.0 com o certificado A1 (PKCS#12) do emitente.
 *
 * Algoritmos exigidos pela SEFAZ (NT 2021.001):
 *   - Digest:    SHA-1 (http://www.w3.org/2000/09/xmldsig#sha1)
 *   - Signature: RSA-SHA1 (http://www.w3.org/2000/09/xmldsig#rsa-sha1)
 *   - C14N:      Exclusive (http://www.w3.org/2001/10/xml-exc-c14n#)
 *   - Transform: Enveloped (http://www.w3.org/2000/09/xmldsig#enveloped-signature)
 *
 * Referência: Manual de Integração — Contribuinte NF-e 4.00, seção 5.2
 */
object NFeXmlSigner {

    /**
     * Assina o XML da NF-e em memória e retorna o XML assinado como string.
     *
     * @param xml       XML sem assinatura produzido por [NFeXmlBuilder]
     * @param keyStore  KeyStore PKCS12 com o certificado A1
     * @param senha     senha do KeyStore (mesma usada em KeyStore.load)
     * @return XML assinado com elemento <Signature> dentro de <infNFe>
     */
    fun assinar(xml: String, keyStore: KeyStore, senha: CharArray): String {
        val alias      = keyStore.aliases().asSequence().first()
        val privateKey = keyStore.getKey(alias, senha) as PrivateKey
        val cert       = keyStore.getCertificate(alias) as X509Certificate

        // ── Parsear XML para DOM ─────────────────────────────────────────────────
        val dbf = DocumentBuilderFactory.newInstance().apply { isNamespaceAware = true }
        val doc = dbf.newDocumentBuilder()
            .parse(InputSource(StringReader(xml)))

        // CRÍTICO: setar o atributo Id do elemento infNFe como XML ID para que a referência
        // "#NFe{44chars}" seja resolvida corretamente pelo XMLSignature engine.
        val infNFeEl = doc.getElementsByTagNameNS("http://www.portalfiscal.inf.br/nfe", "infNFe").item(0)
            ?: error("Elemento infNFe não encontrado no XML")
        (infNFeEl as org.w3c.dom.Element).setIdAttribute("Id", true)

        val nfeId = infNFeEl.getAttribute("Id")
        require(nfeId.startsWith("NFe") && nfeId.length == 47) {
            "Id do infNFe inválido: '$nfeId' — deve ser 'NFe' + 44 dígitos"
        }

        // ── Montar assinatura XML-DSig ───────────────────────────────────────────
        val fac = XMLSignatureFactory.getInstance("DOM")

        val ref = fac.newReference(
            "#$nfeId",
            fac.newDigestMethod(DigestMethod.SHA1, null),
            listOf(
                fac.newTransform(Transform.ENVELOPED, null as TransformParameterSpec?),
                fac.newTransform("http://www.w3.org/TR/2001/REC-xml-c14n-20010315", null as TransformParameterSpec?),
            ),
            null, null,
        )

        val signedInfo = fac.newSignedInfo(
            fac.newCanonicalizationMethod(
                CanonicalizationMethod.INCLUSIVE,
                null as C14NMethodParameterSpec?,
            ),
            fac.newSignatureMethod(SignatureMethod.RSA_SHA1, null),
            Collections.singletonList(ref),
        )

        val kif      = fac.keyInfoFactory
        val x509Data = kif.newX509Data(listOf(cert))
        val keyInfo  = kif.newKeyInfo(listOf(x509Data))

        val sig = fac.newXMLSignature(signedInfo, keyInfo)

        // Assinar — a assinatura é inserida como filho do elemento raiz (NFe)
        val signContext = DOMSignContext(privateKey, doc.documentElement)
        sig.sign(signContext)

        // ── Serializar de volta para string ──────────────────────────────────────
        val sw = StringWriter()
        TransformerFactory.newInstance()
            .newTransformer()
            .transform(DOMSource(doc), StreamResult(sw))

        // Remover declaração XML <?xml version="1.0" encoding="UTF-8"?>
        // SEFAZ exige XML sem a declaração dentro do SOAP body
        return sw.toString()
            .removePrefix("""<?xml version="1.0" encoding="UTF-8"?>""")
            .removePrefix("""<?xml version="1.0" encoding="UTF-8" standalone="no"?>""")
            .trim()
    }
}
