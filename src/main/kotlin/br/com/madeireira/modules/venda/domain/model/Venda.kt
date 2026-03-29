package br.com.madeireira.modules.venda.domain.model

import br.com.madeireira.modules.financeiro.domain.model.FormaPagamento
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class Venda(
    val id: UUID,
    val numero: String,
    val vendedorId: UUID,
    val depositoId: UUID,
    val clienteId: UUID?,
    val tipo: TipoVenda,
    val status: StatusVenda,
    val valorTotal: BigDecimal,
    val createdAt: Instant,
    val formaPagamento: FormaPagamento? = null,
)
