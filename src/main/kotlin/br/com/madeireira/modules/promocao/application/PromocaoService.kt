package br.com.madeireira.modules.promocao.application

import br.com.madeireira.modules.promocao.domain.EscopoPromocao
import br.com.madeireira.modules.promocao.domain.ItemComDesconto
import br.com.madeireira.modules.promocao.domain.Promocao
import br.com.madeireira.modules.promocao.domain.ResultadoCalculo
import br.com.madeireira.modules.promocao.domain.TipoPromocao
import br.com.madeireira.modules.promocao.infrastructure.PromocaoRepository
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class ItemCalculo(
    val produtoId:     UUID,
    val quantidade:    BigDecimal,     // metros lineares (MADEIRA) ou unidades (NORMAL)
    val precoUnitario: BigDecimal,
)

class PromocaoService(private val repo: PromocaoRepository) {

    // ── CRUD ──────────────────────────────────────────────────────────────────

    suspend fun listar() = repo.findAll()

    suspend fun buscarPorId(id: UUID) = repo.findById(id)
        ?: throw NoSuchElementException("Promoção não encontrada: $id")

    suspend fun listarAtivas(data: LocalDate = LocalDate.now()) = repo.findAtivas(data)

    suspend fun listarAtivasPorProduto(produtoId: UUID, data: LocalDate = LocalDate.now()) =
        repo.findAtivasPorProduto(produtoId, data)

    suspend fun criar(
        nome:               String,
        descricao:          String?,
        tipo:               TipoPromocao,
        valor:              BigDecimal,
        escopo:             EscopoPromocao,
        dataInicio:         LocalDate?,
        dataFim:            LocalDate?,
        quantidadeMinima:   BigDecimal?,
        valorMinimoPedido:  BigDecimal?,
        produtoIds:         List<UUID>,
    ): Promocao {
        validarValor(tipo, valor)
        require(nome.isNotBlank()) { "Nome da promoção é obrigatório" }
        if (dataInicio != null && dataFim != null) {
            require(!dataFim.isBefore(dataInicio)) { "Data fim não pode ser anterior à data início" }
        }
        if (escopo == EscopoPromocao.PRODUTO) {
            require(produtoIds.isNotEmpty()) { "Informe ao menos um produto para promoção de escopo PRODUTO" }
        }

        val promocao = Promocao(
            id                = UUID.randomUUID(),
            nome              = nome,
            descricao         = descricao,
            tipo              = tipo,
            valor             = valor,
            escopo            = escopo,
            ativo             = true,
            dataInicio        = dataInicio,
            dataFim           = dataFim,
            quantidadeMinima  = quantidadeMinima,
            valorMinimoPedido = valorMinimoPedido,
            produtoIds        = if (escopo == EscopoPromocao.PRODUTO) produtoIds else emptyList(),
            createdAt         = Instant.now(),
        )
        return repo.criar(promocao)
    }

    suspend fun atualizar(
        id:                 UUID,
        nome:               String,
        descricao:          String?,
        tipo:               TipoPromocao,
        valor:              BigDecimal,
        escopo:             EscopoPromocao,
        ativo:              Boolean,
        dataInicio:         LocalDate?,
        dataFim:            LocalDate?,
        quantidadeMinima:   BigDecimal?,
        valorMinimoPedido:  BigDecimal?,
        produtoIds:         List<UUID>,
    ): Promocao {
        val existente = buscarPorId(id)
        validarValor(tipo, valor)
        if (escopo == EscopoPromocao.PRODUTO) {
            require(produtoIds.isNotEmpty()) { "Informe ao menos um produto para promoção de escopo PRODUTO" }
        }

        return repo.atualizar(
            existente.copy(
                nome              = nome,
                descricao         = descricao,
                tipo              = tipo,
                valor             = valor,
                escopo            = escopo,
                ativo             = ativo,
                dataInicio        = dataInicio,
                dataFim           = dataFim,
                quantidadeMinima  = quantidadeMinima,
                valorMinimoPedido = valorMinimoPedido,
                produtoIds        = if (escopo == EscopoPromocao.PRODUTO) produtoIds else emptyList(),
            )
        )
    }

    suspend fun desativar(id: UUID) {
        buscarPorId(id)   // garante que existe
        repo.desativar(id)
    }

