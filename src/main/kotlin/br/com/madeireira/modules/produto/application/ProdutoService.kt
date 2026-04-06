package br.com.madeireira.modules.produto.application

import br.com.madeireira.core.conversion.ConversionEngine
import br.com.madeireira.infrastructure.database.DatabaseConfig.dbQuery
import br.com.madeireira.modules.produto.api.dto.AtualizarDimensaoRequest
import br.com.madeireira.modules.produto.api.dto.AtualizarPrecoRequest
import br.com.madeireira.modules.produto.api.dto.AtualizarProdutoRequest
import br.com.madeireira.modules.produto.api.dto.CriarProdutoRequest
import br.com.madeireira.modules.produto.api.dto.DimensaoResponse
import br.com.madeireira.modules.produto.api.dto.PrecificacaoResponse
import br.com.madeireira.modules.produto.api.dto.ProdutoResponse
import br.com.madeireira.modules.produto.api.dto.SalvarPrecificacaoRequest
import br.com.madeireira.modules.produto.api.dto.UnidadeMedidaResponse
import br.com.madeireira.modules.produto.infrastructure.UnidadeMedidaInfo
import br.com.madeireira.modules.produto.domain.model.DimensaoMadeira
import br.com.madeireira.modules.produto.domain.model.PrecificacaoProduto
import br.com.madeireira.modules.produto.domain.model.Produto
import br.com.madeireira.modules.produto.domain.model.TipoProduto
import br.com.madeireira.modules.produto.infrastructure.DimensaoMadeiraTable
import br.com.madeireira.modules.produto.infrastructure.ProdutoRepository
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.update
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

class ProdutoService(private val repo: ProdutoRepository) {

    suspend fun listar(apenasAtivos: Boolean = true, q: String? = null): List<ProdutoResponse> {
        val ativo = if (apenasAtivos) true else null
        val produtos = repo.findAll(ativo, q)
        return produtos.map { toResponse(it) }
    }

    suspend fun buscarPorId(id: UUID): ProdutoResponse {
        val produto = repo.findById(id)
            ?: throw NoSuchElementException("Produto não encontrado: $id")
        return toResponse(produto)
    }

    suspend fun listarUnidades(): List<UnidadeMedidaResponse> =
        repo.listarUnidades().map { toUnidadeResponse(it) }

    suspend fun criar(req: CriarProdutoRequest): ProdutoResponse {
        require(req.codigo.isNotBlank()) { "Código é obrigatório" }
        require(req.descricao.isNotBlank()) { "Descrição é obrigatória" }
        require(req.ncm.isNotBlank()) { "NCM é obrigatório" }

        val tipo = try {
            TipoProduto.valueOf(req.tipo.uppercase())
        } catch (e: IllegalArgumentException) {
            throw IllegalArgumentException("Tipo inválido: '${req.tipo}'. Use MADEIRA ou NORMAL")
        }

        if (tipo == TipoProduto.MADEIRA) {
            require(req.espessuraM != null && req.espessuraM > 0) {
                "Espessura é obrigatória e deve ser positiva para produto do tipo MADEIRA (ex: 0.05 para 5cm)"
            }
            require(req.larguraM != null && req.larguraM > 0) {
                "Largura é obrigatória e deve ser positiva para produto do tipo MADEIRA (ex: 0.20 para 20cm)"
            }
        }

        val existente = repo.findByCodigo(req.codigo)
        require(existente == null) { "Já existe um produto com o código '${req.codigo}'" }

        // Resolve unidade de venda: MADEIRA → "M" (metro linear comercial); NORMAL → sigla fornecida ou "UN"
        val siglaSolicitada = req.unidadeVendaSigla?.uppercase()?.trim()
            ?: if (tipo == TipoProduto.MADEIRA) "M" else "UN"
        val unidadeId = repo.findUnidadeIdBySigla(siglaSolicitada)
            ?: throw IllegalArgumentException("Unidade de medida '$siglaSolicitada' não encontrada")

        // Resolve grupo fiscal: MADEIRA → MAD-BRUTA, NORMAL → FERRAG (padrão operacional)
        val codigoGrupoFiscal = if (tipo == TipoProduto.MADEIRA) "MAD-BRUTA" else "FERRAG"
        val grupoFiscalId = repo.findGrupoFiscalByCodigo(codigoGrupoFiscal)
            ?: throw IllegalStateException(
                "Grupo fiscal '$codigoGrupoFiscal' não encontrado. Execute as migrations de seed."
            )

        if (req.comprimentoPecaM != null) {
            require(req.comprimentoPecaM > 0) {
                "Comprimento da peça deve ser positivo (em metros, ex: 10.0)"
            }
            require(tipo == TipoProduto.MADEIRA) {
                "Comprimento de peça só é aplicável a produtos do tipo MADEIRA"
            }
        }

        val now = Instant.now()
        val precoVenda = req.precoVenda?.let {
            require(it > 0) { "Preço de venda deve ser positivo" }
            java.math.BigDecimal(it)
        }

        val produto = Produto(
            id                        = UUID.randomUUID(),
            codigo                    = req.codigo.trim(),
            descricao                 = req.descricao.trim(),
            unidadeMedidaId           = unidadeId,
            unidadeVendaSigla         = siglaSolicitada,
            tipo                      = tipo,
            ncm                       = req.ncm.trim(),
            grupoFiscalId             = grupoFiscalId,
            ativo                     = true,
            createdAt                 = now,
            updatedAt                 = now,
            controlarConversaoMadeira = req.controlarConversaoMadeira ?: true,
            comprimentoPecaM          = req.comprimentoPecaM?.takeIf { it > 0 },
            precoVenda                = precoVenda,
        )

        val salvo = repo.create(produto)

        if (tipo == TipoProduto.MADEIRA) {
            // API recebe metros (ex: 0.05), converte para mm (ex: 50) internamente
            val espessuraMm = Math.round(req.espessuraM!! * 1000).toInt()
            val larguraMm   = Math.round(req.larguraM!! * 1000).toInt()
            val espessura   = BigDecimal(espessuraMm)
            val largura     = BigDecimal(larguraMm)
            val fator       = ConversionEngine.calcularFator(espessura, largura)

            val dimensao = DimensaoMadeira(
                id             = UUID.randomUUID(),
                produtoId      = salvo.id,
                espessuraMm    = espessuraMm,
                larguraMm      = larguraMm,
                fatorConversao = fator,
                vigenteDesde   = now,
                vigenteAte     = null,
            )
            repo.createDimensao(dimensao)
        }

        return toResponse(salvo)
    }

