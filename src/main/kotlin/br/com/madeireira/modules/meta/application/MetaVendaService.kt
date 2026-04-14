package br.com.madeireira.modules.meta.application

import br.com.madeireira.infrastructure.database.DatabaseConfig.dbQuery
import br.com.madeireira.modules.meta.api.dto.DesempenhoResponse
import br.com.madeireira.modules.meta.api.dto.DesempenhoVendedorItem
import br.com.madeireira.modules.meta.api.dto.MetaVendaResponse
import br.com.madeireira.modules.meta.api.dto.SalvarMetaDto
import br.com.madeireira.modules.produto.domain.model.TipoProduto
import br.com.madeireira.modules.venda.domain.model.StatusVenda
import br.com.madeireira.modules.venda.infrastructure.ItemVendaTable
import br.com.madeireira.modules.venda.infrastructure.VendaTable
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.kotlin.datetime.timestamp
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID

// ── Tabelas locais ────────────────────────────────────────────────────────────

private object MetaVendaTable : Table("meta_venda") {
    val id               = uuid("id").autoGenerate()
    val vendedorId       = uuid("vendedor_id")
    val ano              = integer("ano")
    val mes              = integer("mes")
    val metaFaturamento  = decimal("meta_faturamento", 14, 2)
    val criadoPor        = uuid("criado_por").nullable()
    val criadoEm         = timestamp("criado_em")
    val atualizadoEm     = timestamp("atualizado_em")
    override val primaryKey = PrimaryKey(id)
}

private object UsuarioVendedorTable : Table("usuario") {
    val id       = uuid("id")
    val nome     = varchar("nome", 120)
    val vendedor = bool("vendedor")
    val ativo    = bool("ativo")
}

// ── Service ───────────────────────────────────────────────────────────────────

class MetaVendaService {

    /** Upsert: cria ou substitui a meta do vendedor para o mês/ano. */
    suspend fun salvar(
        vendedorId: UUID,
        ano: Int,
        mes: Int,
        dto: SalvarMetaDto,
        criadoPor: UUID?,
    ): MetaVendaResponse = dbQuery {
        val meta = BigDecimal(dto.metaFaturamento)
        require(meta > BigDecimal.ZERO) { "Meta deve ser maior que zero" }

        val existente = MetaVendaTable
            .select { (MetaVendaTable.vendedorId eq vendedorId) and
                      (MetaVendaTable.ano eq ano) and
                      (MetaVendaTable.mes eq mes) }
            .singleOrNull()

        val id: UUID
        if (existente != null) {
            id = existente[MetaVendaTable.id]
            MetaVendaTable.update({
                (MetaVendaTable.vendedorId eq vendedorId) and
                (MetaVendaTable.ano eq ano) and
                (MetaVendaTable.mes eq mes)
            }) {
                it[metaFaturamento] = meta
                it[atualizadoEm]   = kotlinx.datetime.Clock.System.now()
            }
        } else {
            id = MetaVendaTable.insert {
                it[MetaVendaTable.vendedorId]      = vendedorId
                it[MetaVendaTable.ano]             = ano
                it[MetaVendaTable.mes]             = mes
                it[MetaVendaTable.metaFaturamento] = meta
                it[MetaVendaTable.criadoPor]       = criadoPor
                it[MetaVendaTable.criadoEm]        = kotlinx.datetime.Clock.System.now()
                it[MetaVendaTable.atualizadoEm]    = kotlinx.datetime.Clock.System.now()
            } get MetaVendaTable.id
        }

        val nomeVendedor = UsuarioVendedorTable
            .select { UsuarioVendedorTable.id eq vendedorId }
            .single()[UsuarioVendedorTable.nome]

        MetaVendaResponse(
            id               = id.toString(),
            vendedorId       = vendedorId.toString(),
            vendedorNome     = nomeVendedor,
            ano              = ano,
            mes              = mes,
            metaFaturamento  = meta.toPlainString(),
        )
    }

    /** Remove meta de um vendedor para o mês/ano. */
    suspend fun remover(vendedorId: UUID, ano: Int, mes: Int): Unit = dbQuery {
        MetaVendaTable.deleteWhere {
            (MetaVendaTable.vendedorId eq vendedorId) and
            (MetaVendaTable.ano eq ano) and
            (MetaVendaTable.mes eq mes)
        }
    }

