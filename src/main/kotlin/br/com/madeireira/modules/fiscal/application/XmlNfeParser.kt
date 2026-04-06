package br.com.madeireira.modules.fiscal.application

import br.com.madeireira.modules.fiscal.api.dto.NfeXmlItemPreview
import br.com.madeireira.modules.fiscal.api.dto.NfeXmlPreviewResponse
import org.w3c.dom.Element
import javax.xml.parsers.DocumentBuilderFactory

object XmlNfeParser {

    fun parse(xmlBytes: ByteArray): NfeXmlPreviewResponse {
        val factory = DocumentBuilderFactory.newInstance().apply {
            isNamespaceAware = false
            // Bloqueia XXE (XML External Entity)
            setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)
        }
        val doc = factory.newDocumentBuilder().parse(xmlBytes.inputStream())
        doc.documentElement.normalize()

        fun tag(parent: Element, name: String): String =
            parent.getElementsByTagName(name).item(0)?.textContent?.trim() ?: ""

        fun tagOrNull(parent: Element, name: String): String? =
            parent.getElementsByTagName(name).item(0)?.textContent?.trim()?.takeIf { it.isNotBlank() }

        val root = doc.documentElement

        // Suporta tanto nfeProc (NF-e + protocolo) quanto NFe isolado
        val infNFe = root.getElementsByTagName("infNFe").item(0) as Element
        val emit   = infNFe.getElementsByTagName("emit").item(0) as Element
        val ide    = infNFe.getElementsByTagName("ide").item(0) as Element
        val icmsTot = infNFe.getElementsByTagName("ICMSTot").item(0) as? Element

        val chaveAcesso  = tagOrNull(root, "chNFe")
        val protocolo    = tagOrNull(root, "nProt")
        // NF-e versão 3.x usa dEmi; versão 4.x usa dhEmi
        val dataEmissao  = tag(ide, "dhEmi").ifBlank { tag(ide, "dEmi") }
        val emitenteCnpj = tagOrNull(emit, "CNPJ") ?: tagOrNull(emit, "CPF") ?: ""
        val emitenteNome = tag(emit, "xNome")
        val valorTotal   = icmsTot?.let { tag(it, "vNF") } ?: "0"

        val detNodes = infNFe.getElementsByTagName("det")
        val itens = (0 until detNodes.length).map { i ->
            val det  = detNodes.item(i) as Element
            val prod = det.getElementsByTagName("prod").item(0) as Element
            NfeXmlItemPreview(
                numeroItem       = i + 1,
                codigoFornecedor = tag(prod, "cProd"),
                descricao        = tag(prod, "xProd"),
                ncm              = tag(prod, "NCM"),
                cfop             = tag(prod, "CFOP"),
                unidade          = tag(prod, "uCom"),
                quantidade       = tag(prod, "qCom"),
                valorUnitario    = tag(prod, "vUnCom"),
                valorTotal       = tag(prod, "vProd"),
            )
        }

        return NfeXmlPreviewResponse(
            chaveAcesso  = chaveAcesso,
            protocolo    = protocolo,
            dataEmissao  = dataEmissao,
            emitenteCnpj = emitenteCnpj,
            emitenteNome = emitenteNome,
            valorTotal   = valorTotal,
            itens        = itens,
        )
    }
}
