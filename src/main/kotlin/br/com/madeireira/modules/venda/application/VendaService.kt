package br.com.madeireira.modules.venda.application

import br.com.madeireira.core.conversion.ConversionEngine
import br.com.madeireira.modules.estoque.domain.model.MovimentacaoEstoque
import br.com.madeireira.modules.estoque.infrastructure.EstoqueRepository
import br.com.madeireira.modules.produto.domain.model.Produto
import br.com.madeireira.modules.produto.domain.model.TipoProduto
import br.com.madeireira.modules.produto.infrastructure.ProdutoRepository
import br.com.madeireira.modules.venda.api.dto.ItemVendaRequest
import br.com.madeireira.modules.venda.api.dto.ItemVendaResponse
import br.com.madeireira.modules.venda.api.dto.NfItemData
import br.com.madeireira.modules.venda.api.dto.CaixaDiaResponse
import br.com.madeireira.modules.venda.api.dto.OrcamentoDetalheResponse
import br.com.madeireira.modules.venda.api.dto.OrcamentoItemResponse
import br.com.madeireira.modules.venda.api.dto.ResumoFormaPagamento
import br.com.madeireira.modules.venda.api.dto.VendaBalcaoRequest
import br.com.madeireira.modules.venda.api.dto.VendaBalcaoResponse
import br.com.madeireira.modules.venda.api.dto.VendaCaixaItem
import br.com.madeireira.modules.venda.api.dto.VendaDetalheItemResponse
import br.com.madeireira.modules.venda.api.dto.VendaDetalheResponse
import br.com.madeireira.modules.venda.api.dto.VendaListItemResponse
import br.com.madeireira.modules.venda.domain.model.ItemVenda
import br.com.madeireira.modules.venda.domain.model.StatusItemEntrega
import br.com.madeireira.modules.venda.domain.model.StatusVenda
import br.com.madeireira.modules.venda.domain.model.TipoVenda
import br.com.madeireira.modules.venda.domain.model.Venda
import br.com.madeireira.modules.financeiro.application.TituloService
import br.com.madeireira.modules.financeiro.domain.model.FormaPagamento
import br.com.madeireira.modules.financeiro.domain.model.StatusTurno
import br.com.madeireira.modules.financeiro.infrastructure.TurnoRepository
import br.com.madeireira.modules.venda.infrastructure.VendaRepository
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

