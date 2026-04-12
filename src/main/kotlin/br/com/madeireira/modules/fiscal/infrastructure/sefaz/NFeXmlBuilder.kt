package br.com.madeireira.modules.fiscal.infrastructure.sefaz

import br.com.madeireira.modules.financeiro.domain.model.FormaPagamento
import br.com.madeireira.modules.fiscal.application.ImpostoCalculator
import br.com.madeireira.modules.fiscal.application.NfEmissaoRequest
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

/**
 * Constrói o XML unsigned de uma NF-e 4.0 (modelo 55) para emissão direta na SEFAZ.
 *
 * Suporte a:
 *   - Simples Nacional — CSOSN 102 (tributado sem direito a crédito de ICMS)
 *   - PIS/COFINS CST 07 (operação isenta de contribuição)
 *   - Emissão síncrona (indSinc=1) — resposta imediata da SEFAZ
 *
 * Referência: Nota Técnica 2021.001 v1.40 — Schema nfe_v4.00.xsd
 */
object NFeXmlBuilder {

    private val SP_ZONE   = ZoneId.of("America/Sao_Paulo")
    private val DATETIME_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX")
    private val DATE_FMT     = DateTimeFormatter.ofPattern("yyyy-MM-dd")

    /**
     * Monta o XML da NF-e sem assinatura.
     * O resultado deve ser assinado por [NFeXmlSigner] antes do envio à SEFAZ.
     *
     * @param request   dados da emissão (itens, cliente, totais)
     * @param config    configuração do emitente
     * @param chave     chave de acesso de 44 dígitos (gerada por [NFeChaveAcessoBuilder])
     * @param numero    número sequencial da NF-e
     * @return string XML (UTF-8), sem declaração XML, pronta para assinatura
     */
    fun build(
        request: NfEmissaoRequest,
        config: SefazEmissorConfig,
        chave: String,
        numero: Int,
    ): String {
        require(chave.length == 44) { "Chave de acesso deve ter 44 dígitos" }

        val dataEmissao = request.dataEmissao.atZone(SP_ZONE)
        val nfId        = "NFe$chave"

        // ── Cálculos fiscais ────────────────────────────────────────────────────
        val itensCalc = request.itens.map { item ->
            val vBruto = ImpostoCalculator.valorBrutoItem(item.quantidadeComercial, item.valorUnitario)
            item to vBruto
        }
        val vProd = ImpostoCalculator.valorTotalItens(itensCalc.map { it.second })
        val vNF   = vProd   // sem frete, desconto ou outros encargos no leiaute atual

        // ── Ambiente ────────────────────────────────────────────────────────────
        val tpAmb = if (config.producao) "1" else "2"
        val natOp = if (config.producao) "Venda de mercadoria" else "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL"

        // ── CRT — Código de Regime Tributário ───────────────────────────────────
        val crt = when (config.regimeTributario.uppercase()) {
            "SIMPLES" -> "1"
            "LUCRO_PRESUMIDO" -> "3"
            "LUCRO_REAL" -> "3"
            else -> "1"
        }

        val sb = StringBuilder()
        sb.append("""<NFe xmlns="http://www.portalfiscal.inf.br/nfe">""")
        sb.append("""<infNFe versao="4.00" Id="$nfId">""")

        // ── ide ─────────────────────────────────────────────────────────────────
        sb.append("<ide>")
        sb.append("<cUF>${SefazUrlRouter.UF_CODIGO[config.uf.uppercase()] ?: "35"}</cUF>")
        sb.append("<cNF>${chave.substring(35, 43)}</cNF>")
        sb.append("<natOp>$natOp</natOp>")
        sb.append("<mod>55</mod>")
        sb.append("<serie>${config.serieNfe.padStart(3, '0')}</serie>")
        sb.append("<nNF>$numero</nNF>")
        sb.append("<dhEmi>${dataEmissao.format(DATETIME_FMT)}</dhEmi>")
        sb.append("<dhSaiEnt>${dataEmissao.format(DATETIME_FMT)}</dhSaiEnt>")
        sb.append("<tpNF>1</tpNF>")          // 1 = saída
        sb.append("<idDest>1</idDest>")       // 1 = operação interna
        sb.append("<cMunFG>${config.codigoMunicipioIbge ?: "9999999"}</cMunFG>")
        sb.append("<tpImp>1</tpImp>")         // 1 = DANFE retrato
        sb.append("<tpEmis>1</tpEmis>")       // 1 = normal
        sb.append("<cDV>${chave.last()}</cDV>")
        sb.append("<tpAmb>$tpAmb</tpAmb>")
        sb.append("<finNFe>1</finNFe>")       // 1 = NF-e normal
        sb.append("<indFinal>1</indFinal>")   // 1 = consumidor final
        sb.append("<indPres>1</indPres>")     // 1 = operação presencial
        sb.append("<procEmi>0</procEmi>")     // 0 = emissão por aplicativo do contribuinte
        sb.append("<verProc>1.0.0</verProc>")
        sb.append("</ide>")

        // ── emit ────────────────────────────────────────────────────────────────
        sb.append("<emit>")
        sb.append("<CNPJ>${config.cnpj}</CNPJ>")
        config.razaoSocial?.let { sb.append("<xNome>${xmlEscape(it.uppercase())}</xNome>") }
        config.nomeFantasia?.let { sb.append("<xFant>${xmlEscape(it.uppercase())}</xFant>") }
        sb.append("<enderEmit>")
        config.logradouro?.let { sb.append("<xLgr>${xmlEscape(it)}</xLgr>") }
        config.numero?.let     { sb.append("<nro>$it</nro>") }
        config.bairro?.let     { sb.append("<xBairro>${xmlEscape(it)}</xBairro>") }
        sb.append("<cMun>${config.codigoMunicipioIbge ?: "9999999"}</cMun>")
        config.cidade?.let     { sb.append("<xMun>${xmlEscape(it)}</xMun>") }
        sb.append("<UF>${config.uf.uppercase()}</UF>")
        config.cep?.let        { sb.append("<CEP>${it.filter { c -> c.isDigit() }.padStart(8, '0')}</CEP>") }
        sb.append("<cPais>1058</cPais>")
        sb.append("<xPais>Brasil</xPais>")
        sb.append("</enderEmit>")
        config.ie?.let         { sb.append("<IE>${it.filter { c -> c.isDigit() }}</IE>") }
        sb.append("<CRT>$crt</CRT>")
        sb.append("</emit>")

        // ── dest ─────────────────────────────────────────────────────────────────
        sb.append("<dest>")
        val cpfCnpjDest = request.clienteCpfCnpj?.filter { it.isDigit() }
        when {
            cpfCnpjDest?.length == 14 -> sb.append("<CNPJ>$cpfCnpjDest</CNPJ>")
            cpfCnpjDest?.length == 11 -> sb.append("<CPF>$cpfCnpjDest</CPF>")
            else                      -> sb.append("<CPF>00000000000</CPF>")  // consumidor não identificado
        }
        val nomeDestinatario = if (!config.producao) {
            "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL"
        } else {
            request.clienteNome?.uppercase()?.take(60) ?: "CONSUMIDOR NÃO IDENTIFICADO"
        }
        sb.append("<xNome>${xmlEscape(nomeDestinatario)}</xNome>")
        // sem endereço destinatário para consumidor final não identificado
        sb.append("<indIEDest>9</indIEDest>")  // 9 = não contribuinte
        sb.append("</dest>")

        // ── det (itens) ──────────────────────────────────────────────────────────
        itensCalc.forEachIndexed { idx, (item, vBruto) ->
            val nItem  = idx + 1
            val qtdBD  = ImpostoCalculator.parseBD(item.quantidadeComercial, 4)
            val vUnBD  = ImpostoCalculator.parseBD(item.valorUnitario, 4)
            val ncm    = item.ncm.replace(Regex("[^0-9]"), "").padStart(8, '0')

            sb.append("""<det nItem="$nItem">""")
            sb.append("<prod>")
            sb.append("<cProd>${xmlEscape(item.codigoProduto)}</cProd>")
            sb.append("<cEAN>SEM GTIN</cEAN>")
            val descProd = if (!config.producao) "PRODUTO HOMOLOGACAO" else item.descricao.uppercase().take(120)
            sb.append("<xProd>${xmlEscape(descProd)}</xProd>")
            sb.append("<NCM>$ncm</NCM>")
            sb.append("<CFOP>${config.cfopPadrao}</CFOP>")
            sb.append("<uCom>${item.unidadeComercial.uppercase()}</uCom>")
            sb.append("<qCom>${qtdBD.toPlainString()}</qCom>")
            sb.append("<vUnCom>${vUnBD.toPlainString()}</vUnCom>")
            sb.append("<vProd>${vBruto.toPlainString()}</vProd>")
            sb.append("<cEANTrib>SEM GTIN</cEANTrib>")
            sb.append("<uTrib>${item.unidadeComercial.uppercase()}</uTrib>")
            sb.append("<qTrib>${qtdBD.toPlainString()}</qTrib>")
            sb.append("<vUnTrib>${vUnBD.toPlainString()}</vUnTrib>")
            sb.append("<indTot>1</indTot>")
            sb.append("</prod>")

            // imposto — Simples Nacional CSOSN 102
            sb.append("<imposto>")
            sb.append("<ICMS><ICMSSN102>")
            sb.append("<orig>0</orig>")        // 0 = nacional
            sb.append("<CSOSN>102</CSOSN>")
            sb.append("</ICMSSN102></ICMS>")

            sb.append("<PIS><PISAliq>")
            sb.append("<CST>07</CST>")         // 07 = operação isenta de contribuição
            sb.append("<vBC>0.00</vBC>")
            sb.append("<pPIS>0.00</pPIS>")
            sb.append("<vPIS>0.00</vPIS>")
            sb.append("</PISAliq></PIS>")

            sb.append("<COFINS><COFINSAliq>")
            sb.append("<CST>07</CST>")
            sb.append("<vBC>0.00</vBC>")
            sb.append("<pCOFINS>0.00</pCOFINS>")
            sb.append("<vCOFINS>0.00</vCOFINS>")
            sb.append("</COFINSAliq></COFINS>")
            sb.append("</imposto>")
            sb.append("</det>")
        }

        // ── total ────────────────────────────────────────────────────────────────
        sb.append("<total><ICMSTot>")
        sb.append("<vBC>0.00</vBC>")
        sb.append("<vICMS>0.00</vICMS>")
        sb.append("<vICMSDeson>0.00</vICMSDeson>")
        sb.append("<vFCP>0.00</vFCP>")
        sb.append("<vBCST>0.00</vBCST>")
        sb.append("<vST>0.00</vST>")
        sb.append("<vFCPST>0.00</vFCPST>")
        sb.append("<vFCPSTRet>0.00</vFCPSTRet>")
        sb.append("<vProd>${vProd.toPlainString()}</vProd>")
        sb.append("<vFrete>0.00</vFrete>")
        sb.append("<vSeg>0.00</vSeg>")
        sb.append("<vDesc>0.00</vDesc>")
        sb.append("<vII>0.00</vII>")
        sb.append("<vIPI>0.00</vIPI>")
        sb.append("<vIPIDevol>0.00</vIPIDevol>")
        sb.append("<vPIS>0.00</vPIS>")
        sb.append("<vCOFINS>0.00</vCOFINS>")
        sb.append("<vOutro>0.00</vOutro>")
        sb.append("<vNF>${vNF.toPlainString()}</vNF>")
        sb.append("</ICMSTot></total>")

        // ── transp ───────────────────────────────────────────────────────────────
        sb.append("<transp>")
        sb.append("<modFrete>9</modFrete>")    // 9 = sem frete
        sb.append("</transp>")

        // ── pag ──────────────────────────────────────────────────────────────────
        sb.append("<pag>")
        sb.append("<detPag>")
        sb.append("<tPag>${mapFormaPagamento(request.formaPagamento)}</tPag>")
        sb.append("<vPag>${vNF.toPlainString()}</vPag>")
        sb.append("</detPag>")
        sb.append("</pag>")

        sb.append("</infNFe>")
        sb.append("</NFe>")

        return sb.toString()
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun mapFormaPagamento(fp: FormaPagamento?): String = when (fp) {
        FormaPagamento.DINHEIRO       -> "01"
        FormaPagamento.CHEQUE         -> "02"
        FormaPagamento.CARTAO_CREDITO -> "03"
        FormaPagamento.CARTAO_DEBITO  -> "04"
        FormaPagamento.BOLETO         -> "15"
        FormaPagamento.PIX            -> "17"
        FormaPagamento.FIADO, null    -> "99"
    }

    /** Escapa caracteres XML — nunca deixar > < & " ' nos valores. */
    fun xmlEscape(s: String): String = s
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&apos;")
}
