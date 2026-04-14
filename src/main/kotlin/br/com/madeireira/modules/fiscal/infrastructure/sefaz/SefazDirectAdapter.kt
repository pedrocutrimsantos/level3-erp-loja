package br.com.madeireira.modules.fiscal.infrastructure.sefaz

import br.com.madeireira.modules.fiscal.application.NfCancelamentoResult
import br.com.madeireira.modules.fiscal.application.NfEmissaoPort
import br.com.madeireira.modules.fiscal.application.NfEmissaoRequest
import br.com.madeireira.modules.fiscal.application.NfEmissaoResult
import br.com.madeireira.modules.fiscal.domain.model.StatusNf
import io.github.oshai.kotlinlogging.KotlinLogging
import java.security.KeyStore
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.UUID

private val log = KotlinLogging.logger {}

/**
 * Adapter de emissão NF-e diretamente na SEFAZ — sem intermediário.
 *
 * Fluxo de emissão:
 *   1. Gerar chave de acesso (NFeChaveAcessoBuilder)
 *   2. Construir XML NF-e 4.0 (NFeXmlBuilder)
 *   3. Assinar com certificado A1 (NFeXmlSigner)
 *   4. Enviar via SOAP mTLS para NFeAutorizacao4 (SefazSoapClient)
 *   5. Parsear resposta cStat (SefazResponseParser)
 *   6. Retornar NfEmissaoResult
 *
 * Fluxo de cancelamento:
 *   1. Construir XML de evento 110111 (NFeEventoBuilder)
 *   2. Assinar evento (NFeXmlSigner — referência "#ID110111...")
 *   3. Enviar via SOAP para NFeRecepcaoEvento4
 *   4. Parsear resposta
 *
 * @param config    configuração do emitente (CNPJ, UF, ambiente etc.)
 * @param keyStore  KeyStore PKCS12 com o certificado A1
 * @param senha     senha do KeyStore
 */
