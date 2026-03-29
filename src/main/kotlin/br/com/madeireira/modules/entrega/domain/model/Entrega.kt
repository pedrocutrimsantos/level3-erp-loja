package br.com.madeireira.modules.entrega.domain.model

import kotlinx.datetime.LocalDate
import java.time.Instant
import java.util.UUID

enum class StatusEntrega { PENDENTE, CONCLUIDA, CANCELADA }

enum class TurnoEntrega { MANHA, TARDE, DIA_TODO }

data class Entrega(
    val id: UUID,
    val vendaId: UUID,
    val numero: String,
    val status: StatusEntrega,
    val observacao: String?,
    val enderecoEntrega: String?,
    val dataAgendada: LocalDate? = null,
    val turno: TurnoEntrega? = null,
    val motorista: String? = null,
    val createdAt: Instant,
    val updatedAt: Instant,
)
