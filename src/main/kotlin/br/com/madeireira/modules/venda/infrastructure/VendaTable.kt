package br.com.madeireira.modules.venda.infrastructure

import br.com.madeireira.modules.financeiro.domain.model.FormaPagamento
import br.com.madeireira.modules.produto.domain.model.TipoProduto
import br.com.madeireira.modules.venda.domain.model.StatusItemEntrega
import br.com.madeireira.modules.venda.domain.model.StatusVenda
import br.com.madeireira.modules.venda.domain.model.TipoVenda
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.kotlin.datetime.timestamp
import org.postgresql.util.PGobject

object VendaTable : Table("venda") {
    val id          = uuid("id").autoGenerate()
    val numero      = varchar("numero", 30)
    val vendedorId  = uuid("vendedor_id")
    val depositoId  = uuid("deposito_id")
    val tipo        = customEnumeration(
        name   = "tipo",
        sql    = "tipo_venda",
        fromDb = { value -> TipoVenda.valueOf(value as String) },
        toDb   = { value -> PGobject().apply { type = "tipo_venda"; this.value = value.name } },
    )
    val status      = customEnumeration(
        name   = "status",
        sql    = "status_venda",
        fromDb = { value -> StatusVenda.valueOf(value as String) },
        toDb   = { value -> PGobject().apply { type = "status_venda"; this.value = value.name } },
    )
    val valorSubtotal = decimal("valor_subtotal", 14, 2)
    val valorDesconto = decimal("valor_desconto", 14, 2)
    val valorFrete    = decimal("valor_frete", 12, 2)
    val valorTotal    = decimal("valor_total", 14, 2)
    val clienteId       = uuid("cliente_id").nullable()
    val formaPagamento  = customEnumeration(
        name   = "forma_pagamento",
        sql    = "forma_pagamento",
        fromDb = { value -> FormaPagamento.valueOf(value as String) },
        toDb   = { value -> PGobject().apply { type = "forma_pagamento"; this.value = value.name } },
    ).nullable()
    val createdAt     = timestamp("created_at")
    val createdBy     = uuid("created_by").nullable()

    override val primaryKey = PrimaryKey(id)
}

object ItemVendaTable : Table("item_venda") {
    val id                    = uuid("id").autoGenerate()
    val vendaId               = uuid("venda_id").references(VendaTable.id)
    val produtoId             = uuid("produto_id")
    val numeroLinha           = integer("numero_linha")
    val tipoProduto           = customEnumeration(
        name   = "tipo_produto",
        sql    = "tipo_produto",
        fromDb = { value -> TipoProduto.valueOf(value as String) },
        toDb   = { value -> PGobject().apply { type = "tipo_produto"; this.value = value.name } },
    )
    val dimensaoId            = uuid("dimensao_id").nullable()
    val fatorConversaoUsado   = decimal("fator_conversao_usado", 12, 8).nullable()
    val quantidadeMLinear     = decimal("quantidade_m_linear", 12, 3).nullable()
    val volumeM3Calculado     = decimal("volume_m3_calculado", 10, 4).nullable()
    val quantidadeUnidade     = decimal("quantidade_unidade", 14, 4).nullable()
    val precoUnitario         = decimal("preco_unitario", 12, 4)
    val valorTotalItem        = decimal("valor_total_item", 14, 2)
    val statusEntrega         = customEnumeration(
        name   = "status_entrega",
        sql    = "status_item_entrega",
        fromDb = { value -> StatusItemEntrega.valueOf(value as String) },
        toDb   = { value -> PGobject().apply { type = "status_item_entrega"; this.value = value.name } },
    )

    override val primaryKey = PrimaryKey(id)
}
