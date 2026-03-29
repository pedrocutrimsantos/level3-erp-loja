package br.com.madeireira.modules.produto.infrastructure

import br.com.madeireira.infrastructure.database.DatabaseConfig.dbQuery
import br.com.madeireira.modules.produto.domain.model.DimensaoMadeira
import br.com.madeireira.modules.produto.domain.model.PrecificacaoProduto
import br.com.madeireira.modules.produto.domain.model.Produto
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.time.Instant
import java.util.UUID

class ProdutoRepositoryImpl : ProdutoRepository {

    // -------------------------------------------------------------------------
    // Produto
    // -------------------------------------------------------------------------

    override suspend fun findAll(ativo: Boolean?): List<Produto> = dbQuery {
        val query = ProdutoTable
            .join(UnidadeMedidaTable, JoinType.INNER, ProdutoTable.unidadeMedidaId, UnidadeMedidaTable.id)
            .selectAll()
        if (ativo != null) query.andWhere { ProdutoTable.ativo eq ativo }
        query.map { toProduto(it) }
    }

    override suspend fun findById(id: UUID): Produto? = dbQuery {
        ProdutoTable
            .join(UnidadeMedidaTable, JoinType.INNER, ProdutoTable.unidadeMedidaId, UnidadeMedidaTable.id)
            .select { ProdutoTable.id eq id }
            .map { toProduto(it) }
            .singleOrNull()
    }

    override suspend fun findByCodigo(codigo: String): Produto? = dbQuery {
        ProdutoTable
            .join(UnidadeMedidaTable, JoinType.INNER, ProdutoTable.unidadeMedidaId, UnidadeMedidaTable.id)
            .select { ProdutoTable.codigo eq codigo }
            .map { toProduto(it) }
            .singleOrNull()
    }

    override suspend fun create(produto: Produto): Produto = dbQuery {
        ProdutoTable.insert {
            it[id]                        = produto.id
            it[codigo]                    = produto.codigo
            it[descricao]                 = produto.descricao
            it[unidadeMedidaId]           = produto.unidadeMedidaId
            it[tipo]                      = produto.tipo
            it[ncm]                       = produto.ncm
            it[grupoFiscalId]             = produto.grupoFiscalId
            it[ativo]                     = produto.ativo
            it[controlarConversaoMadeira] = produto.controlarConversaoMadeira
            it[comprimentoPecaM]          = produto.comprimentoPecaM?.toBigDecimal()
            it[precoVenda]                = produto.precoVenda
            it[createdBy]                 = UUID.fromString("00000000-0000-0000-0000-000000000001")
            it[createdAt]                 = produto.createdAt.toKotlinInstant()
            it[updatedAt]                 = produto.updatedAt.toKotlinInstant()
        }
        produto
    }

    override suspend fun update(produto: Produto): Produto = dbQuery {
        ProdutoTable.update({ ProdutoTable.id eq produto.id }) {
            it[codigo]           = produto.codigo
            it[descricao]        = produto.descricao
            it[tipo]             = produto.tipo
            it[ncm]              = produto.ncm
            it[ativo]            = produto.ativo
            it[comprimentoPecaM] = produto.comprimentoPecaM?.toBigDecimal()
            it[precoVenda]       = produto.precoVenda
            it[updatedAt]        = produto.updatedAt.toKotlinInstant()
        }
        produto
    }

    // -------------------------------------------------------------------------
    // DimensaoMadeira
    // -------------------------------------------------------------------------

    override suspend fun findDimensaoVigente(produtoId: UUID): DimensaoMadeira? = dbQuery {
        DimensaoMadeiraTable
            .select {
                (DimensaoMadeiraTable.produtoId eq produtoId) and
                DimensaoMadeiraTable.vigenteAte.isNull()
            }
            .map { toDimensao(it) }
            .singleOrNull()
    }

    override suspend fun createDimensao(dimensao: DimensaoMadeira): DimensaoMadeira = dbQuery {
        DimensaoMadeiraTable.insert {
            it[id]             = dimensao.id
            it[produtoId]      = dimensao.produtoId
            it[espessuraMm]    = dimensao.espessuraMm.toBigDecimal()
            it[larguraMm]      = dimensao.larguraMm.toBigDecimal()
            it[fatorConversao] = dimensao.fatorConversao
            it[vigenteDesde]   = dimensao.vigenteDesde.toKotlinInstant()
            it[vigenteAte]     = dimensao.vigenteAte?.toKotlinInstant()
        }
        dimensao
    }

    fun closeDimensao(id: UUID, vigenteAte: Instant) {
        DimensaoMadeiraTable.update({ DimensaoMadeiraTable.id eq id }) {
            it[DimensaoMadeiraTable.vigenteAte] = vigenteAte.toKotlinInstant()
        }
    }

