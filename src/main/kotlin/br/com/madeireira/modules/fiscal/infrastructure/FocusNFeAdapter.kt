package br.com.madeireira.modules.fiscal.infrastructure

import br.com.madeireira.modules.financeiro.domain.model.FormaPagamento
import br.com.madeireira.modules.fiscal.application.NfCancelamentoResult
import br.com.madeireira.modules.fiscal.application.NfEmissaoPort
import br.com.madeireira.modules.fiscal.application.NfEmissaoRequest
import br.com.madeireira.modules.fiscal.application.NfEmissaoResult
import br.com.madeireira.modules.fiscal.domain.model.StatusNf
import io.github.oshai.kotlinlogging.KotlinLogging
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.basicAuth
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.delay
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.UUID

private val log = KotlinLogging.logger {}

/**
 * Adapter real para a API Focus NF-e.
 * Implementa emissão e cancelamento de NF-e via HTTP.
 *
 * Fluxo de emissão:
 *   1. POST /v2/nfe?ref={ref} — envia payload para a SEFAZ via Focus
 *   2. GET  /v2/nfe/{ref}     — polling até status != "processando" (até 30 s)
 *
 * Troca pelo stub: basta não definir FOCUS_NFE_TOKEN no ambiente.
 */
class FocusNFeAdapter(private val config: FocusNFeConfig) : NfEmissaoPort {

    private val json = Json { ignoreUnknownKeys = true }

    private val client = HttpClient(CIO) {
        install(ContentNegotiation) { json(json) }
        engine { requestTimeout = 30_000 }
    }

    // ── Emissão ───────────────────────────────────────────────────────────────

    override suspend fun emitir(request: NfEmissaoRequest): NfEmissaoResult {
        val ref = buildRef(request.vendaId)
        val payload = buildPayload(request)
        log.info { "Focus NF-e: emitindo ref=$ref venda=${request.vendaNumero} ambiente=${config.ambiente}" }

        val postResp = client.post("${config.baseUrl}/nfe") {
            url { parameters.append("ref", ref) }
            contentType(ContentType.Application.Json)
            basicAuth(config.token, "")
            setBody(payload)
        }

        if (!postResp.status.isSuccess() && postResp.status.value != 422) {
            val body = runCatching { postResp.bodyAsText() }.getOrDefault("")
            log.warn { "Focus NF-e: erro HTTP ${postResp.status.value} na emissão — $body" }
            return NfEmissaoResult(
                chaveAcesso    = "",
                protocolo      = "",
                status         = StatusNf.REJEITADA,
                xml            = null,
                motivoRejeicao = "Focus API HTTP ${postResp.status.value}: $body",
            )
        }

        // Polling até SEFAZ retornar autorização ou rejeição
        repeat(15) { attempt ->
            delay(2_000)
            val getResp = client.get("${config.baseUrl}/nfe/$ref") {
                basicAuth(config.token, "")
            }
            val status = runCatching { getResp.body<FocusStatusResponse>() }.getOrElse {
                log.warn { "Focus NF-e: erro ao parsear resposta na tentativa $attempt" }
                return@repeat
            }
            log.debug { "Focus NF-e: poll $attempt status=${status.status}" }

            if (status.status != "processando") {
                return mapEmissaoResult(status)
            }
        }

        log.warn { "Focus NF-e: timeout aguardando processamento SEFAZ ref=$ref" }
        return NfEmissaoResult(
            chaveAcesso    = "",
            protocolo      = "",
            status         = StatusNf.AGUARDANDO,
            xml            = null,
            motivoRejeicao = "Timeout: NF em processamento na SEFAZ. Consulte novamente.",
        )
    }

    // ── Cancelamento ─────────────────────────────────────────────────────────

    override suspend fun cancelar(vendaId: UUID, chaveAcesso: String, justificativa: String): NfCancelamentoResult {
        val ref = buildRef(vendaId)
        log.info { "Focus NF-e: cancelando ref=$ref chave=${chaveAcesso.take(8)}…" }

        val resp = client.delete("${config.baseUrl}/nfe/$ref") {
            basicAuth(config.token, "")
            contentType(ContentType.Application.Json)
            setBody(FocusCancelBody(justificativa))
        }

        val body = runCatching { resp.body<FocusStatusResponse>() }.getOrElse {
            return NfCancelamentoResult(protocolo = "", status = StatusNf.CANCELADA, xml = null)
        }

        return NfCancelamentoResult(
            protocolo = body.protocolo_cancelamento ?: body.protocolo ?: "",
            status    = if (body.status == "cancelado") StatusNf.CANCELADA else StatusNf.AUTORIZADA,
            xml       = null,
        )
    }

    // ── Payload builder ───────────────────────────────────────────────────────