    suspend fun atualizar(id: UUID, req: AtualizarProdutoRequest): ProdutoResponse {
        require(req.descricao.isNotBlank()) { "Descrição é obrigatória" }
        require(req.ncm.isNotBlank()) { "NCM é obrigatório" }

        val produto = repo.findById(id)
            ?: throw NoSuchElementException("Produto não encontrado: $id")

        if (req.comprimentoPecaM != null && req.comprimentoPecaM > 0) {
            require(produto.tipo == TipoProduto.MADEIRA) {
                "Comprimento de peça só é aplicável a produtos do tipo MADEIRA"
            }
        }

        // comprimentoPecaM: null = não alterar; 0.0 = remover; >0 = atualizar
        val novoComprimento = when {
            req.comprimentoPecaM == null  -> produto.comprimentoPecaM
            req.comprimentoPecaM <= 0.0   -> null
            else                          -> req.comprimentoPecaM
        }

        // precoVenda: null = não alterar; 0.0 = remover; >0 = atualizar
        val novoPreco = when {
            req.precoVenda == null  -> produto.precoVenda
            req.precoVenda <= 0.0   -> null
            else                    -> java.math.BigDecimal(req.precoVenda)
        }

        val atualizado = produto.copy(
            descricao        = req.descricao.trim(),
            ncm              = req.ncm.trim(),
            comprimentoPecaM = novoComprimento,
            precoVenda       = novoPreco,
            updatedAt        = Instant.now(),
        )
        val salvo = repo.update(atualizado)
        return toResponse(salvo)
    }

    suspend fun atualizarPreco(id: UUID, req: AtualizarPrecoRequest): ProdutoResponse {
        val produto = repo.findById(id)
            ?: throw NoSuchElementException("Produto não encontrado: $id")

        val novoPreco = when {
            req.preco == null || req.preco <= 0.0 -> null
            else -> java.math.BigDecimal(req.preco)
        }

        val atualizado = produto.copy(precoVenda = novoPreco, updatedAt = Instant.now())
        val salvo = repo.update(atualizado)
        return toResponse(salvo)
    }

    suspend fun inativar(id: UUID): ProdutoResponse {
        val produto = repo.findById(id)
            ?: throw NoSuchElementException("Produto não encontrado: $id")

        val inativado = produto.copy(ativo = false, updatedAt = Instant.now())
        val salvo = repo.update(inativado)
        return toResponse(salvo)
    }

    suspend fun atualizarDimensao(produtoId: UUID, req: AtualizarDimensaoRequest): DimensaoResponse {
        require(req.espessuraM > 0) { "Espessura deve ser positiva (em metros, ex: 0.05)" }
        require(req.larguraM > 0) { "Largura deve ser positiva (em metros, ex: 0.20)" }

        val produto = repo.findById(produtoId)
            ?: throw NoSuchElementException("Produto não encontrado: $produtoId")

        require(produto.tipo == TipoProduto.MADEIRA) {
            "Dimensão só pode ser cadastrada para produtos do tipo MADEIRA"
        }

        // API recebe metros, converte para mm internamente
        val espessuraMm = Math.round(req.espessuraM * 1000).toInt()
        val larguraMm   = Math.round(req.larguraM * 1000).toInt()
        val espessura   = BigDecimal(espessuraMm)
        val largura     = BigDecimal(larguraMm)
        val fator       = ConversionEngine.calcularFator(espessura, largura)
        val now         = Instant.now()

        // SCD Tipo 2: fecha a dimensão vigente anterior
        val dimensaoAtual = repo.findDimensaoVigente(produtoId)
        if (dimensaoAtual != null) {
            dbQuery {
                DimensaoMadeiraTable.update({ DimensaoMadeiraTable.id eq dimensaoAtual.id }) {
                    it[DimensaoMadeiraTable.vigenteAte] = now.toKotlinInstant()
                }
            }
        }

        val novaDimensao = DimensaoMadeira(
            id             = UUID.randomUUID(),
            produtoId      = produtoId,
            espessuraMm    = espessuraMm,
            larguraMm      = larguraMm,
            fatorConversao = fator,
            vigenteDesde   = now,
            vigenteAte     = null,
        )

        repo.createDimensao(novaDimensao)

        return toDimensaoResponse(novaDimensao)
    }

