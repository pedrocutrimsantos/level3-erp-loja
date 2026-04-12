package br.com.madeireira.modules.promocao.infrastructure

import br.com.madeireira.modules.promocao.domain.EscopoPromocao
import br.com.madeireira.modules.promocao.domain.TipoPromocao
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.kotlin.datetime.date
import org.jetbrains.exposed.sql.kotlin.datetime.timestamp

object PromocaoTable : Table("promocao") {
    val id                  = uuid("id").autoGenerate()
    val nome                = varchar("nome", 120)
    val descricao           = text("descricao").nullable()
    val tipo                = varchar("tipo", 30)        // TipoPromocao.name
    val valor               = decimal("valor", 10, 4)
    val escopo              = varchar("escopo", 20)      // EscopoPromocao.name
    val ativo               = bool("ativo")
    val dataInicio          = date("data_inicio").nullable()
    val dataFim             = date("data_fim").nullable()
    val quantidadeMinima    = decimal("quantidade_minima", 14, 4).nullable()
    val valorMinimoPedido   = decimal("valor_minimo_pedido", 14, 2).nullable()
    val createdAt           = timestamp("created_at")

    override val primaryKey = PrimaryKey(id)
}

object PromocaoProdutoTable : Table("promocao_produto") {
    val promocaoId = uuid("promocao_id").references(PromocaoTable.id)
    val produtoId  = uuid("produto_id")

    override val primaryKey = PrimaryKey(promocaoId, produtoId)
}
