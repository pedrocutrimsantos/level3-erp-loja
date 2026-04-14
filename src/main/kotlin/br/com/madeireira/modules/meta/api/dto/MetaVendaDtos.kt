package br.com.madeireira.modules.meta.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class SalvarMetaDto(
    val metaFaturamento: String,   // BigDecimal serializado como String
)

@Serializable
data class MetaVendaResponse(
    val id: String,
    val vendedorId: String,
    val vendedorNome: String,
    val ano: Int,
    val mes: Int,
    val metaFaturamento: String,
)

@Serializable
data class DesempenhoVendedorItem(
    val vendedorId: String,
    val vendedorNome: String,
    val metaFaturamento: String?,      // null = sem meta definida
    val realizadoFaturamento: String,
    val percentualAtingido: String?,   // null = sem meta
    val totalVendas: Int,
    val ticketMedio: String,
    val totalM3: String,
    val totalMetrosLineares: String,
    val temMeta: Boolean,
)

@Serializable
data class DesempenhoResponse(
    val ano: Int,
    val mes: Int,
    val itens: List<DesempenhoVendedorItem>,
    val totalFaturamento: String,
    val totalMeta: String,
    val percentualGeralAtingido: String?,
)
