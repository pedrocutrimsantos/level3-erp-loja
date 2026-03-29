package br.com.madeireira.modules.fiscal.infrastructure

import br.com.madeireira.modules.fiscal.domain.model.NfEmitida
import br.com.madeireira.modules.fiscal.domain.model.StatusNf
import java.util.UUID

interface NfRepository {
    suspend fun findAll(limit: Int): List<NfEmitida>
    suspend fun findById(id: UUID): NfEmitida?
    suspend fun findByVendaId(vendaId: UUID): NfEmitida?
    suspend fun vendaIdsComNf(excluirStatus: Set<StatusNf>): Set<UUID>
    suspend fun proximoNumero(serie: String): Int
    suspend fun insert(nf: NfEmitida): NfEmitida
    suspend fun update(nf: NfEmitida): NfEmitida
}
