package br.com.madeireira.modules.cobranca.infrastructure

import br.com.madeireira.modules.cobranca.domain.CobrancaLog
import br.com.madeireira.modules.cobranca.domain.ParcelaPendente
import java.time.LocalDate
import java.util.UUID

interface CobrancaRepository {
    /** Parcelas de títulos a receber cujo vencimento cai em um dia da régua em relação a [hoje]. */
    suspend fun findParcelasParaCobranca(hoje: LocalDate): List<ParcelaPendente>

    /** Retorna true se já foi enviada cobrança para essa parcela nesse dia da régua. */
    suspend fun jaEnviouHoje(parcelaId: UUID, reguaDia: Int): Boolean

    /** Persiste o registro de disparo (ENVIADO ou ERRO). */
    suspend fun salvarLog(log: CobrancaLog)

    /** Histórico recente de cobranças enviadas. */
    suspend fun findHistorico(limit: Int = 100): List<CobrancaLog>

    /** Histórico de cobranças de uma parcela específica. */
    suspend fun findHistoricoParcela(parcelaId: UUID): List<CobrancaLog>
}