    private fun buildPayload(request: NfEmissaoRequest): FocusNfePayload {
        val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX")
        val dataEmissao = request.dataEmissao.atZone(ZoneId.of("America/Sao_Paulo")).format(formatter)

        val items = request.itens.mapIndexed { idx, item ->
            val qtd   = item.quantidadeComercial.toBigDecimalOrNull()?.toDouble() ?: 0.0
            val vUnit = item.valorUnitario.toBigDecimalOrNull()?.toDouble() ?: 0.0
            FocusItem(
                numero_item                   = idx + 1,
                codigo_produto                = item.codigoProduto,
                descricao                     = item.descricao.uppercase(),
                codigo_ncm                    = item.ncm.replace(Regex("[^0-9]"), "").padStart(8, '0'),
                cfop                          = config.cfopPadrao,
                unidade_comercial             = item.unidadeComercial.uppercase(),
                quantidade_comercial          = qtd,
                valor_unitario_comercial      = vUnit,
                valor_unitario_tributavel     = vUnit,
                quantidade_tributavel         = qtd,
                unidade_tributavel            = item.unidadeComercial.uppercase(),
                valor_bruto                   = (qtd * vUnit * 100).toLong().toDouble() / 100, // arredonda centavos
                // Simples Nacional — CSOSN 102: tributado sem direito a crédito
                icms_situacao_tributaria      = "102",
                icms_modalidade_base_calculo  = 3,
                pis_situacao_tributaria       = "07",   // operação isenta de contribuição
                cofins_situacao_tributaria    = "07",
            )
        }

        val cpfDestinatario  = request.clienteCpfCnpj?.takeIf { it.length == 11 }
        val cnpjDestinatario = request.clienteCpfCnpj?.takeIf { it.length == 14 }

        return FocusNfePayload(
            cnpj_emitente                               = config.cnpjEmitente,
            natureza_operacao                           = "Venda de mercadoria",
            data_emissao                                = dataEmissao,
            data_entrada_saida                          = dataEmissao,
            consumidor_final                            = 1,
            presenca_comprador                          = 1,
            nome_destinatario                           = request.clienteNome?.uppercase(),
            cpf_destinatario                            = cpfDestinatario,
            cnpj_destinatario                           = cnpjDestinatario,
            indicador_inscricao_estadual_destinatario   = if (request.clienteCpfCnpj != null) 9 else null,
            items                                       = items,
            formas_pagamento                            = listOf(
                FocusPagamento(
                    forma_pagamento  = mapFormaPagamento(request.formaPagamento),
                    valor_pagamento  = request.valorTotal.toDouble(),
                )
            ),
        )
    }

    private fun mapFormaPagamento(fp: FormaPagamento?): String = when (fp) {
        FormaPagamento.DINHEIRO       -> "01"
        FormaPagamento.CHEQUE         -> "02"
        FormaPagamento.CARTAO_CREDITO -> "03"
        FormaPagamento.CARTAO_DEBITO  -> "04"
        FormaPagamento.BOLETO         -> "15"
        FormaPagamento.PIX            -> "17"
        FormaPagamento.FIADO, null    -> "99"
    }

    private fun mapEmissaoResult(r: FocusStatusResponse): NfEmissaoResult = when (r.status) {
        "autorizado" -> NfEmissaoResult(
            chaveAcesso    = r.chave_nfe ?: "",
            protocolo      = r.protocolo ?: "",
            status         = StatusNf.AUTORIZADA,
            xml            = null,
            motivoRejeicao = null,
        )
        "denegado" -> NfEmissaoResult(
            chaveAcesso    = r.chave_nfe ?: "",
            protocolo      = "",
            status         = StatusNf.DENEGADA,
            xml            = null,
            motivoRejeicao = r.mensagem_sefaz ?: "Denegada pela SEFAZ",
        )
        else -> NfEmissaoResult(
            chaveAcesso    = "",
            protocolo      = "",
            status         = StatusNf.REJEITADA,
            xml            = null,
            motivoRejeicao = r.erros?.joinToString("; ") { "[${it.codigo}] ${it.mensagem}" }
                ?: r.mensagem_sefaz
                ?: "Rejeitada pela SEFAZ",
        )
    }

    private fun buildRef(vendaId: UUID) = "NF-$vendaId"
}

// ── DTOs internos (Focus API) ─────────────────────────────────────────────────

@Serializable
private data class FocusNfePayload(
    val cnpj_emitente: String,
    val natureza_operacao: String,
    val data_emissao: String,
    val data_entrada_saida: String,
    val tipo_documento: Int = 1,            // 1 = saída
    val finalidade_emissao: Int = 1,        // 1 = normal
    val consumidor_final: Int,
    val presenca_comprador: Int,
    val modalidade_frete: Int = 9,          // 9 = sem frete
    val nome_destinatario: String? = null,
    val cpf_destinatario: String? = null,
    val cnpj_destinatario: String? = null,
    val indicador_inscricao_estadual_destinatario: Int? = null,
    val items: List<FocusItem>,
    val formas_pagamento: List<FocusPagamento>,
)

@Serializable
private data class FocusItem(
    val numero_item: Int,
    val codigo_produto: String,
    val descricao: String,
    val codigo_ncm: String,
    val cfop: String,
    val unidade_comercial: String,
    val quantidade_comercial: Double,
    val valor_unitario_comercial: Double,
    val valor_unitario_tributavel: Double,
    val quantidade_tributavel: Double,
    val unidade_tributavel: String,
    val codigo_barras_comercial: String = "SEM GTIN",
    val valor_bruto: Double,
    val icms_situacao_tributaria: String,
    val icms_modalidade_base_calculo: Int,
    val pis_situacao_tributaria: String,
    val cofins_situacao_tributaria: String,
)

@Serializable
private data class FocusPagamento(
    val forma_pagamento: String,
    val valor_pagamento: Double,
)

@Serializable
private data class FocusCancelBody(
    val justificativa: String,
)

@Serializable
private data class FocusStatusResponse(
    val status: String,
    val chave_nfe: String? = null,
    val protocolo: String? = null,
    val mensagem_sefaz: String? = null,
    val protocolo_cancelamento: String? = null,
    val erros: List<FocusErro>? = null,
)

@Serializable
private data class FocusErro(
    val codigo: String? = null,
    val mensagem: String? = null,
)
