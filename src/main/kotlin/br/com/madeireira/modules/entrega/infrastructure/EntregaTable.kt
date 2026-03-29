package br.com.madeireira.modules.entrega.infrastructure

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.kotlin.datetime.date
import org.jetbrains.exposed.sql.kotlin.datetime.timestamp

object EntregaTable : Table("entrega") {
    val id              = uuid("id").autoGenerate()
    val vendaId         = uuid("venda_id")
    val numero          = varchar("numero", 30)
    val status          = varchar("status", 30)
    val observacao      = text("observacao").nullable()
    val enderecoEntrega = text("endereco_entrega").nullable()
    val dataAgendada    = date("data_agendada").nullable()
    val turno           = varchar("turno", 20).nullable()
    val motorista       = text("motorista").nullable()
    val createdAt       = timestamp("created_at")
    val updatedAt       = timestamp("updated_at")

    override val primaryKey = PrimaryKey(id)
}