    /** Desempenho consolidado: todos os vendedores ativos × metas × vendas realizadas. */
    suspend fun desempenho(ano: Int, mes: Int): DesempenhoResponse = dbQuery {
        val brt        = ZoneOffset.ofHours(-3)
        val inicio     = LocalDate.of(ano, mes, 1).atStartOfDay(brt).toInstant()
        val fim        = LocalDate.of(ano, mes, 1).plusMonths(1).atStartOfDay(brt).toInstant()

        // Todos os vendedores ativos
        val vendedores = UsuarioVendedorTable
            .select { (UsuarioVendedorTable.vendedor eq true) and (UsuarioVendedorTable.ativo eq true) }
            .associate { it[UsuarioVendedorTable.id] to it[UsuarioVendedorTable.nome] }

        // Metas do mês
        val metas = MetaVendaTable
            .select { (MetaVendaTable.ano eq ano) and (MetaVendaTable.mes eq mes) }
            .associate { it[MetaVendaTable.vendedorId] to it[MetaVendaTable.metaFaturamento] }

        // Vendas confirmadas do período, agrupadas por vendedorId
        val vendasRows = VendaTable
            .select {
                (VendaTable.status inList listOf(
                    StatusVenda.CONFIRMADO,
                    StatusVenda.EM_ENTREGA,
                    StatusVenda.ENTREGUE_PARCIAL,
                    StatusVenda.CONCLUIDO,
                )) and
                (VendaTable.createdAt greaterEq inicio.toKotlin()) and
                (VendaTable.createdAt less fim.toKotlin())
            }
            .toList()

        data class VendaAgg(
            var fat: BigDecimal = BigDecimal.ZERO,
            var qtd: Int = 0,
        )
        val fatPorVendedor = mutableMapOf<UUID, VendaAgg>()
        vendasRows.forEach { row ->
            val vId = row[VendaTable.vendedorId]
            val agg = fatPorVendedor.getOrPut(vId) { VendaAgg() }
            agg.fat = agg.fat.add(row[VendaTable.valorTotal])
            agg.qtd++
        }

        // Volume m³ e metros lineares por vendedor
        val vendaIds = vendasRows.map { it[VendaTable.id] }
        data class VolAgg(var m3: BigDecimal = BigDecimal.ZERO, var ml: BigDecimal = BigDecimal.ZERO)
        val volPorVenda = mutableMapOf<UUID, VolAgg>()
        if (vendaIds.isNotEmpty()) {
            ItemVendaTable
                .select {
                    (ItemVendaTable.vendaId inList vendaIds) and
                    (ItemVendaTable.tipoProduto eq TipoProduto.MADEIRA)
                }
                .forEach { row ->
                    val agg = volPorVenda.getOrPut(row[ItemVendaTable.vendaId]) { VolAgg() }
                    agg.m3 = agg.m3.add(row[ItemVendaTable.volumeM3Calculado] ?: BigDecimal.ZERO)
                    agg.ml = agg.ml.add(row[ItemVendaTable.quantidadeMLinear] ?: BigDecimal.ZERO)
                }
        }

        // Volume por vendedor
        val volPorVendedor = mutableMapOf<UUID, VolAgg>()
        vendasRows.forEach { row ->
            val vId = row[VendaTable.vendedorId]
            val vol = volPorVenda[row[VendaTable.id]] ?: return@forEach
            val agg = volPorVendedor.getOrPut(vId) { VolAgg() }
            agg.m3 = agg.m3.add(vol.m3)
            agg.ml = agg.ml.add(vol.ml)
        }

        val itens = vendedores.entries
            .map { (vId, vNome) ->
                val vendaAgg = fatPorVendedor[vId]
                val volAgg   = volPorVendedor[vId]
                val meta     = metas[vId]
                val realizado = vendaAgg?.fat ?: BigDecimal.ZERO
                val qtd       = vendaAgg?.qtd ?: 0
                val ticket    = if (qtd > 0)
                    realizado.divide(BigDecimal(qtd), 2, RoundingMode.HALF_UP)
                else BigDecimal.ZERO
                val percentual = if (meta != null && meta > BigDecimal.ZERO)
                    realizado.multiply(BigDecimal(100)).divide(meta, 1, RoundingMode.HALF_UP)
                else null

                DesempenhoVendedorItem(
                    vendedorId           = vId.toString(),
                    vendedorNome         = vNome,
                    metaFaturamento      = meta?.toPlainString(),
                    realizadoFaturamento = realizado.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                    percentualAtingido   = percentual?.toPlainString(),
                    totalVendas          = qtd,
                    ticketMedio          = ticket.toPlainString(),
                    totalM3              = (volAgg?.m3 ?: BigDecimal.ZERO).setScale(4, RoundingMode.HALF_UP).toPlainString(),
                    totalMetrosLineares  = (volAgg?.ml ?: BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP).toPlainString(),
                    temMeta              = meta != null,
                )
            }
            .sortedWith(compareByDescending<DesempenhoVendedorItem> { it.temMeta }
                .thenByDescending { BigDecimal(it.realizadoFaturamento) })

        val totalFat  = itens.fold(BigDecimal.ZERO) { acc, i -> acc.add(BigDecimal(i.realizadoFaturamento)) }
        val totalMeta = metas.values.fold(BigDecimal.ZERO, BigDecimal::add)
        val pctGeral  = if (totalMeta > BigDecimal.ZERO)
            totalFat.multiply(BigDecimal(100)).divide(totalMeta, 1, RoundingMode.HALF_UP).toPlainString()
        else null

        DesempenhoResponse(
            ano                    = ano,
            mes                    = mes,
            itens                  = itens,
            totalFaturamento       = totalFat.setScale(2, RoundingMode.HALF_UP).toPlainString(),
            totalMeta              = totalMeta.setScale(2, RoundingMode.HALF_UP).toPlainString(),
            percentualGeralAtingido = pctGeral,
        )
    }
}

private fun java.time.Instant.toKotlin() =
    kotlinx.datetime.Instant.fromEpochMilliseconds(toEpochMilli())
