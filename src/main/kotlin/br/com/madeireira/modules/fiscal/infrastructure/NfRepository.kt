package br.com.madeireira.modules.fiscal.infrastructure

import br.com.madeireira.modules.fiscal.api.dto.DanfeResponse
import br.com.madeireira.modules.fiscal.domain.model.NfEmitida
import br.com.madeireira.modules.fiscal.domain.model.StatusNf
import java.math.BigDecimal
import java.util.UUID

/** Dados necessários para gravar um item de NF-e na tabela `nf_item`. */
data class NfItemParaInserir(
    val nfId:                   UUID,
    val itemVendaId:            UUID,
    val numeroItem:             Int,
    val codigoProduto:          String,
    val descricao:              String,
    val ncm:                    String,
    val cfop:                   String,
    val unidadeComercial:       String,
    val quantidadeComercial:    BigDecimal,
    val valorUnitarioComercial: BigDecimal,
    val valorTotal:             BigDecimal,
)

interface NfRepository {
    suspend fun findAll(limit: Int): List<NfEmitida>
    suspend fun findById(id: UUID): NfEmitida?
    suspend fun findByVendaId(vendaId: UUID): NfEmitida?
    suspend fun vendaIdsComNf(excluirStatus: Set<StatusNf>): Set<UUID>
    suspend fun proximoNumero(serie: String): Int
    suspend fun insert(nf: NfEmitida): NfEmitida
    suspend fun update(nf: NfEmitida): NfEmitida
    suspend fun getDanfeData(nfId: UUID): DanfeResponse?

    /** Grava os itens da NF-e em `nf_item` (necessário para SPED EFD Bloco C). */
    suspend fun insertItens(itens: List<NfItemParaInserir>)
}