    // --- Precificação ---

    suspend fun buscarPrecificacao(produtoId: UUID): PrecificacaoResponse {
        repo.findById(produtoId)
            ?: throw NoSuchElementException("Produto não encontrado: $produtoId")
        val itens = repo.findPrecificacao(produtoId)
        val map   = itens.associateBy { "${it.tipoPessoa}_${it.tipoPag}" }
        return PrecificacaoResponse(
            pfVista = map["PF_VISTA"]?.preco?.toPlainString(),
            pfPrazo = map["PF_PRAZO"]?.preco?.toPlainString(),
            pjVista = map["PJ_VISTA"]?.preco?.toPlainString(),
            pjPrazo = map["PJ_PRAZO"]?.preco?.toPlainString(),
        )
    }

    suspend fun salvarPrecificacao(produtoId: UUID, req: SalvarPrecificacaoRequest): PrecificacaoResponse {
        repo.findById(produtoId)
            ?: throw NoSuchElementException("Produto não encontrado: $produtoId")

        val itens = listOfNotNull(
            req.pfVista?.takeIf { it > 0 }?.let { PrecificacaoProduto(produtoId, "PF", "VISTA", java.math.BigDecimal(it)) },
            req.pfPrazo?.takeIf { it > 0 }?.let { PrecificacaoProduto(produtoId, "PF", "PRAZO", java.math.BigDecimal(it)) },
            req.pjVista?.takeIf { it > 0 }?.let { PrecificacaoProduto(produtoId, "PJ", "VISTA", java.math.BigDecimal(it)) },
            req.pjPrazo?.takeIf { it > 0 }?.let { PrecificacaoProduto(produtoId, "PJ", "PRAZO", java.math.BigDecimal(it)) },
        )

        repo.upsertPrecificacao(produtoId, itens)
        return buscarPrecificacao(produtoId)
    }

    // --- Helpers ---

    private suspend fun toResponse(produto: Produto): ProdutoResponse {
        val dimensao = if (produto.tipo == TipoProduto.MADEIRA) {
            repo.findDimensaoVigente(produto.id)?.let { toDimensaoResponse(it) }
        } else null

        val (unidadeCompra, unidadeEstoque, unidadeFiscal) = if (produto.tipo == TipoProduto.MADEIRA) {
            Triple("m³", "metro linear (m)", "m³")
        } else {
            Triple(produto.unidadeVendaSigla, produto.unidadeVendaSigla, produto.unidadeVendaSigla)
        }

        return ProdutoResponse(
            id                        = produto.id.toString(),
            codigo                    = produto.codigo,
            descricao                 = produto.descricao,
            tipo                      = produto.tipo.name,
            ncm                       = produto.ncm,
            unidadeVendaSigla         = produto.unidadeVendaSigla,
            ativo                     = produto.ativo,
            dimensaoVigente           = dimensao,
            controlarConversaoMadeira = produto.controlarConversaoMadeira,
            comprimentoPecaM          = produto.comprimentoPecaM,
            unidadeCompra             = unidadeCompra,
            unidadeEstoque            = unidadeEstoque,
            unidadeFiscal             = unidadeFiscal,
            precoVenda                = produto.precoVenda?.toPlainString(),
        )
    }

    private fun toUnidadeResponse(u: UnidadeMedidaInfo) = UnidadeMedidaResponse(
        id            = u.id,
        codigo        = u.codigo,
        descricao     = u.descricao,
        tipo          = u.tipo,
        casasDecimais = u.casasDecimais,
    )

    private fun toDimensaoResponse(dim: DimensaoMadeira): DimensaoResponse {
        val metrosLinear = ConversionEngine.m3ParaLinear(BigDecimal.ONE, dim.fatorConversao)
        return DimensaoResponse(
            espessuraM        = dim.espessuraMm / 1000.0,
            larguraM          = dim.larguraMm / 1000.0,
            fatorConversao    = dim.fatorConversao.toPlainString(),
            metrosLinearPorM3 = metrosLinear.toPlainString(),
        )
    }
}

private fun Instant.toKotlinInstant(): kotlinx.datetime.Instant =
    kotlinx.datetime.Instant.fromEpochMilliseconds(this.toEpochMilli())
