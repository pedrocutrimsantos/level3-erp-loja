package br.com.madeireira.modules.fornecedor.infrastructure

import org.jetbrains.exposed.sql.Table

object FornecedorTable : Table("fornecedor") {
    val id                = uuid("id").autoGenerate()
    val tipoPessoa        = varchar("tipo_pessoa", 2)       // PF | PJ
    val cnpjCpf           = varchar("cnpj_cpf", 18)
    val razaoSocial       = varchar("razao_social", 150)
    val nomeFantasia      = varchar("nome_fantasia", 100).nullable()
    val inscricaoEstadual = varchar("inscricao_estadual", 20).nullable()
    val email             = varchar("email", 120).nullable()
    val telefone          = varchar("telefone", 20).nullable()
    val uf                = char("uf", 2)
    val cep               = char("cep", 9)
    val logradouro        = varchar("logradouro", 150)
    val numero            = varchar("numero", 10)
    val bairro            = varchar("bairro", 80)
    val cidade            = varchar("cidade", 80)
    val ativo             = bool("ativo")

    override val primaryKey = PrimaryKey(id)
}
