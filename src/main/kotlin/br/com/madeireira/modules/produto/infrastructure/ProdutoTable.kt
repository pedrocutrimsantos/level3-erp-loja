package br.com.madeireira.modules.produto.infrastructure

import br.com.madeireira.modules.produto.domain.model.TipoProduto
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.kotlin.datetime.timestamp
import org.postgresql.util.PGobject

object UnidadeMedidaTable : Table("unidade_medida") {
    val id            = uuid("id")
    val codigo        = varchar("codigo", 10)
    val descricao     = varchar("descricao", 60)
    val tipo          = varchar("tipo", 20)
    val casasDecimais = integer("casas_decimais")

    override val primaryKey = PrimaryKey(id)
}

object ProdutoTable : Table("produto") {
    val id             = uuid("id").autoGenerate()
    val codigo         = varchar("codigo_interno", 30)
    val descricao      = varchar("nome_comercial", 120)
    val unidadeMedidaId = uuid("unidade_venda_id")
    val tipo           = customEnumeration(
        name   = "tipo",
        sql    = "tipo_produto",
        fromDb = { value -> TipoProduto.valueOf(value as String) },
        toDb   = { PGobject().apply { type = "tipo_produto"; value = it.name } }
    )
    val ncm            = varchar("ncm", 8)
    val grupoFiscalId  = uuid("grupo_fiscal_id")
    val ativo          = bool("ativo")
    val controlarConversaoMadeira = bool("controlar_conversao_madeira")
    val comprimentoPecaM          = decimal("comprimento_peca_m", 10, 4).nullable()
    val precoVenda                = decimal("preco_venda", 12, 4).nullable()
    val createdBy      = uuid("created_by").nullable()
    val createdAt      = timestamp("created_at")
    val updatedAt      = timestamp("updated_at")

    override val primaryKey = PrimaryKey(id)
}

object GrupoFiscalTable : Table("grupo_fiscal_produto") {
    val id      = uuid("id")
    val codigo  = varchar("codigo", 40)

    override val primaryKey = PrimaryKey(id)
}

object PrecificacaoProdutoTable : Table("precificacao_produto") {
    val produtoId  = uuid("produto_id").references(ProdutoTable.id)
    val tipoPessoa = varchar("tipo_pessoa", 10)
    val tipoPag    = varchar("tipo_pag", 10)
    val preco      = decimal("preco", 12, 4)

    override val primaryKey = PrimaryKey(produtoId, tipoPessoa, tipoPag)
}

object DimensaoMadeiraTable : Table("dimensao_madeira") {
    val id             = uuid("id").autoGenerate()
    val produtoId      = uuid("produto_id").references(ProdutoTable.id)
    val espessuraMm    = decimal("espessura_mm", 6, 2)
    val larguraMm      = decimal("largura_mm", 6, 2)
    val fatorConversao = decimal("fator_conversao", 12, 8)
    val vigenteDesde   = timestamp("vigente_desde")
    val vigenteAte     = timestamp("vigente_ate").nullable()

    override val primaryKey = PrimaryKey(id)
}
