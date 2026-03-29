package br.com.madeireira.modules.venda.infrastructure

import br.com.madeireira.infrastructure.database.DatabaseConfig.dbQuery
import br.com.madeireira.modules.cliente.infrastructure.ClienteTable
import br.com.madeireira.modules.produto.domain.model.TipoProduto
import br.com.madeireira.modules.venda.domain.model.ItemVenda
import br.com.madeireira.modules.venda.domain.model.StatusItemEntrega
import br.com.madeireira.modules.venda.domain.model.StatusVenda
import br.com.madeireira.modules.venda.domain.model.TipoVenda
import br.com.madeireira.modules.venda.domain.model.Venda
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.update
import org.jetbrains.exposed.sql.*
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID

class VendaRepositoryImpl : VendaRepository {

    override suspend fun criarVenda(venda: Venda): Venda = dbQuery {
        VendaTable.insert {
            it[id]             = venda.id
            it[numero]         = venda.numero
            it[vendedorId]     = venda.vendedorId
            it[depositoId]     = venda.depositoId
            it[clienteId]      = venda.clienteId
            it[tipo]           = venda.tipo
            it[status]         = venda.status
            it[valorSubtotal]  = venda.valorTotal
            it[valorDesconto]  = BigDecimal.ZERO
            it[valorFrete]     = BigDecimal.ZERO
            it[valorTotal]     = venda.valorTotal
            it[formaPagamento] = venda.formaPagamento
            it[createdAt]      = venda.createdAt.toKotlinInstant()
            it[createdBy]      = USUARIO_SISTEMA
        }
        venda
    }

    override suspend fun criarItemVenda(item: ItemVenda): ItemVenda = dbQuery {
        ItemVendaTable.insert {
            it[id]                  = item.id
            it[vendaId]             = item.vendaId
            it[produtoId]           = item.produtoId
            it[numeroLinha]         = item.numeroLinha
            it[tipoProduto]         = item.tipoProduto
            it[dimensaoId]          = item.dimensaoId
            it[fatorConversaoUsado] = item.fatorConversaoUsado
            it[quantidadeMLinear]   = item.quantidadeMetroLinear
            it[volumeM3Calculado]   = item.volumeM3Calculado
            it[quantidadeUnidade]   = item.quantidadeUnidade
            it[precoUnitario]       = item.precoUnitario
            it[valorTotalItem]      = item.valorTotalItem
            it[statusEntrega]       = item.statusEntrega
        }
        item
    }

    override suspend fun findVendaById(id: UUID): Venda? = dbQuery {
        VendaTable
            .select { VendaTable.id eq id }
            .map { toVenda(it) }
            .singleOrNull()
    }

    override suspend fun findByIdComNome(id: UUID): VendaComNome? = dbQuery {
        VendaTable
            .leftJoin(ClienteTable, { VendaTable.clienteId }, { ClienteTable.id })
            .select { VendaTable.id eq id }
            .map { row -> VendaComNome(toVenda(row), row.getOrNull(ClienteTable.razaoSocial)) }
            .singleOrNull()
    }

    override suspend fun findItensByVendaId(vendaId: UUID): List<ItemVenda> = dbQuery {
        ItemVendaTable
            .select { ItemVendaTable.vendaId eq vendaId }
            .orderBy(ItemVendaTable.numeroLinha, SortOrder.ASC)
            .map { toItemVenda(it) }
    }

    override suspend fun findAll(limit: Int): List<VendaComNome> = dbQuery {
        VendaTable
            .leftJoin(ClienteTable, { VendaTable.clienteId }, { ClienteTable.id })
            .selectAll()
            .orderBy(VendaTable.createdAt, SortOrder.DESC)
            .limit(limit)
            .map { row ->
                VendaComNome(
                    venda       = toVenda(row),
                    clienteNome = row.getOrNull(ClienteTable.razaoSocial),
                )
            }
    }

    // -------------------------------------------------------------------------
    // Mappers
    // -------------------------------------------------------------------------

