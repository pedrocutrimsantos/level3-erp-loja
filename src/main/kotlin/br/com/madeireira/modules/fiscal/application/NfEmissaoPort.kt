package br.com.madeireira.modules.fiscal.application

import br.com.madeireira.modules.financeiro.domain.model.FormaPagamento
import br.com.madeireira.modules.fiscal.domain.model.StatusNf
import br.com.madeireira.modules.venda.api.dto.NfItemData
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class NfEmissaoRequest(
    val vendaId: UUID,
    val vendaNumero: String,
    val dataEmissao: Instant,
    val serie: String,
    val numero: Int,
    val itens: List<NfItemData>,
    val valorTotal: BigDecimal,
    val formaPagamento: FormaPagamento? = null,
    val clienteNome: String? = null,
    val clienteCpfCnpj: String? = null,      // apenas dígitos (11=CPF, 14=CNPJ)
)

data class NfEmissaoResult(
    val chaveAcesso: String,
    val protocolo: String,
    val status: StatusNf,
    val xml: String?,
    val motivoRejeicao: String?,
)

data class NfCancelamentoResult(
    val protocolo: String,
    val status: StatusNf,
    val xml: String?,
)

interface NfEmissaoPort {
    suspend fun emitir(request: NfEmissaoRequest): NfEmissaoResult
    suspend fun cancelar(vendaId: UUID, chaveAcesso: String, justificativa: String): NfCancelamentoResult
}
