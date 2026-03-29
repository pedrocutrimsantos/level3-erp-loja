package br.com.madeireira.modules.financeiro.infrastructure

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.kotlin.datetime.date
import org.jetbrains.exposed.sql.kotlin.datetime.timestamp

object TurnoCaixaTable : Table("turno_caixa") {
    val id               = uuid("id").autoGenerate()
    val data             = date("data")
    val valorAbertura    = decimal("valor_abertura", 12, 2)
    val valorFechamento  = decimal("valor_fechamento", 12, 2).nullable()
    val status           = varchar("status", 20)
    val observacao       = text("observacao").nullable()
    val createdAt        = timestamp("created_at")
    val updatedAt        = timestamp("updated_at")

    override val primaryKey = PrimaryKey(id)
}

object SangriaCaixaTable : Table("sangria_caixa") {
    val id        = uuid("id").autoGenerate()
    val turnoId   = uuid("turno_id").references(TurnoCaixaTable.id)
    val descricao = varchar("descricao", 200)
    val valor     = decimal("valor", 12, 2)
    val createdAt = timestamp("created_at")

    override val primaryKey = PrimaryKey(id)
}
