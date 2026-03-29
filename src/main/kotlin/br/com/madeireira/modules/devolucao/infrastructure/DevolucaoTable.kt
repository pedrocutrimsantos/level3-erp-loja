package br.com.madeireira.modules.devolucao.infrastructure

import br.com.madeireira.modules.venda.infrastructure.ItemVendaTable
import br.com.madeireira.modules.venda.infrastructure.VendaTable
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.kotlin.datetime.timestamp

object DevolucaoTable : Table("devolucao") {
    val id         = uuid("id").autoGenerate()
    val vendaId    = uuid("venda_id").references(VendaTable.id)
    val numero     = varchar("numero", 30)
    val motivo     = text("motivo").nullable()
    val valorTotal = decimal("valor_total", 14, 2)
    val createdAt  = timestamp("created_at")

    override val primaryKey = PrimaryKey(id)
}

object ItemDevolucaoTable : Table("item_devolucao") {
    val id                 = uuid("id").autoGenerate()
    val devolucaoId        = uuid("devolucao_id").references(DevolucaoTable.id)
    val itemVendaId        = uuid("item_venda_id").references(ItemVendaTable.id)
    val quantidadeMLinear  = decimal("quantidade_m_linear", 12, 3).nullable()
    val volumeM3           = decimal("volume_m3", 10, 4).nullable()
    val quantidadeUnidade  = decimal("quantidade_unidade", 14, 4).nullable()
    val valorDevolvido     = decimal("valor_devolvido", 14, 2)

    override val primaryKey = PrimaryKey(id)
}