class SefazDirectAdapter(
    private val config: SefazEmissorConfig,
    private val keyStore: KeyStore,
    private val senha: CharArray,
) : NfEmissaoPort {

    private val soapClient by lazy { SefazSoapClient(keyStore, senha, config.ambiente) }
    private val urls       by lazy { SefazUrlRouter.resolver(config.uf, config.ambiente) }
    private val cuf        get() = SefazUrlRouter.UF_CODIGO[config.uf.uppercase()] ?: "35"

    // ── Emissão ───────────────────────────────────────────────────────────────

    override suspend fun emitir(request: NfEmissaoRequest): NfEmissaoResult {
        log.info {
            "SefazDirect: emitindo venda=${request.vendaNumero} " +
            "serie=${request.serie} numero=${request.numero} " +
            "ambiente=${config.ambiente}"
        }

        return runCatching {
            val dataEmissao = ZonedDateTime.ofInstant(request.dataEmissao, ZoneId.of("America/Sao_Paulo"))

            // 1. Gerar chave de acesso
            val chave = NFeChaveAcessoBuilder.build(
                uf          = config.uf,
                cnpj        = config.cnpj,
                serie       = request.serie,
                numero      = request.numero,
                dataEmissao = dataEmissao,
            )
            log.debug { "Chave de acesso: $chave" }

            // 2. Construir XML
            val xmlUnsigned = NFeXmlBuilder.build(
                request = request,
                config  = config,
                chave   = chave,
                numero  = request.numero,
            )

            // 3. Assinar
            val xmlSigned = NFeXmlSigner.assinar(xmlUnsigned, keyStore, senha)

            // 4. Enviar à SEFAZ
            val soapResp = soapClient.enviarNfe(
                url        = urls.autorizacao,
                cuf        = cuf,
                xmlSigned  = xmlSigned,
            )

            // 5. Parsear resposta
            val retorno = SefazResponseParser.parseAutorizacao(soapResp)

            when {
                retorno.autorizada || retorno.duplicidade -> {
                    log.info { "NF-e AUTORIZADA chave=$chave nProt=${retorno.nProt}" }
                    NfEmissaoResult(
                        chaveAcesso    = retorno.chNFe ?: chave,
                        protocolo      = retorno.nProt ?: "",
                        status         = StatusNf.AUTORIZADA,
                        xml            = xmlSigned,
                        motivoRejeicao = null,
                    )
                }
                retorno.denegada -> {
                    log.warn { "NF-e DENEGADA cStat=${retorno.cStat} motivo=${retorno.xMotivo}" }
                    NfEmissaoResult(
                        chaveAcesso    = retorno.chNFe ?: chave,
                        protocolo      = "",
                        status         = StatusNf.DENEGADA,
                        xml            = null,
                        motivoRejeicao = "[${retorno.cStat}] ${retorno.xMotivo}",
                    )
                }
                else -> {
                    log.warn { "NF-e REJEITADA cStat=${retorno.cStat} motivo=${retorno.xMotivo}" }
                    NfEmissaoResult(
                        chaveAcesso    = chave,
                        protocolo      = "",
                        status         = StatusNf.REJEITADA,
                        xml            = null,
                        motivoRejeicao = "[${retorno.cStat}] ${retorno.xMotivo}",
                    )
                }
            }
        }.getOrElse { e ->
            log.error(e) { "SefazDirect: erro inesperado na emissão venda=${request.vendaNumero}" }
            NfEmissaoResult(
                chaveAcesso    = "",
                protocolo      = "",
                status         = StatusNf.REJEITADA,
                xml            = null,
                motivoRejeicao = "Erro interno na emissão: ${e.message}",
            )
        }
    }

    // ── Cancelamento ─────────────────────────────────────────────────────────

    override suspend fun cancelar(
        vendaId: UUID,
        chaveAcesso: String,
        justificativa: String,
        nProt: String,
    ): NfCancelamentoResult {
        log.info { "SefazDirect: cancelando chave=${chaveAcesso.take(8)}… justificativa=${justificativa.take(30)}" }

        return runCatching {
            // 1. Construir XML do evento
            val xmlEvento = NFeEventoBuilder.cancelamento(
                chaveAcesso   = chaveAcesso,
                cnpjEmitente  = config.cnpj,
                justificativa = justificativa,
                nProt         = nProt,
                ambiente      = config.ambiente,
            )

            // 2. Assinar o evento (referência ao Id do infEvento)
            val xmlEventoSigned = assinarEvento(xmlEvento)

            // 3. Enviar à SEFAZ
            val soapResp = soapClient.enviarEvento(
                url      = urls.recepcaoEvento,
                cuf      = cuf,
                xmlEvento = xmlEventoSigned,
            )

            // 4. Parsear resposta
            val retorno = SefazResponseParser.parseCancelamento(soapResp)

            if (retorno.cancelado) {
                log.info { "NF-e CANCELADA chave=$chaveAcesso nProt=${retorno.nProt}" }
                NfCancelamentoResult(
                    protocolo = retorno.nProt ?: "",
                    status    = StatusNf.CANCELADA,
                    xml       = xmlEventoSigned,
                )
            } else {
                log.warn { "Cancelamento REJEITADO cStat=${retorno.cStat} motivo=${retorno.xMotivo}" }
                error("Cancelamento rejeitado: [${retorno.cStat}] ${retorno.xMotivo}")
            }
        }.getOrElse { e ->
            log.error(e) { "SefazDirect: erro no cancelamento chave=${chaveAcesso.take(8)}" }
            throw e  // deixa NfeService tratar e não alterar status no banco
        }
    }

    // ── Consulta de status por chave ─────────────────────────────────────────

    /**
     * Consulta status de uma NF-e por chave de acesso (44 dígitos) via NFeConsultaProtocolo4.
     * Implementa [NfEmissaoPort.consultarPorChave] — usado pelo reprocessamento de AGUARDANDO.
     */
    override suspend fun consultarPorChave(chaveAcesso: String): NfEmissaoResult? {
        return runCatching {
            val soapResp = soapClient.consultarProtocolo(
                url          = urls.consultaProtocolo,
                cuf          = cuf,
                chaveAcesso  = chaveAcesso,
            )
            val retorno = SefazResponseParser.parseConsulta(soapResp)

            when {
                retorno.autorizada -> NfEmissaoResult(
                    chaveAcesso    = retorno.chNFe ?: chaveAcesso,
                    protocolo      = retorno.nProt ?: "",
                    status         = StatusNf.AUTORIZADA,
                    xml            = null,
                    motivoRejeicao = null,
                )
                retorno.denegada -> NfEmissaoResult(
                    chaveAcesso    = chaveAcesso,
                    protocolo      = "",
                    status         = StatusNf.DENEGADA,
                    xml            = null,
                    motivoRejeicao = "[${retorno.cStat}] ${retorno.xMotivo}",
                )
                else -> null  // ainda processando ou não encontrada
            }
        }.getOrElse { e ->
            log.warn(e) { "SefazDirect: erro na consulta chave=${chaveAcesso.take(8)}" }
            null
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun assinarEvento(xmlEvento: String): String {
        // O evento tem o infEvento com Id "ID110111..." — o signer precisa reconhecê-lo
        val dbf = javax.xml.parsers.DocumentBuilderFactory.newInstance().apply { isNamespaceAware = true }
        val doc = dbf.newDocumentBuilder()
            .parse(org.xml.sax.InputSource(java.io.StringReader(xmlEvento)))

        val infEventoEl = doc.getElementsByTagNameNS("http://www.portalfiscal.inf.br/nfe", "infEvento").item(0)
            as? org.w3c.dom.Element ?: error("infEvento não encontrado no XML do evento")
        infEventoEl.setIdAttribute("Id", true)

        // Assinar inline via NFeXmlSigner reutilizando a lógica do DOM
        return NFeXmlSigner.assinar(xmlEvento, keyStore, senha)
    }
}
