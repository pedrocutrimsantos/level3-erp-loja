package br.com.madeireira.modules.financeiro.infrastructure

import br.com.madeireira.modules.financeiro.domain.model.FormaPagamento
import br.com.madeireira.modules.financeiro.domain.model.StatusParcela
import br.com.madeireira.modules.financeiro.domain.model.StatusTitulo
import br.com.madeireira.modules.financeiro.domain.model.TipoTitulo
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.kotlin.datetime.date
import org.jetbrains.exposed.sql.kotlin.datetime.timestamp
import org.postgresql.util.PGobject

object TituloFinanceiroTable : Table("titulo_financeiro") {
    val id            = uuid("id").autoGenerate()
    val numero        = varchar("numero", 30)
    val descricao     = varchar("descricao", 120).nullable()
    val tipo          = customEnumeration(
        name   = "tipo",
        sql    = "tipo_titulo",
        fromDb = { value -> TipoTitulo.valueOf(value as String) },
        toDb   = { value -> PGobject().apply { type = "tipo_titulo"; this.value = value.name } },
    )
    val vendaId       = uuid("venda_id").nullable()
    val compraId      = uuid("compra_id").nullable()
    val clienteId     = uuid("cliente_id").nullable()
    val fornecedorId  = uuid("fornecedor_id").nullable()
    val categoria     = varchar("categoria", 40).nullable()
    val valorOriginal = decimal("valor_original", 14, 2)
    val valorPago     = decimal("valor_pago", 14, 2)
    val status        = customEnumeration(
        name   = "status",
        sql    = "status_titulo",
        fromDb = { value -> StatusTitulo.valueOf(value as String) },
        toDb   = { value -> PGobject().apply { type = "status_titulo"; this.value = value.name } },
    )
    val dataEmissao   = date("data_emissao")
    val createdAt     = timestamp("created_at")

    override val primaryKey = PrimaryKey(id)
}

object ParcelaFinanceiraTable : Table("parcela_financeira") {
    val id             = uuid("id").autoGenerate()
    val tituloId       = uuid("titulo_id").references(TituloFinanceiroTable.id)
    val numeroParcela  = integer("numero_parcela")
    val valor          = decimal("valor", 14, 2)
    val dataVencimento = date("data_vencimento")
    val dataPagamento  = date("data_pagamento").nullable()
    val valorPago      = decimal("valor_pago", 14, 2).nullable()
    val valorJuros     = decimal("valor_juros", 12, 2)
    val valorMulta     = decimal("valor_multa", 12, 2)
    val valorDesconto  = decimal("valor_desconto", 12, 2)
    val formaPagamento = customEnumeration(
        name   = "forma_pagamento",
        sql    = "forma_pagamento",
        fromDb = { value -> FormaPagamento.valueOf(value as String) },
        toDb   = { value -> PGobject().apply { type = "forma_pagamento"; this.value = value.name } },
    ).nullable()
    val status         = customEnumeration(
        name   = "status",
        sql    = "status_parcela",
        fromDb = { value -> StatusParcela.valueOf(value as String) },
        toDb   = { value -> PGobject().apply { type = "status_parcela"; this.value = value.name } },
    )

    override val primaryKey = PrimaryKey(id)
}