    override suspend fun findByStatus(status: StatusVenda, limit: Int): List<VendaComNome> = dbQuery {
        VendaTable
            .leftJoin(ClienteTable, { VendaTable.clienteId }, { ClienteTable.id })
            .select { VendaTable.status eq status }
            .orderBy(VendaTable.createdAt, SortOrder.DESC)
            .limit(limit)
            .map { row ->
                VendaComNome(
                    venda       = toVenda(row),
                    clienteNome = row.getOrNull(ClienteTable.razaoSocial),
                )
            }
    }

    override suspend fun updateStatus(id: UUID, status: StatusVenda) = dbQuery {
        VendaTable.update({ VendaTable.id eq id }) { it[VendaTable.status] = status }
        Unit
    }

    override suspend fun updateStatusEntregaItem(itemId: UUID, status: StatusItemEntrega) = dbQuery {
        ItemVendaTable.update({ ItemVendaTable.id eq itemId }) { it[ItemVendaTable.statusEntrega] = status }
        Unit
    }

    override suspend fun findByDate(date: LocalDate): List<VendaComNome> = dbQuery {
        val start = date.atStartOfDay(ZoneOffset.ofHours(-3)).toInstant().toKotlinInstant()
        val end   = date.plusDays(1).atStartOfDay(ZoneOffset.ofHours(-3)).toInstant().toKotlinInstant()
        VendaTable
            .leftJoin(ClienteTable, { VendaTable.clienteId }, { ClienteTable.id })
            .select { (VendaTable.createdAt greaterEq start) and (VendaTable.createdAt less end) }
            .orderBy(VendaTable.createdAt, SortOrder.DESC)
            .map { row ->
                VendaComNome(
                    venda       = toVenda(row),
                    clienteNome = row.getOrNull(ClienteTable.razaoSocial),
                )
            }
    }

    private fun toVenda(row: ResultRow): Venda = Venda(
        id             = row[VendaTable.id],
        numero         = row[VendaTable.numero],
        vendedorId     = row[VendaTable.vendedorId],
        depositoId     = row[VendaTable.depositoId],
        clienteId      = row[VendaTable.clienteId],
        tipo           = row[VendaTable.tipo],
        status         = row[VendaTable.status],
        valorTotal     = row[VendaTable.valorTotal],
        createdAt      = row[VendaTable.createdAt].toJavaInstant(),
        formaPagamento = row.getOrNull(VendaTable.formaPagamento),
    )

    private fun toItemVenda(row: ResultRow): ItemVenda = ItemVenda(
        id                    = row[ItemVendaTable.id],
        vendaId               = row[ItemVendaTable.vendaId],
        produtoId             = row[ItemVendaTable.produtoId],
        numeroLinha           = row[ItemVendaTable.numeroLinha],
        tipoProduto           = row[ItemVendaTable.tipoProduto],
        dimensaoId            = row[ItemVendaTable.dimensaoId],
        fatorConversaoUsado   = row[ItemVendaTable.fatorConversaoUsado],
        quantidadeMetroLinear = row[ItemVendaTable.quantidadeMLinear],
        volumeM3Calculado     = row[ItemVendaTable.volumeM3Calculado],
        quantidadeUnidade     = row[ItemVendaTable.quantidadeUnidade],
        precoUnitario         = row[ItemVendaTable.precoUnitario],
        valorTotalItem        = row[ItemVendaTable.valorTotalItem],
        statusEntrega         = row[ItemVendaTable.statusEntrega],
    )
}

private val USUARIO_SISTEMA = java.util.UUID.fromString("00000000-0000-0000-0000-000000000001")

// Extension helpers to bridge java.time.Instant ↔ kotlinx.datetime.Instant
private fun Instant.toKotlinInstant(): kotlinx.datetime.Instant =
    kotlinx.datetime.Instant.fromEpochMilliseconds(this.toEpochMilli())

private fun kotlinx.datetime.Instant.toJavaInstant(): Instant =
    Instant.ofEpochMilli(this.toEpochMilliseconds())
