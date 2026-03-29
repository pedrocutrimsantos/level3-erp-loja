package br.com.madeireira.modules.compra.application

import br.com.madeireira.core.conversion.ConversionEngine
import br.com.madeireira.modules.compra.api.dto.EntradaCompraRequest
import br.com.madeireira.modules.compra.api.dto.EntradaCompraResponse
import br.com.madeireira.modules.compra.api.dto.EntradaListItemResponse
import br.com.madeireira.modules.estoque.domain.model.EstoqueSaldo
import br.com.madeireira.modules.estoque.domain.model.MovimentacaoEstoque
import br.com.madeireira.modules.estoque.domain.model.TipoMovimentacao
import br.com.madeireira.modules.estoque.infrastructure.EstoqueRepository
import br.com.madeireira.modules.financeiro.application.TituloService
import br.com.madeireira.modules.financeiro.domain.model.FormaPagamento
import br.com.madeireira.modules.produto.domain.model.Produto
import br.com.madeireira.modules.produto.domain.model.TipoProduto
import br.com.madeireira.modules.produto.infrastructure.ProdutoRepository
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

private val DEPOSITO_PADRAO = UUID.fromString("00000000-0000-0000-0000-000000000030")

class CompraService(
    private val estoqueRepo: EstoqueRepository,
    private val produtoRepo: ProdutoRepository,
    private val tituloService: TituloService? = null,
) {
    suspend fun registrarEntrada(req: EntradaCompraRequest): EntradaCompraResponse {
        val produtoId = UUID.fromString(req.produtoId)
        val quantidade = BigDecimal(req.quantidade)

        require(quantidade > BigDecimal.ZERO) { "Quantidade deve ser positiva" }

        val produto = produtoRepo.findById(produtoId)
            ?: throw NoSuchElementException("Produto não encontrado: $produtoId")

        val now = Instant.now()

        val resp = if (produto.tipo == TipoProduto.MADEIRA) {
            registrarEntradaMadeira(produtoId, quantidade, req, now)
        } else {
            registrarEntradaNormal(produto.id, produto.unidadeVendaSigla, quantidade, req, now)
        }

        val tituloPagarNumero = gerarTituloPagar(req, quantidade)
        return resp.copy(tituloPagarNumero = tituloPagarNumero)
    }

    private suspend fun gerarTituloPagar(req: EntradaCompraRequest, quantidade: BigDecimal): String? {
        val svc = tituloService ?: return null
        val fornecedorId = req.fornecedorId?.let { runCatching { UUID.fromString(it) }.getOrNull() } ?: return null
        val custo = req.custoUnitario?.let { runCatching { BigDecimal(it) }.getOrNull() } ?: return null
        val valorTotal = quantidade.multiply(custo)
        if (valorTotal <= BigDecimal.ZERO) return null

        val vencimento = req.dataVencimento?.let {
            runCatching { LocalDate.parse(it) }.getOrNull()
        } ?: LocalDate.now().plusDays(30)

        val forma = req.formaPagamentoPrevisto?.let {
            runCatching { FormaPagamento.valueOf(it) }.getOrNull()
        } ?: FormaPagamento.BOLETO

        val compraId = UUID.randomUUID()
        val compraNumero = System.currentTimeMillis().toString().takeLast(8)
        val titulo = svc.criarParaCompra(compraId, compraNumero, fornecedorId, valorTotal, vencimento, forma)
        return titulo.numero
    }

    // -------------------------------------------------------------------------
    // MADEIRA — entrada em m³
    // -------------------------------------------------------------------------

    private suspend fun registrarEntradaMadeira(
        produtoId: UUID,
        quantidadeM3: BigDecimal,
        req: EntradaCompraRequest,
        now: Instant,
    ): EntradaCompraResponse {
        val produto = produtoRepo.findById(produtoId)!!
        val dimensao = produtoRepo.findDimensaoVigente(produtoId)
            ?: throw IllegalStateException(
                "Produto ${produto.codigo} (MADEIRA) não tem dimensão cadastrada."
            )

        val saldoAtual = estoqueRepo.findSaldo(produtoId, DEPOSITO_PADRAO) ?: saldoZerado(produtoId)

        val novoCusto = calcularCustoMedio(
            saldoAtual.saldoM3Total,
            saldoAtual.custoMedioM3,
            quantidadeM3,
            req.custoUnitario?.let { BigDecimal(it) },
        )

        val novoSaldo = saldoAtual.copy(
            saldoM3Total      = saldoAtual.saldoM3Total + quantidadeM3,
            saldoM3Disponivel = saldoAtual.saldoM3Disponivel + quantidadeM3,
            custoMedioM3      = novoCusto,
            dataUltimaAtualizacao = now,
        )
        estoqueRepo.upsertSaldo(novoSaldo)

        estoqueRepo.insertMovimentacao(MovimentacaoEstoque(
            id                = UUID.randomUUID(),
            produtoId         = produtoId,
            depositoId        = DEPOSITO_PADRAO,
            subloteId         = null,
            dimensaoId        = dimensao.id,
            tipoMovimentacao  = "ENTRADA_COMPRA",
            quantidadeM3      = quantidadeM3,
            quantidadeUnidade = null,
            sinal             = "POSITIVO",
            custoUnitario     = req.custoUnitario?.let { BigDecimal(it) },
            dataHora          = now,
            observacao        = req.observacao,
            saldoAntesM3      = saldoAtual.saldoM3Disponivel,
            saldoDepoisM3     = novoSaldo.saldoM3Disponivel,
        ))

        val saldoDepois = novoSaldo.saldoM3Disponivel
        val metrosEntrada = ConversionEngine.m3ParaLinear(quantidadeM3, dimensao.fatorConversao)
        val metrosSaldo   = ConversionEngine.m3ParaLinear(saldoDepois, dimensao.fatorConversao)

        return EntradaCompraResponse(
            quantidade              = quantidadeM3.toPlainString(),
            unidadeSigla            = "M3",
            metrosLineares          = metrosEntrada.toPlainString(),
            novoSaldo               = saldoDepois.setScale(4, RoundingMode.HALF_UP).toPlainString(),
            novoSaldoMetrosLineares = metrosSaldo.toPlainString(),
            tipoMovimentacao        = "ENTRADA_COMPRA",
        )
    }

    // -------------------------------------------------------------------------
    // NORMAL — entrada em unidade nativa (KG, UN, M, L…)
    // -------------------------------------------------------------------------

    private suspend fun registrarEntradaNormal(
        produtoId: UUID,
        unidadeSigla: String,
        quantidade: BigDecimal,
        req: EntradaCompraRequest,
        now: Instant,
    ): EntradaCompraResponse {
        val saldoAtual = estoqueRepo.findSaldo(produtoId, DEPOSITO_PADRAO) ?: saldoZerado(produtoId)

        val novoSaldo = saldoAtual.copy(
            saldoUnidadeTotal      = saldoAtual.saldoUnidadeTotal + quantidade,
            saldoUnidadeDisponivel = saldoAtual.saldoUnidadeDisponivel + quantidade,
            dataUltimaAtualizacao  = now,
        )
        estoqueRepo.upsertSaldo(novoSaldo)

        estoqueRepo.insertMovimentacao(MovimentacaoEstoque(
            id                = UUID.randomUUID(),
            produtoId         = produtoId,
            depositoId        = DEPOSITO_PADRAO,
            subloteId         = null, dimensaoId = null,
            tipoMovimentacao  = "ENTRADA_COMPRA",
            quantidadeM3      = null,
            quantidadeUnidade = quantidade,
            sinal             = "POSITIVO",
            custoUnitario     = req.custoUnitario?.let { BigDecimal(it) },
            dataHora          = now,
            observacao        = req.observacao,
            saldoAntesM3      = null,
            saldoDepoisM3     = null,
        ))

        return EntradaCompraResponse(
            quantidade              = quantidade.toPlainString(),
            unidadeSigla            = unidadeSigla,
            metrosLineares          = null,
            novoSaldo               = novoSaldo.saldoUnidadeDisponivel.setScale(4, RoundingMode.HALF_UP).toPlainString(),
            novoSaldoMetrosLineares = null,
            tipoMovimentacao        = "ENTRADA_COMPRA",
        )
    }

    suspend fun listarEntradas(limit: Int = 50): List<EntradaListItemResponse> {
        val movs = estoqueRepo.findMovimentacoesByTipo(TipoMovimentacao.ENTRADA_COMPRA, limit)
        val cache = mutableMapOf<UUID, Produto?>()
        return movs.map { mov ->
            val produto = cache.getOrPut(mov.produtoId) { produtoRepo.findById(mov.produtoId) }
            EntradaListItemResponse(
                id               = mov.id.toString(),
                dataHora         = mov.dataHora.toString(),
                produtoId        = mov.produtoId.toString(),
                produtoCodigo    = produto?.codigo ?: "—",
                produtoDescricao = produto?.descricao ?: "—",
                tipoProduto      = produto?.tipo?.name ?: "NORMAL",
                quantidadeM3     = mov.quantidadeM3?.toPlainString(),
                quantidadeUnidade = mov.quantidadeUnidade?.toPlainString(),
                unidadeSigla     = if (produto?.tipo == TipoProduto.MADEIRA) "M3"
                                   else produto?.unidadeVendaSigla ?: "UN",
                custoUnitario    = mov.custoUnitario?.toPlainString(),
                observacao       = mov.observacao,
            )
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private fun saldoZerado(produtoId: UUID) = EstoqueSaldo(
        id                     = UUID.randomUUID(),
        produtoId              = produtoId,
        depositoId             = DEPOSITO_PADRAO,
        saldoM3Total           = BigDecimal.ZERO,
        saldoM3Disponivel      = BigDecimal.ZERO,
        saldoM3Reservado       = BigDecimal.ZERO,
        saldoUnidadeTotal      = BigDecimal.ZERO,
        saldoUnidadeDisponivel = BigDecimal.ZERO,
        custoMedioM3           = null,
        versao                 = -1,
        dataUltimaAtualizacao  = Instant.now(),
    )

    private fun calcularCustoMedio(
        saldoAnterior: BigDecimal,
        custoAnterior: BigDecimal?,
        novaQtd: BigDecimal,
        novoCusto: BigDecimal?,
    ): BigDecimal? {
        if (novoCusto == null) return custoAnterior
        if (custoAnterior == null || saldoAnterior <= BigDecimal.ZERO) return novoCusto
        val totalAnterior = saldoAnterior.multiply(custoAnterior)
        val totalNovo = novaQtd.multiply(novoCusto)
        val totalQtd = saldoAnterior + novaQtd
        return totalAnterior.add(totalNovo).divide(totalQtd, 4, RoundingMode.HALF_UP)
    }
}