    // -------------------------------------------------------------------------
    // UnidadeMedida
    // -------------------------------------------------------------------------

    override suspend fun findUnidadeIdBySigla(sigla: String): UUID? = dbQuery {
        UnidadeMedidaTable
            .select { UnidadeMedidaTable.codigo eq sigla }
            .map { it[UnidadeMedidaTable.id] }
            .singleOrNull()
    }

    override suspend fun findPrecificacao(produtoId: UUID): List<PrecificacaoProduto> = dbQuery {
        PrecificacaoProdutoTable
            .select { PrecificacaoProdutoTable.produtoId eq produtoId }
            .map {
                PrecificacaoProduto(
                    produtoId  = it[PrecificacaoProdutoTable.produtoId],
                    tipoPessoa = it[PrecificacaoProdutoTable.tipoPessoa],
                    tipoPag    = it[PrecificacaoProdutoTable.tipoPag],
                    preco      = it[PrecificacaoProdutoTable.preco],
                )
            }
    }

    override suspend fun upsertPrecificacao(produtoId: UUID, itens: List<PrecificacaoProduto>) = dbQuery {
        PrecificacaoProdutoTable.deleteWhere { PrecificacaoProdutoTable.produtoId eq produtoId }
        itens.forEach { item ->
            PrecificacaoProdutoTable.insert {
                it[PrecificacaoProdutoTable.produtoId]  = item.produtoId
                it[PrecificacaoProdutoTable.tipoPessoa] = item.tipoPessoa
                it[PrecificacaoProdutoTable.tipoPag]    = item.tipoPag
                it[PrecificacaoProdutoTable.preco]      = item.preco
            }
        }
    }

    override suspend fun findGrupoFiscalByCodigo(codigo: String): UUID? = dbQuery {
        GrupoFiscalTable
            .select { GrupoFiscalTable.codigo eq codigo }
            .map { it[GrupoFiscalTable.id] }
            .singleOrNull()
    }

    override suspend fun listarUnidades(): List<UnidadeMedidaInfo> = dbQuery {
        UnidadeMedidaTable.selectAll().map { row ->
            UnidadeMedidaInfo(
                id            = row[UnidadeMedidaTable.id].toString(),
                codigo        = row[UnidadeMedidaTable.codigo],
                descricao     = row[UnidadeMedidaTable.descricao],
                tipo          = row[UnidadeMedidaTable.tipo],
                casasDecimais = row[UnidadeMedidaTable.casasDecimais],
            )
        }
    }

    // -------------------------------------------------------------------------
    // Mappers
    // -------------------------------------------------------------------------

    private fun toProduto(row: ResultRow): Produto = Produto(
        id                        = row[ProdutoTable.id],
        codigo                    = row[ProdutoTable.codigo],
        descricao                 = row[ProdutoTable.descricao],
        unidadeMedidaId           = row[ProdutoTable.unidadeMedidaId],
        unidadeVendaSigla         = row[UnidadeMedidaTable.codigo],
        tipo                      = row[ProdutoTable.tipo],
        ncm                       = row[ProdutoTable.ncm],
        grupoFiscalId             = row[ProdutoTable.grupoFiscalId],
        ativo                     = row[ProdutoTable.ativo],
        createdAt                 = row[ProdutoTable.createdAt].toJavaInstant(),
        updatedAt                 = row[ProdutoTable.updatedAt].toJavaInstant(),
        controlarConversaoMadeira = row[ProdutoTable.controlarConversaoMadeira],
        comprimentoPecaM          = row[ProdutoTable.comprimentoPecaM]?.toDouble(),
        precoVenda                = row[ProdutoTable.precoVenda],
    )

    private fun toDimensao(row: ResultRow): DimensaoMadeira = DimensaoMadeira(
        id             = row[DimensaoMadeiraTable.id],
        produtoId      = row[DimensaoMadeiraTable.produtoId],
        espessuraMm    = row[DimensaoMadeiraTable.espessuraMm].toInt(),
        larguraMm      = row[DimensaoMadeiraTable.larguraMm].toInt(),
        fatorConversao = row[DimensaoMadeiraTable.fatorConversao],
        vigenteDesde   = row[DimensaoMadeiraTable.vigenteDesde].toJavaInstant(),
        vigenteAte     = row[DimensaoMadeiraTable.vigenteAte]?.toJavaInstant(),
    )
}

// Extension helpers to bridge java.time.Instant ↔ kotlinx.datetime.Instant
private fun Instant.toKotlinInstant(): kotlinx.datetime.Instant =
    kotlinx.datetime.Instant.fromEpochMilliseconds(this.toEpochMilli())

private fun kotlinx.datetime.Instant.toJavaInstant(): Instant =
    Instant.ofEpochMilli(this.toEpochMilliseconds())