class VendaService(
    private val vendaRepo: VendaRepository,
    private val estoqueRepo: EstoqueRepository,
    private val produtoRepo: ProdutoRepository,
    private val tituloService: TituloService? = null,
    private val turnoRepo: TurnoRepository? = null,
) {
    private suspend fun exigirCaixaAberto() {
        if (turnoRepo == null) return
        val turno = turnoRepo.findByData(LocalDate.now())
        require(turno != null && turno.status == StatusTurno.ABERTO) {
            "O caixa não está aberto. Abra o caixa antes de registrar uma venda."
        }
    }

    suspend fun registrarVendaBalcao(req: VendaBalcaoRequest): VendaBalcaoResponse {
        exigirCaixaAberto()
        require(req.itens.isNotEmpty()) { "A venda deve ter pelo menos um item" }

        val now = Instant.now()
        val vendaId = UUID.randomUUID()
        val numero = "BAL-${System.currentTimeMillis()}"

        // Pre-validate all items and compute values before persisting anything
        data class ItemProcessado(
            val item: ItemVenda,
            val produto: Produto,
            val response: ItemVendaResponse,
            val nfItem: NfItemData,
            val volumeM3: BigDecimal,
            val isMadeira: Boolean,
        )

        val itensProcessados = mutableListOf<ItemProcessado>()
        var valorTotal = BigDecimal.ZERO

        for ((index, itemReq) in req.itens.withIndex()) {
            val produtoId = UUID.fromString(itemReq.produtoId)
            val produto = produtoRepo.findById(produtoId)
                ?: throw NoSuchElementException("Produto não encontrado: $produtoId")

            val precoUnitario = BigDecimal(itemReq.precoUnitario)

            val dimensao = if (produto.tipo == TipoProduto.MADEIRA) {
                produtoRepo.findDimensaoVigente(produtoId)
                    ?: throw IllegalStateException(
                        "Produto ${produto.codigo} (MADEIRA) não tem dimensão cadastrada."
                    )
            } else null

            val isMadeira = produto.tipo == TipoProduto.MADEIRA

            val (volumeM3, quantidadeLinear, fatorUsado) = if (isMadeira) {
                val metros = BigDecimal(
                    itemReq.quantidadeMetroLinear
                        ?: throw IllegalArgumentException("quantidadeMetroLinear é obrigatória para MADEIRA")
                )
                require(metros > BigDecimal.ZERO) { "Quantidade deve ser positiva" }
                val vol = ConversionEngine.linearParaM3(metros, dimensao!!.fatorConversao)
                Triple(vol, metros, dimensao.fatorConversao)
            } else {
                val qtd = BigDecimal(
                    itemReq.quantidadeUnidade
                        ?: throw IllegalArgumentException("quantidadeUnidade é obrigatória para produto NORMAL")
                )
                require(qtd > BigDecimal.ZERO) { "Quantidade deve ser positiva" }
                Triple(BigDecimal.ZERO, null, null)
            }

            // Validação de saldo para MADEIRA
            if (isMadeira) {
                val saldo = estoqueRepo.findSaldo(produtoId, DEPOSITO_PADRAO)
                val disponivel = saldo?.saldoM3Disponivel ?: BigDecimal.ZERO
                require(disponivel >= volumeM3) {
                    "Saldo insuficiente para ${produto.codigo}. " +
                    "Disponível: ${disponivel.toPlainString()} m³ " +
                    "(${ConversionEngine.m3ParaLinear(disponivel, dimensao!!.fatorConversao).toPlainString()} m), " +
                    "solicitado: ${volumeM3.toPlainString()} m³ (${quantidadeLinear?.toPlainString()} m)"
                }
            }

            // Validação de saldo para NORMAL
            if (!isMadeira) {
                val qtdUnidade = BigDecimal(itemReq.quantidadeUnidade!!)
                val saldo = estoqueRepo.findSaldo(produtoId, DEPOSITO_PADRAO)
                val disponivel = saldo?.saldoUnidadeDisponivel ?: BigDecimal.ZERO
                require(disponivel >= qtdUnidade) {
                    "Saldo insuficiente para ${produto.codigo}. " +
                    "Disponível: ${disponivel.toPlainString()} ${produto.unidadeVendaSigla}, " +
                    "solicitado: ${qtdUnidade.toPlainString()}"
                }
            }

            val valorItem = if (isMadeira) {
                quantidadeLinear!!.multiply(precoUnitario).setScale(2, RoundingMode.HALF_UP)
            } else {
                BigDecimal(itemReq.quantidadeUnidade!!).multiply(precoUnitario).setScale(2, RoundingMode.HALF_UP)
            }
            valorTotal = valorTotal.add(valorItem)

            val itemVenda = ItemVenda(
                id                    = UUID.randomUUID(),
                vendaId               = vendaId,
                produtoId             = produtoId,
                numeroLinha           = index + 1,
                tipoProduto           = produto.tipo,
                dimensaoId            = dimensao?.id,
                fatorConversaoUsado   = fatorUsado,
                quantidadeMetroLinear = quantidadeLinear,
                volumeM3Calculado     = if (isMadeira) volumeM3 else null,
                quantidadeUnidade     = if (!isMadeira) BigDecimal(itemReq.quantidadeUnidade!!) else null,
                precoUnitario         = precoUnitario,
                valorTotalItem        = valorItem,
                statusEntrega         = StatusItemEntrega.PENDENTE,
            )

            val formula = if (isMadeira) {
                ConversionEngine.formatarFormula(
                    quantidadeLinear!!,
                    fatorUsado!!,
                    BigDecimal(dimensao!!.espessuraMm),
                    BigDecimal(dimensao.larguraMm),
                )
            } else null

            val nfItem = montarNfItem(itemVenda, produto, index + 1)

            itensProcessados.add(ItemProcessado(
                item        = itemVenda,
                produto     = produto,
                response    = ItemVendaResponse(
                    produtoId               = produtoId.toString(),
                    produtoCodigo           = produto.codigo,
                    produtoDescricao        = produto.descricao,
                    tipoProduto             = produto.tipo.name,
                    quantidadeMetroLinear   = quantidadeLinear?.toPlainString(),
                    volumeM3Calculado       = if (isMadeira) volumeM3.toPlainString() else null,
                    quantidadeUnidade       = itemReq.quantidadeUnidade,
                    unidadeSigla            = if (!isMadeira) produto.unidadeVendaSigla else null,
                    formula                 = formula,
                    novoSaldoM3             = null,
                    novoSaldoMetrosLineares = null,
                    novoSaldoUnidade        = null,
                    valorTotalItem          = valorItem.toPlainString(),
                ),
                nfItem      = nfItem,
                volumeM3    = volumeM3,
                isMadeira   = isMadeira,
            ))
        }

        // Persist venda first (FK requirement for items)
        val clienteId = req.clienteId?.let { runCatching { UUID.fromString(it) }.getOrNull() }
        val venda = Venda(
            id             = vendaId,
            numero         = numero,
            vendedorId     = USUARIO_SISTEMA,
            depositoId     = DEPOSITO_PADRAO,
            clienteId      = clienteId,
            tipo           = TipoVenda.BALCAO,
            status         = StatusVenda.CONFIRMADO,
            valorTotal     = valorTotal,
            createdAt      = now,
            formaPagamento = req.formaPagamento?.uppercase()?.let { runCatching { FormaPagamento.valueOf(it) }.getOrNull() },
        )
        vendaRepo.criarVenda(venda)

        // Persist items and update stock
        val itensResponse = mutableListOf<ItemVendaResponse>()
        val nfItens = mutableListOf<NfItemData>()

        for (proc in itensProcessados) {
            // Update stock for MADEIRA
            if (proc.isMadeira) {
                val saldoAtual = estoqueRepo.findSaldo(proc.item.produtoId, DEPOSITO_PADRAO)!!
                val saldoAntes = saldoAtual.saldoM3Disponivel
                val saldoDepois = saldoAntes.subtract(proc.volumeM3)

                estoqueRepo.upsertSaldo(saldoAtual.copy(
                    saldoM3Total      = saldoAtual.saldoM3Total.subtract(proc.volumeM3),
                    saldoM3Disponivel = saldoDepois,
                    dataUltimaAtualizacao = now,
                ))

                val dimensao = produtoRepo.findDimensaoVigente(proc.item.produtoId)

                estoqueRepo.insertMovimentacao(MovimentacaoEstoque(
                    id                = UUID.randomUUID(),
                    produtoId         = proc.item.produtoId,
                    depositoId        = DEPOSITO_PADRAO,
                    subloteId         = null,
                    dimensaoId        = proc.item.dimensaoId,
                    tipoMovimentacao  = "SAIDA_VENDA",
                    quantidadeM3      = proc.volumeM3,
                    quantidadeUnidade = null,
                    sinal             = "NEGATIVO",
                    custoUnitario     = null,
                    dataHora          = now,
                    observacao        = proc.item.precoUnitario.toPlainString(),
                    saldoAntesM3      = saldoAntes,
                    saldoDepoisM3     = saldoDepois,
                ))

                val novoSaldo = estoqueRepo.findSaldo(proc.item.produtoId, DEPOSITO_PADRAO)
                val novoSaldoLinear = dimensao?.let { dim ->
                    novoSaldo?.saldoM3Disponivel?.let { s ->
                        ConversionEngine.m3ParaLinear(s, dim.fatorConversao).toPlainString()
                    }
                }

                itensResponse.add(proc.response.copy(
                    novoSaldoM3             = novoSaldo?.saldoM3Disponivel?.toPlainString(),
                    novoSaldoMetrosLineares = novoSaldoLinear,
                    novoSaldoUnidade        = null,
                ))
            } else {
                // Update stock for NORMAL
                val qtdUnidade = proc.item.quantidadeUnidade!!
                val saldoAtual = estoqueRepo.findSaldo(proc.item.produtoId, DEPOSITO_PADRAO)!!
                val saldoAntes = saldoAtual.saldoUnidadeDisponivel
                val saldoDepois = saldoAntes.subtract(qtdUnidade)

                estoqueRepo.upsertSaldo(saldoAtual.copy(
                    saldoUnidadeTotal      = saldoAtual.saldoUnidadeTotal.subtract(qtdUnidade),
                    saldoUnidadeDisponivel = saldoDepois,
                    dataUltimaAtualizacao  = now,
                ))

                estoqueRepo.insertMovimentacao(MovimentacaoEstoque(
                    id                = UUID.randomUUID(),
                    produtoId         = proc.item.produtoId,
                    depositoId        = DEPOSITO_PADRAO,
                    subloteId         = null, dimensaoId = null,
                    tipoMovimentacao  = "SAIDA_VENDA",
                    quantidadeM3      = null,
                    quantidadeUnidade = qtdUnidade,
                    sinal             = "NEGATIVO",
                    custoUnitario     = null,
                    dataHora          = now,
                    observacao        = null,
                    saldoAntesM3      = null,
                    saldoDepoisM3     = null,
                ))

                val novoSaldo = estoqueRepo.findSaldo(proc.item.produtoId, DEPOSITO_PADRAO)
                itensResponse.add(proc.response.copy(
                    novoSaldoUnidade = novoSaldo?.saldoUnidadeDisponivel?.toPlainString(),
                ))
            }

            vendaRepo.criarItemVenda(proc.item)
            nfItens.add(proc.nfItem)
        }

        // Criar título a receber para vendas FIADO
        if (req.formaPagamento?.uppercase() == "FIADO") {
            val vencimento = req.dataVencimentoFiado?.let {
                runCatching { LocalDate.parse(it) }.getOrNull()
            } ?: LocalDate.now().plusDays(30)
            tituloService?.criarParaVendaFiado(
                vendaId        = vendaId,
                vendaNumero    = numero,
                clienteId      = clienteId,
                valorTotal     = valorTotal,
                dataVencimento = vencimento,
            )
        }

        // Criar título a receber parcelado para vendas com CARTÃO DE CRÉDITO (>1x)
        val nParcelas = req.numeroParcelas ?: 1
        if (req.formaPagamento?.uppercase() == "CARTAO_CREDITO" && nParcelas > 1) {
            tituloService?.criarParaVendaCredito(
                vendaId        = vendaId,
                vendaNumero    = numero,
                clienteId      = clienteId,
                valorTotal     = valorTotal,
                numeroParcelas = nParcelas,
            )
        }

        return VendaBalcaoResponse(
            vendaId    = vendaId.toString(),
            numero     = numero,
            itens      = itensResponse,
            valorTotal = valorTotal.toPlainString(),
            nfItens    = nfItens,
        )
    }

    suspend fun listarVendas(limit: Int = 50): List<VendaListItemResponse> {
        val vendas = vendaRepo.findAll(limit)
        return vendas.map { (venda, clienteNome) ->
            val itens = vendaRepo.findItensByVendaId(venda.id)
            VendaListItemResponse(
                vendaId         = venda.id.toString(),
                numero          = venda.numero,
                tipo            = venda.tipo.name,
                status          = venda.status.name,
                valorTotal      = venda.valorTotal.toPlainString(),
                createdAt       = venda.createdAt.toString(),
                quantidadeItens = itens.size,
                clienteNome     = clienteNome,
                formaPagamento  = venda.formaPagamento?.name,
            )
        }
    }

    // ── Orçamentos ────────────────────────────────────────────────────────────

    suspend fun registrarOrcamento(req: VendaBalcaoRequest): VendaBalcaoResponse {
        require(req.itens.isNotEmpty()) { "O orçamento deve ter pelo menos um item" }

        val now = Instant.now()
        val vendaId = UUID.randomUUID()
        val numero = "ORC-${System.currentTimeMillis()}"
        val clienteId = req.clienteId?.let { runCatching { UUID.fromString(it) }.getOrNull() }

        var valorTotal = BigDecimal.ZERO
        val itensParaPersistir = mutableListOf<ItemVenda>()
        val itensResponse = mutableListOf<ItemVendaResponse>()
        val nfItens = mutableListOf<NfItemData>()

        for ((index, itemReq) in req.itens.withIndex()) {
            val produtoId = UUID.fromString(itemReq.produtoId)
            val produto = produtoRepo.findById(produtoId)
                ?: throw NoSuchElementException("Produto não encontrado: $produtoId")

            val precoUnitario = BigDecimal(itemReq.precoUnitario)
            val isMadeira = produto.tipo == TipoProduto.MADEIRA

            val dimensao = if (isMadeira) {
                produtoRepo.findDimensaoVigente(produtoId)
                    ?: throw IllegalStateException("Produto ${produto.codigo} não tem dimensão cadastrada.")
            } else null

            val (volumeM3, quantidadeLinear, fatorUsado) = if (isMadeira) {
                val metros = BigDecimal(
                    itemReq.quantidadeMetroLinear
                        ?: throw IllegalArgumentException("quantidadeMetroLinear obrigatória para MADEIRA")
                )
                require(metros > BigDecimal.ZERO) { "Quantidade deve ser positiva" }
                val vol = ConversionEngine.linearParaM3(metros, dimensao!!.fatorConversao)
                Triple(vol, metros, dimensao.fatorConversao)
            } else {
                val qtd = BigDecimal(
                    itemReq.quantidadeUnidade
                        ?: throw IllegalArgumentException("quantidadeUnidade obrigatória para NORMAL")
                )
                require(qtd > BigDecimal.ZERO) { "Quantidade deve ser positiva" }
                Triple(BigDecimal.ZERO, null, null)
            }

            val valorItem = if (isMadeira)
                quantidadeLinear!!.multiply(precoUnitario).setScale(2, RoundingMode.HALF_UP)
            else
                BigDecimal(itemReq.quantidadeUnidade!!).multiply(precoUnitario).setScale(2, RoundingMode.HALF_UP)
            valorTotal = valorTotal.add(valorItem)

            val itemVenda = ItemVenda(
                id                    = UUID.randomUUID(),
                vendaId               = vendaId,
                produtoId             = produtoId,
                numeroLinha           = index + 1,
                tipoProduto           = produto.tipo,
                dimensaoId            = dimensao?.id,
                fatorConversaoUsado   = fatorUsado,
                quantidadeMetroLinear = quantidadeLinear,
                volumeM3Calculado     = if (isMadeira) volumeM3 else null,
                quantidadeUnidade     = if (!isMadeira) BigDecimal(itemReq.quantidadeUnidade!!) else null,
                precoUnitario         = precoUnitario,
                valorTotalItem        = valorItem,
                statusEntrega         = StatusItemEntrega.PENDENTE,
            )
            itensParaPersistir.add(itemVenda)

            val formula = if (isMadeira) ConversionEngine.formatarFormula(
                quantidadeLinear!!, fatorUsado!!,
                BigDecimal(dimensao!!.espessuraMm), BigDecimal(dimensao.larguraMm)
            ) else null

            itensResponse.add(ItemVendaResponse(
                produtoId               = produtoId.toString(),
                produtoCodigo           = produto.codigo,
                produtoDescricao        = produto.descricao,
                tipoProduto             = produto.tipo.name,
                quantidadeMetroLinear   = quantidadeLinear?.toPlainString(),
                volumeM3Calculado       = if (isMadeira) volumeM3.toPlainString() else null,
                quantidadeUnidade       = itemReq.quantidadeUnidade,
                unidadeSigla            = if (!isMadeira) produto.unidadeVendaSigla else null,
                formula                 = formula,
                novoSaldoM3             = null,
                novoSaldoMetrosLineares = null,
                novoSaldoUnidade        = null,
                valorTotalItem          = valorItem.toPlainString(),
            ))
            nfItens.add(montarNfItem(itemVenda, produto, index + 1))
        }

        val venda = Venda(
            id             = vendaId,
            numero         = numero,
            vendedorId     = USUARIO_SISTEMA,
            depositoId     = DEPOSITO_PADRAO,
            clienteId      = clienteId,
            tipo           = TipoVenda.BALCAO,
            status         = StatusVenda.ORCAMENTO,
            valorTotal     = valorTotal,
            createdAt      = now,
            formaPagamento = req.formaPagamento?.uppercase()?.let { runCatching { FormaPagamento.valueOf(it) }.getOrNull() },
        )
        vendaRepo.criarVenda(venda)
        itensParaPersistir.forEach { vendaRepo.criarItemVenda(it) }

        return VendaBalcaoResponse(
            vendaId    = vendaId.toString(),
            numero     = numero,
            itens      = itensResponse,
            valorTotal = valorTotal.toPlainString(),
            nfItens    = nfItens,
        )
    }

    suspend fun listarOrcamentos(limit: Int = 100): List<OrcamentoDetalheResponse> {
        val orcamentos = vendaRepo.findByStatus(StatusVenda.ORCAMENTO, limit)
        return orcamentos.map { (venda, clienteNome) ->
            val itens = vendaRepo.findItensByVendaId(venda.id)
            val produtosMap = itens.map { it.produtoId }.distinct()
                .mapNotNull { id -> produtoRepo.findById(id)?.let { id to it } }
                .toMap()
            OrcamentoDetalheResponse(
                vendaId        = venda.id.toString(),
                numero         = venda.numero,
                status         = venda.status.name,
                clienteNome    = clienteNome,
                formaPagamento = venda.formaPagamento?.name,
                valorTotal     = venda.valorTotal.toPlainString(),
                createdAt      = venda.createdAt.toString(),
                itens          = itens.map { item ->
                    val produto = produtosMap[item.produtoId]
                    OrcamentoItemResponse(
                        produtoId             = item.produtoId.toString(),
                        produtoCodigo         = produto?.codigo ?: "",
                        produtoDescricao      = produto?.descricao ?: "",
                        quantidadeMetroLinear = item.quantidadeMetroLinear?.toPlainString(),
                        volumeM3Calculado     = item.volumeM3Calculado?.toPlainString(),
                        quantidadeUnidade     = item.quantidadeUnidade?.toPlainString(),
                        precoUnitario         = item.precoUnitario.toPlainString(),
                        valorTotalItem        = item.valorTotalItem.toPlainString(),
                    )
                },
            )
        }
    }

    suspend fun confirmarOrcamento(vendaId: UUID): VendaListItemResponse {
        exigirCaixaAberto()
        val venda = vendaRepo.findVendaById(vendaId)
            ?: throw NoSuchElementException("Orçamento não encontrado: $vendaId")
        require(venda.status == StatusVenda.ORCAMENTO) {
            "Venda ${venda.numero} não está em status ORCAMENTO (status atual: ${venda.status})"
        }

        val itens = vendaRepo.findItensByVendaId(vendaId)
        val now = Instant.now()

        // Validação de saldo antes de qualquer modificação
        for (item in itens) {
            val produto = produtoRepo.findById(item.produtoId)
                ?: throw NoSuchElementException("Produto não encontrado: ${item.produtoId}")
            if (item.tipoProduto == TipoProduto.MADEIRA) {
                val volume = item.volumeM3Calculado
                    ?: throw IllegalStateException("Volume não calculado para produto ${produto.codigo}")
                val disponivel = estoqueRepo.findSaldo(item.produtoId, DEPOSITO_PADRAO)?.saldoM3Disponivel ?: BigDecimal.ZERO
                require(disponivel >= volume) {
                    "Saldo insuficiente para ${produto.codigo}. Disponível: ${disponivel.toPlainString()} m³, necessário: ${volume.toPlainString()} m³"
                }
            } else {
                val qtd = item.quantidadeUnidade
                    ?: throw IllegalStateException("Quantidade não definida para produto ${produto.codigo}")
                val disponivel = estoqueRepo.findSaldo(item.produtoId, DEPOSITO_PADRAO)?.saldoUnidadeDisponivel ?: BigDecimal.ZERO
                require(disponivel >= qtd) {
                    "Saldo insuficiente para ${produto.codigo}. Disponível: ${disponivel.toPlainString()}, necessário: ${qtd.toPlainString()}"
                }
            }
        }

        // Débito de estoque
        for (item in itens) {
            if (item.tipoProduto == TipoProduto.MADEIRA) {
                val volume = item.volumeM3Calculado!!
                val saldo = estoqueRepo.findSaldo(item.produtoId, DEPOSITO_PADRAO)!!
                val saldoAntes = saldo.saldoM3Disponivel
                val saldoDepois = saldoAntes.subtract(volume)
                estoqueRepo.upsertSaldo(saldo.copy(
                    saldoM3Total      = saldo.saldoM3Total.subtract(volume),
                    saldoM3Disponivel = saldoDepois,
                    dataUltimaAtualizacao = now,
                ))
                estoqueRepo.insertMovimentacao(MovimentacaoEstoque(
                    id = UUID.randomUUID(), produtoId = item.produtoId,
                    depositoId = DEPOSITO_PADRAO, subloteId = null, dimensaoId = item.dimensaoId,
                    tipoMovimentacao = "SAIDA_VENDA", quantidadeM3 = volume, quantidadeUnidade = null,
                    sinal = "NEGATIVO", custoUnitario = null, dataHora = now,
                    observacao = "Confirmação orçamento ${venda.numero}",
                    saldoAntesM3 = saldoAntes, saldoDepoisM3 = saldoDepois,
                ))
            } else {
                val qtd = item.quantidadeUnidade!!
                val saldo = estoqueRepo.findSaldo(item.produtoId, DEPOSITO_PADRAO)!!
                val saldoAntes = saldo.saldoUnidadeDisponivel
                val saldoDepois = saldoAntes.subtract(qtd)
                estoqueRepo.upsertSaldo(saldo.copy(
                    saldoUnidadeTotal      = saldo.saldoUnidadeTotal.subtract(qtd),
                    saldoUnidadeDisponivel = saldoDepois,
                    dataUltimaAtualizacao  = now,
                ))
                estoqueRepo.insertMovimentacao(MovimentacaoEstoque(
                    id = UUID.randomUUID(), produtoId = item.produtoId,
                    depositoId = DEPOSITO_PADRAO, subloteId = null, dimensaoId = null,
                    tipoMovimentacao = "SAIDA_VENDA", quantidadeM3 = null, quantidadeUnidade = qtd,
                    sinal = "NEGATIVO", custoUnitario = null, dataHora = now,
                    observacao = "Confirmação orçamento ${venda.numero}",
                    saldoAntesM3 = null, saldoDepoisM3 = null,
                ))
            }
        }

        vendaRepo.updateStatus(vendaId, StatusVenda.CONFIRMADO)

        if (venda.formaPagamento == FormaPagamento.FIADO) {
            tituloService?.criarParaVendaFiado(
                vendaId        = vendaId,
                vendaNumero    = venda.numero,
                clienteId      = venda.clienteId,
                valorTotal     = venda.valorTotal,
                dataVencimento = LocalDate.now().plusDays(30),
            )
        }

        return VendaListItemResponse(
            vendaId        = vendaId.toString(),
            numero         = venda.numero,
            tipo           = TipoVenda.BALCAO.name,
            status         = StatusVenda.CONFIRMADO.name,
            valorTotal     = venda.valorTotal.toPlainString(),
            createdAt      = venda.createdAt.toString(),
            quantidadeItens = itens.size,
            clienteNome    = null,
            formaPagamento = venda.formaPagamento?.name,
        )
    }

    suspend fun buscarVendaDetalhe(id: UUID): VendaDetalheResponse {
        val (venda, clienteNome) = vendaRepo.findByIdComNome(id)
            ?: throw NoSuchElementException("Venda não encontrada: $id")
        val itens = vendaRepo.findItensByVendaId(id)
        val produtosMap = itens.map { it.produtoId }.distinct()
            .mapNotNull { pid -> produtoRepo.findById(pid)?.let { pid to it } }
            .toMap()
        return VendaDetalheResponse(
            vendaId        = venda.id.toString(),
            numero         = venda.numero,
            tipo           = venda.tipo.name,
            status         = venda.status.name,
            clienteNome    = clienteNome,
            formaPagamento = venda.formaPagamento?.name,
            observacao     = null,
            valorTotal     = venda.valorTotal.toPlainString(),
            createdAt      = venda.createdAt.toString(),
            itens          = itens.map { item ->
                val produto = produtosMap[item.produtoId]
                VendaDetalheItemResponse(
                    produtoId             = item.produtoId.toString(),
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
            },
        )
    }

    suspend fun cancelarOrcamento(vendaId: UUID) {
        val venda = vendaRepo.findVendaById(vendaId)
            ?: throw NoSuchElementException("Orçamento não encontrado: $vendaId")
        require(venda.status == StatusVenda.ORCAMENTO) {
            "Venda ${venda.numero} não pode ser cancelada (status: ${venda.status})"
        }
        vendaRepo.updateStatus(vendaId, StatusVenda.CANCELADO)
    }

    suspend fun resumoCaixa(data: LocalDate): CaixaDiaResponse {
        val vendas = vendaRepo.findByDate(data)

        val total = vendas.fold(BigDecimal.ZERO) { acc, (v, _) -> acc.add(v.valorTotal) }

        val resumoPorForma = vendas
            .groupBy { (v, _) -> v.formaPagamento?.name ?: "NAO_INFORMADO" }
            .map { (forma, items) ->
                ResumoFormaPagamento(
                    formaPagamento = forma,
                    total          = items.fold(BigDecimal.ZERO) { acc, (v, _) -> acc.add(v.valorTotal) }.toPlainString(),
                    quantidade     = items.size,
                )
            }
            .sortedByDescending { it.total }

        val vendaItems = vendas.map { (v, clienteNome) ->
            VendaCaixaItem(
                numero         = v.numero,
                clienteNome    = clienteNome,
                formaPagamento = v.formaPagamento?.name,
                valorTotal     = v.valorTotal.toPlainString(),
                createdAt      = v.createdAt.toString(),
            )
        }

        return CaixaDiaResponse(
            data              = data.toString(),
            totalVendas       = total.toPlainString(),
            quantidadeVendas  = vendas.size,
            resumoPorForma    = resumoPorForma,
            vendas            = vendaItems,
        )
    }

    fun montarNfItem(item: ItemVenda, produto: Produto, numeroItem: Int): NfItemData {
        return if (produto.tipo == TipoProduto.MADEIRA) {
            val qtdM3 = item.volumeM3Calculado ?: BigDecimal.ZERO
            val fator = item.fatorConversaoUsado ?: BigDecimal.ONE
            val valorUnitarioM3 = if (fator > BigDecimal.ZERO) {
                item.precoUnitario.divide(fator, 4, RoundingMode.HALF_UP)
            } else {
                item.precoUnitario
            }
            NfItemData(
                codigoProduto       = produto.codigo,
                descricao           = produto.descricao,
                ncm                 = produto.ncm,
                unidadeComercial    = "M3",
                quantidadeComercial = qtdM3.toPlainString(),
                valorUnitario       = valorUnitarioM3.toPlainString(),
            )
        } else {
            NfItemData(
                codigoProduto       = produto.codigo,
                descricao           = produto.descricao,
                ncm                 = produto.ncm,
                unidadeComercial    = "UN",
                quantidadeComercial = (item.quantidadeUnidade ?: BigDecimal.ZERO).toPlainString(),
                valorUnitario       = item.precoUnitario.toPlainString(),
            )
        }
    }
}

private val DEPOSITO_PADRAO = UUID.fromString("00000000-0000-0000-0000-000000000030")
private val USUARIO_SISTEMA = UUID.fromString("00000000-0000-0000-0000-000000000001")
