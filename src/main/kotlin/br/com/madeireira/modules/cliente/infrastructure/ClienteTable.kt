package br.com.madeireira.modules.cliente.infrastructure

import br.com.madeireira.modules.cliente.domain.model.StatusInadimplencia
import br.com.madeireira.modules.cliente.domain.model.TipoPessoa
import org.jetbrains.exposed.sql.Table
import org.postgresql.util.PGobject

object ClienteTable : Table("cliente") {
    val id           = uuid("id").autoGenerate()
    val tipoPessoa   = customEnumeration(
        name   = "tipo_pessoa",
        sql    = "tipo_pessoa",
        fromDb = { value -> TipoPessoa.valueOf(value as String) },
        toDb   = { value -> PGobject().apply { type = "tipo_pessoa"; this.value = value.name } },
    )
    val cnpjCpf      = varchar("cnpj_cpf", 18).nullable()
    val razaoSocial  = varchar("razao_social", 150)
    val nomeFantasia = varchar("nome_fantasia", 100).nullable()
    val email        = varchar("email", 120).nullable()
    val telefone     = varchar("telefone", 20).nullable()
    val limiteCred   = decimal("limite_credito", 12, 2)
    val saldoDevedor = decimal("saldo_devedor", 12, 2)
    val statusInad   = customEnumeration(
        name   = "status_inadimplencia",
        sql    = "status_inadimplencia",
        fromDb = { value -> StatusInadimplencia.valueOf(value as String) },
        toDb   = { value -> PGobject().apply { type = "status_inadimplencia"; this.value = value.name } },
    )
    val ativo        = bool("ativo")

    override val primaryKey = PrimaryKey(id)
}
