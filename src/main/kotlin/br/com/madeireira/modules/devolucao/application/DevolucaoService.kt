package br.com.madeireira.modules.devolucao.application

import br.com.madeireira.core.conversion.ConversionEngine
import br.com.madeireira.modules.devolucao.api.dto.*
import br.com.madeireira.modules.devolucao.domain.model.Devolucao
import br.com.madeireira.modules.devolucao.domain.model.ItemDevolucao
import br.com.madeireira.modules.devolucao.infrastructure.DevolucaoRepository
import br.com.madeireira.modules.estoque.domain.model.MovimentacaoEstoque
import br.com.madeireira.modules.estoque.infrastructure.EstoqueRepository
import br.com.madeireira.modules.produto.domain.model.TipoProduto
import br.com.madeireira.modules.produto.infrastructure.ProdutoRepository
import br.com.madeireira.modules.venda.domain.model.StatusVenda
import br.com.madeireira.modules.venda.infrastructure.VendaRepository
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.util.UUID

private val DEPOSITO_PADRAO = UUID.fromString("00000000-0000-0000-0000-000000000030")

class DevolucaoService(
    private val devolucaoRepo: DevolucaoRepository,
    private val vendaRepo: VendaRepository,
    private val estoqueRepo: EstoqueRepository,
    private val produtoRepo: ProdutoRepository,
) {
    /** Retorna os itens de uma venda com detalhes de produto — alimenta o modal. */
    suspend fun buscarItensVenda(vendaId: UUID): List<ItemVendaDetalheResponse> {
        vendaRepo.findVendaById(vendaId)
            ?: throw NoSuchElementException("Venda não encontrada: $vendaId")

        val itens = vendaRepo.findItensByVendaId(vendaId)
        return itens.map { item ->
            val produto = produtoRepo.findById(item.produtoId)
            ItemVendaDetalheResponse(
                itemVendaId           = item.id.toString(),
                produtoCodigo         = produto?.codigo ?: "",
                produtoDescricao      = produto?.descricao ?: "",
                tipoProduto           = item.tipoProduto.name,
                quantidadeMetroLinear = item.quantidadeMetroLinear?.toPlainString(),
                volumeM3Calculado     = item.volumeM3Calculado?.toPlainString(),
                quantidadeUnidade     = item.quantidadeUnidade?.toPlainString(),
                unidadeSigla          = if (item.tipoProduto == TipoProduto.NORMAL) produto?.unidadeVendaSigla else null,
                precoUnitario         = item.precoUnitario.toPlainString(),
                valorTotalItem        = item.valorTotalItem.toPlainString(),
            )
        }
    }

    /** Registra a devolução, reverte o estoque e atualiza o status da venda. */
    suspend fun registrarDevolucao(vendaId: UUID, req: RegistrarDevolucaoRequest): DevolucaoResponse {
        val venda = vendaRepo.findVendaById(vendaId)
            ?: throw NoSuchElementException("Venda não encontrada: $vendaId")

        require(venda.status in listOf(StatusVenda.CONFIRMADO, StatusVenda.CONCLUIDO, StatusVenda.DEVOLVIDO_PARCIAL)) {
            "Venda ${venda.numero} não pode ter devolução (status: ${venda.status})"
        }
        require(req.itens.isNotEmpty()) { "Informe pelo menos um item para devolver" }

        val itensVenda = vendaRepo.findItensByVendaId(vendaId).associateBy { it.id }
        val now        = Instant.now()
        val devolucaoId = UUID.randomUUID()
        val numero     = "DEV-${System.currentTimeMillis()}"

        // Processamento e validação de cada item
        data class ItemProcessado(
            val domainItem: ItemDevolucao,
            val dto: ItemDevolucaoResponse,
            val produtoId: UUID,
            val tipoProduto: TipoProduto,
            val dimensaoId: UUID?,
            val volumeM3: BigDecimal?,
            val qtdUnidade: BigDecimal?,
        )

        var valorTotalDev = BigDecimal.ZERO
        val itensProcessados = mutableListOf<ItemProcessado>()

        for (itemReq in req.itens) {
            val itemVendaId = UUID.fromString(itemReq.itemVendaId)
            val itemVenda   = itensVenda[itemVendaId]
                ?: throw NoSuchElementException("Item de venda não encontrado: $itemVendaId")

            val qtdSolicitada = BigDecimal(itemReq.quantidade)
            require(qtdSolicitada > BigDecimal.ZERO) { "Quantidade deve ser positiva" }

            val produto = produtoRepo.findById(itemVenda.produtoId)

            val (volumeM3, qtdLinear, qtdUnidade, valorDevolvido) = if (itemVenda.tipoProduto == TipoProduto.MADEIRA) {
                val metrosVendidos = itemVenda.quantidadeMetroLinear
                    ?: throw IllegalStateException("Metros lineares não definidos para o item")
                require(qtdSolicitada <= metrosVendidos) {
                    "Devolução de ${qtdSolicitada.toPlainString()} m excede o vendido (${metrosVendidos.toPlainString()} m)"
                }
                val fator = itemVenda.fatorConversaoUsado ?: BigDecimal.ONE
                val vol   = ConversionEngine.linearParaM3(qtdSolicitada, fator)
                val valor = qtdSolicitada.multiply(itemVenda.precoUnitario).setScale(2, RoundingMode.HALF_UP)
                arrayOf<Any?>(vol, qtdSolicitada, null, valor)
            } else {
                val qtdVendida = itemVenda.quantidadeUnidade
                    ?: throw IllegalStateException("Quantidade não definida para o item")
                require(qtdSolicitada <= qtdVendida) {
                    "Devolução de ${qtdSolicitada.toPlainString()} excede o vendido (${qtdVendida.toPlainString()})"
                }
                val valor = qtdSolicitada.multiply(itemVenda.precoUnitario).setScale(2, RoundingMode.HALF_UP)
                arrayOf<Any?>(null, null, qtdSolicitada, valor)
            }

            @Suppress("UNCHECKED_CAST")
            val valorItem = valorDevolvido as BigDecimal
            valorTotalDev = valorTotalDev.add(valorItem)

            itensProcessados.add(ItemProcessado(
                domainItem = ItemDevolucao(
                    id                 = UUID.randomUUID(),
                    devolucaoId        = devolucaoId,
                    itemVendaId        = itemVendaId,
                    quantidadeMLinear  = qtdLinear as? BigDecimal,
                    volumeM3           = volumeM3 as? BigDecimal,
                    quantidadeUnidade  = qtdUnidade as? BigDecimal,
                    valorDevolvido     = valorItem,
                ),
                dto = ItemDevolucaoResponse(
                    itemVendaId      = itemVendaId.toString(),
                    produtoDescricao = produto?.descricao ?: "",
                    quantidadeMLinear = (qtdLinear as? BigDecimal)?.toPlainString(),
                    volumeM3          = (volumeM3 as? BigDecimal)?.toPlainString(),
                    quantidadeUnidade = (qtdUnidade as? BigDecimal)?.toPlainString(),
                    valorDevolvido    = valorItem.toPlainString(),
                ),
                produtoId   = itemVenda.produtoId,
                tipoProduto = itemVenda.tipoProduto,
                dimensaoId  = itemVenda.dimensaoId,
                volumeM3    = volumeM3 as? BigDecimal,
                qtdUnidade  = qtdUnidade as? BigDecimal,
            ))
        }

        // Persiste devolução
        val devolucao = Devolucao(
            id         = devolucaoId,
            vendaId    = vendaId,
            numero     = numero,
            motivo     = req.motivo?.trim(),
            valorTotal = valorTotalDev,
            createdAt  = now,
        )
        devolucaoRepo.criar(devolucao)
        itensProcessados.forEach { devolucaoRepo.criarItem(it.domainItem) }

        // Reverte estoque
        for (proc in itensProcessados) {
            if (proc.tipoProduto == TipoProduto.MADEIRA) {
                val vol      = proc.volumeM3!!
                val saldo    = estoqueRepo.findSaldo(proc.produtoId, DEPOSITO_PADRAO)
                val antes    = saldo?.saldoM3Disponivel ?: BigDecimal.ZERO
                val depois   = antes.add(vol)
                estoqueRepo.upsertSaldo(
                    (saldo ?: criarSaldoZerado(proc.produtoId)).copy(
                        saldoM3Total      = (saldo?.saldoM3Total ?: BigDecimal.ZERO).add(vol),
                        saldoM3Disponivel = depois,
                        dataUltimaAtualizacao = now,
                    )
                )
                estoqueRepo.insertMovimentacao(MovimentacaoEstoque(
                    id                = UUID.randomUUID(),
                    produtoId         = proc.produtoId,
                    depositoId        = DEPOSITO_PADRAO,
                    subloteId         = null,
                    dimensaoId        = proc.dimensaoId,
                    tipoMovimentacao  = "DEVOLUCAO_ENTRADA",
                    quantidadeM3      = vol,
                    quantidadeUnidade = null,
                    sinal             = "POSITIVO",
                    custoUnitario     = null,
                    dataHora          = now,
                    observacao        = "Devolução $numero",
                    saldoAntesM3      = antes,
                    saldoDepoisM3     = depois,
                ))
            } else {
                val qtd    = proc.qtdUnidade!!
                val saldo  = estoqueRepo.findSaldo(proc.produtoId, DEPOSITO_PADRAO)
                val antes  = saldo?.saldoUnidadeDisponivel ?: BigDecimal.ZERO
                val depois = antes.add(qtd)
                estoqueRepo.upsertSaldo(
                    (saldo ?: criarSaldoZerado(proc.produtoId)).copy(
                        saldoUnidadeTotal      = (saldo?.saldoUnidadeTotal ?: BigDecimal.ZERO).add(qtd),
                        saldoUnidadeDisponivel = depois,
                        dataUltimaAtualizacao  = now,
                    )
                )
                estoqueRepo.insertMovimentacao(MovimentacaoEstoque(
                    id                = UUID.randomUUID(),
                    produtoId         = proc.produtoId,
                    depositoId        = DEPOSITO_PADRAO,
                    subloteId         = null,
                    dimensaoId        = null,
                    tipoMovimentacao  = "DEVOLUCAO_ENTRADA",
                    quantidadeM3      = null,
                    quantidadeUnidade = qtd,
                    sinal             = "POSITIVO",
                    custoUnitario     = null,
                    dataHora          = now,
                    observacao        = "Devolução $numero",
                    saldoAntesM3      = null,
                    saldoDepoisM3     = null,
                ))
            }
        }

        // Determina novo status da venda
        val todosItens = vendaRepo.findItensByVendaId(vendaId)
        val qtdItensDevolvidos = req.itens.size
        val novoStatus = if (qtdItensDevolvidos >= todosItens.size) StatusVenda.DEVOLVIDO else StatusVenda.DEVOLVIDO_PARCIAL
        vendaRepo.updateStatus(vendaId, novoStatus)

        return DevolucaoResponse(
            id          = devolucaoId.toString(),
            vendaId     = vendaId.toString(),
            vendaNumero = venda.numero,
            numero      = numero,
            motivo      = req.motivo,
            valorTotal  = valorTotalDev.toPlainString(),
            createdAt   = now.toString(),
            itens       = itensProcessados.map { it.dto },
        )
    }

    private fun criarSaldoZerado(produtoId: UUID) = br.com.madeireira.modules.estoque.domain.model.EstoqueSaldo(
        id                     = UUID.randomUUID(),
        produtoId              = produtoId,
        depositoId             = DEPOSITO_PADRAO,
        saldoM3Total           = BigDecimal.ZERO,
        saldoM3Disponivel      = BigDecimal.ZERO,
        saldoM3Reservado       = BigDecimal.ZERO,
        saldoUnidadeTotal      = BigDecimal.ZERO,
        saldoUnidadeDisponivel = BigDecimal.ZERO,
        custoMedioM3           = null,
        versao                 = 0,
        dataUltimaAtualizacao  = Instant.now(),
    )
}
