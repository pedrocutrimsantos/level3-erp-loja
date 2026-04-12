package br.com.madeireira.modules.cobranca.infrastructure

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.kotlin.datetime.timestamp

object CobrancaLogTable : Table("cobranca_log") {
    val id          = uuid("id").autoGenerate()
    val parcelaId   = uuid("parcela_id")
    val tituloId    = uuid("titulo_id")
    val clienteId   = uuid("cliente_id").nullable()
    val telefone    = varchar("telefone", 20)
    val mensagem    = text("mensagem")
    val reguaDia    = integer("regua_dia")
    val status      = varchar("status", 10)
    val erroDetalhe = text("erro_detalhe").nullable()
    val enviadoEm   = timestamp("enviado_em")

    override val primaryKey = PrimaryKey(id)
}
