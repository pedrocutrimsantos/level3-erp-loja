package br.com.madeireira.modules.financeiro.domain.model

import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class TituloFinanceiro(
    val id: UUID,
    val numero: String,
    val descricao: String? = null,
    val tipo: TipoTitulo,
    val vendaId: UUID?,
    val compraId: UUID?,
    val clienteId: UUID?,
    val fornecedorId: UUID?,
    val categoria: String? = null,
    val valorOriginal: BigDecimal,
    val valorPago: BigDecimal,
    val status: StatusTitulo,
    val dataEmissao: LocalDate,
    val createdAt: Instant,
)

data class ParcelaFinanceira(
    val id: UUID,
    val tituloId: UUID,
    val numeroParcela: Int,
    val valor: BigDecimal,
    val dataVencimento: LocalDate,
    val dataPagamento: LocalDate?,
    val valorPago: BigDecimal?,
    val formaPagamento: FormaPagamento?,
    val status: StatusParcela,
)