    // ── Cálculo de desconto ───────────────────────────────────────────────────

    /**
     * Calcula descontos para uma lista de itens do carrinho.
     *
     * Regras de prioridade:
     * 1. Promoções de escopo PRODUTO batem promoções GLOBAL para o mesmo produto
     * 2. Em empate de escopo, ganha a que oferece maior desconto absoluto
     * 3. Uma única promoção por item (sem stacking)
     */
    suspend fun calcular(
        itens: List<ItemCalculo>,
        hoje: LocalDate = LocalDate.now(),
    ): ResultadoCalculo {
        val valorTotalPedido = itens.sumOf { it.quantidade * it.precoUnitario }

        val itensComDesconto = itens.map { item ->
            val promocoes = repo.findAtivasPorProduto(item.produtoId, hoje)

            val melhor = promocoes
                .filter { p -> atendeMinimoQtd(p, item.quantidade) }
                .filter { p -> atendeMinimoValor(p, valorTotalPedido) }
                .maxByOrNull { p -> calcularDesconto(p, item.precoUnitario) }

            if (melhor == null) {
                ItemComDesconto(
                    produtoId          = item.produtoId,
                    precoOriginal      = item.precoUnitario,
                    precoFinal         = item.precoUnitario,
                    desconto           = BigDecimal.ZERO,
                    percentualDesconto = BigDecimal.ZERO,
                    promocaoId         = null,
                    promocaoNome       = null,
                )
            } else {
                val desconto  = calcularDesconto(melhor, item.precoUnitario)
                val precoFinal = (item.precoUnitario - desconto).max(BigDecimal.ZERO)
                    .setScale(4, RoundingMode.HALF_UP)
                val pct = if (item.precoUnitario > BigDecimal.ZERO)
                    desconto.divide(item.precoUnitario, 6, RoundingMode.HALF_UP)
                        .multiply(BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
                else BigDecimal.ZERO

                ItemComDesconto(
                    produtoId          = item.produtoId,
                    precoOriginal      = item.precoUnitario,
                    precoFinal         = precoFinal,
                    desconto           = desconto.setScale(4, RoundingMode.HALF_UP),
                    percentualDesconto = pct,
                    promocaoId         = melhor.id,
                    promocaoNome       = melhor.nome,
                )
            }
        }

        val valorOriginal  = itens.sumOf { it.quantidade * it.precoUnitario }
        val valorFinal     = itensComDesconto.zip(itens).sumOf { (icd, orig) -> orig.quantidade * icd.precoFinal }
        val descontoTotal  = valorOriginal - valorFinal

        return ResultadoCalculo(
            itens         = itensComDesconto,
            valorOriginal = valorOriginal.setScale(2, RoundingMode.HALF_UP),
            descontoTotal = descontoTotal.setScale(2, RoundingMode.HALF_UP),
            valorFinal    = valorFinal.setScale(2, RoundingMode.HALF_UP),
        )
    }

    // ── Internos ──────────────────────────────────────────────────────────────

    private fun calcularDesconto(p: Promocao, precoOriginal: BigDecimal): BigDecimal =
        when (p.tipo) {
            TipoPromocao.DESCONTO_PERCENTUAL ->
                precoOriginal.multiply(p.valor).divide(BigDecimal("100"), 4, RoundingMode.HALF_UP)
            TipoPromocao.DESCONTO_FIXO ->
                p.valor.min(precoOriginal)   // não deixa preço negativo
            TipoPromocao.PRECO_FIXO ->
                (precoOriginal - p.valor).max(BigDecimal.ZERO)
        }

    private fun atendeMinimoQtd(p: Promocao, quantidade: BigDecimal): Boolean =
        p.quantidadeMinima == null || quantidade >= p.quantidadeMinima

    private fun atendeMinimoValor(p: Promocao, valorPedido: BigDecimal): Boolean =
        p.valorMinimoPedido == null || valorPedido >= p.valorMinimoPedido

    private fun validarValor(tipo: TipoPromocao, valor: BigDecimal) {
        require(valor > BigDecimal.ZERO) { "Valor da promoção deve ser maior que zero" }
        if (tipo == TipoPromocao.DESCONTO_PERCENTUAL) {
            require(valor <= BigDecimal("100")) { "Desconto percentual não pode ultrapassar 100%" }
        }
    }
}
