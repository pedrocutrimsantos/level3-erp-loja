package br.com.madeireira.modules.financeiro.domain.model

import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

data class ParcelaComTitulo(
    val parcelaId: UUID,
    val tituloId: UUID,
    val tituloNumero: String,
    val tipoTitulo: TipoTitulo,
    val clienteId: UUID?,
    val fornecedorId: UUID?,
    val valor: BigDecimal,
    val dataVencimento: LocalDate,
    val statusParcela: StatusParcela,
)
