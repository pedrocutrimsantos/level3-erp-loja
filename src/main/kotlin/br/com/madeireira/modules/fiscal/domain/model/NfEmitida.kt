package br.com.madeireira.modules.fiscal.domain.model

import java.time.Instant
import java.util.UUID

enum class StatusNf { PENDENTE, AGUARDANDO, AUTORIZADA, REJEITADA, CANCELADA, DENEGADA, CONTINGENCIA, INUTILIZADA }
enum class ModeloNf  { NF55, NFC65, NFENTRADA }
enum class AmbienteNf { PRODUCAO, HOMOLOGACAO }

data class NfEmitida(
    val id: UUID,
    val vendaId: UUID?,
    val tipoOperacao: String,
    val modelo: ModeloNf,
    val numero: Int,
    val serie: String,
    val chaveAcesso: String?,
    val statusSefaz: StatusNf,
    val ambiente: AmbienteNf,
    val dataEmissao: Instant,
    val dataAutorizacao: Instant?,
    val protocoloAutorizacao: String?,
    val xmlAutorizado: String?,
    val motivoRejeicao: String?,
    val chaveCorrelacao: UUID,
    val tentativasEnvio: Int,
    val justificativaCancel: String?,
    val dataCancelamento: Instant?,
    val protocoloCancelamento: String?,
    val createdAt: Instant,
)
