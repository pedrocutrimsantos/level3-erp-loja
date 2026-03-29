package br.com.madeireira.modules.fiscal.infrastructure

import br.com.madeireira.modules.fiscal.domain.model.AmbienteNf
import br.com.madeireira.modules.fiscal.domain.model.ModeloNf
import br.com.madeireira.modules.fiscal.domain.model.StatusNf
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.kotlin.datetime.timestamp
import org.postgresql.util.PGobject

object NfEmitidaTable : Table("nf_emitida") {
    val id                    = uuid("id").autoGenerate()
    val vendaId               = uuid("venda_id").nullable()
    val tipoOperacao          = varchar("tipo_operacao", 30)
    val modelo                = customEnumeration(
        name   = "modelo",
        sql    = "modelo_nf",
        fromDb = { value -> ModeloNf.valueOf(value as String) },
        toDb   = { value -> PGobject().apply { type = "modelo_nf"; this.value = value.name } },
    )
    val numero                = integer("numero")
    val serie                 = varchar("serie", 3)
    val chaveAcesso           = char("chave_acesso", 44).nullable()
    val statusSefaz           = customEnumeration(
        name   = "status_sefaz",
        sql    = "status_nf",
        fromDb = { value -> StatusNf.valueOf(value as String) },
        toDb   = { value -> PGobject().apply { type = "status_nf"; this.value = value.name } },
    )
    val ambiente              = customEnumeration(
        name   = "ambiente",
        sql    = "ambiente_nf",
        fromDb = { value -> AmbienteNf.valueOf(value as String) },
        toDb   = { value -> PGobject().apply { type = "ambiente_nf"; this.value = value.name } },
    )
    val dataEmissao           = timestamp("data_emissao")
    val dataAutorizacao       = timestamp("data_autorizacao").nullable()
    val protocoloAutorizacao  = varchar("protocolo_autorizacao", 60).nullable()
    val xmlAutorizado         = text("xml_autorizado").nullable()
    val motivoRejeicao        = text("motivo_rejeicao").nullable()
    val chaveCorrelacao       = uuid("chave_correlacao")
    val tentativasEnvio       = integer("tentativas_envio")
    val justificativaCancel   = varchar("justificativa_cancel", 255).nullable()
    val dataCancelamento      = timestamp("data_cancelamento").nullable()
    val protocoloCancelamento = varchar("protocolo_cancelamento", 60).nullable()
    val createdAt             = timestamp("created_at")

    override val primaryKey = PrimaryKey(id)
}
