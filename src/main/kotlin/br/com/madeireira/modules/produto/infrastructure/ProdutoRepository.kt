package br.com.madeireira.modules.produto.infrastructure

import br.com.madeireira.modules.produto.domain.model.DimensaoMadeira
import br.com.madeireira.modules.produto.domain.model.PrecificacaoProduto
import br.com.madeireira.modules.produto.domain.model.Produto
import java.util.UUID

interface ProdutoRepository {
    suspend fun findAll(ativo: Boolean? = null): List<Produto>
    suspend fun findById(id: UUID): Produto?
    suspend fun findByCodigo(codigo: String): Produto?
    suspend fun create(produto: Produto): Produto
    suspend fun update(produto: Produto): Produto
    suspend fun findDimensaoVigente(produtoId: UUID): DimensaoMadeira?
    suspend fun createDimensao(dimensao: DimensaoMadeira): DimensaoMadeira
    suspend fun findUnidadeIdBySigla(sigla: String): UUID?
    suspend fun listarUnidades(): List<UnidadeMedidaInfo>
    suspend fun findGrupoFiscalByCodigo(codigo: String): UUID?
    suspend fun findPrecificacao(produtoId: UUID): List<PrecificacaoProduto>
    suspend fun upsertPrecificacao(produtoId: UUID, itens: List<PrecificacaoProduto>)
}

data class UnidadeMedidaInfo(
    val id: String,
    val codigo: String,
    val descricao: String,
    val tipo: String,
    val casasDecimais: Int,
)
