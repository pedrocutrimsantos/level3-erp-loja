package br.com.madeireira.modules.cliente.domain.model

import java.math.BigDecimal
import java.util.UUID

enum class TipoPessoa { PJ, PF, ANONIMO }
enum class StatusInadimplencia { REGULAR, ALERTA, BLOQUEADO }

data class Cliente(
    val id: UUID,
    val tipoPessoa: TipoPessoa,
    val cnpjCpf: String?,
    val razaoSocial: String,
    val nomeFantasia: String?,
    val email: String?,
    val telefone: String?,
    val limiteCred: BigDecimal,
    val saldoDevedor: BigDecimal,
    val statusInad: StatusInadimplencia,
    val ativo: Boolean,
)
