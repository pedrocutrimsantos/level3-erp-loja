package br.com.madeireira.modules.relatorio.application

import br.com.madeireira.core.conversion.ConversionEngine
import br.com.madeireira.infrastructure.database.DatabaseConfig.dbQuery
import br.com.madeireira.modules.cliente.infrastructure.ClienteTable
import br.com.madeireira.modules.estoque.infrastructure.EstoqueSaldoTable
import br.com.madeireira.modules.financeiro.domain.model.StatusTitulo
import br.com.madeireira.modules.financeiro.domain.model.TipoTitulo
import br.com.madeireira.modules.financeiro.infrastructure.TituloFinanceiroTable
import br.com.madeireira.modules.produto.domain.model.TipoProduto
import br.com.madeireira.modules.produto.infrastructure.DimensaoMadeiraTable
import br.com.madeireira.modules.produto.infrastructure.ProdutoTable
import br.com.madeireira.modules.produto.infrastructure.UnidadeMedidaTable
import br.com.madeireira.modules.relatorio.api.dto.DashboardResponse
import br.com.madeireira.modules.relatorio.api.dto.RelatorioMargemLinha
import br.com.madeireira.modules.relatorio.api.dto.RelatorioMargemResponse
import br.com.madeireira.modules.relatorio.api.dto.EstoqueCriticoItem
import br.com.madeireira.modules.relatorio.api.dto.RelatorioEstoqueLinha
import br.com.madeireira.modules.relatorio.api.dto.RelatorioEstoqueResponse
import br.com.madeireira.modules.relatorio.api.dto.RelatorioFluxoCaixaResponse
import br.com.madeireira.modules.relatorio.api.dto.RelatorioFluxoLinha
import br.com.madeireira.modules.relatorio.api.dto.RelatorioVendaLinha
import br.com.madeireira.modules.relatorio.api.dto.RelatorioVendasResponse
import br.com.madeireira.modules.relatorio.api.dto.TopProduto
import br.com.madeireira.modules.relatorio.api.dto.TitulosAberto
import br.com.madeireira.modules.relatorio.api.dto.VendasDia
import br.com.madeireira.modules.venda.domain.model.StatusVenda
import br.com.madeireira.modules.venda.infrastructure.ItemVendaTable
import br.com.madeireira.modules.venda.infrastructure.VendaTable
import org.jetbrains.exposed.sql.*
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.UUID
import java.time.LocalDate
import java.time.ZoneOffset

private val DEPOSITO_PADRAO = UUID.fromString("00000000-0000-0000-0000-000000000030")

class RelatorioService {

    suspend fun dashboard(): DashboardResponse {
        val hoje = LocalDate.now()
        val brt = ZoneOffset.ofHours(-3)
        val inicioDia  = hoje.atStartOfDay(brt).toInstant()
        val fimDia     = hoje.plusDays(1).atStartOfDay(brt).toInstant()
        val inicioMes  = hoje.withDayOfMonth(1).atStartOfDay(brt).toInstant()
        val inicio30   = hoje.minusDays(29).atStartOfDay(brt).toInstant()

        val (fatDia, qtdDia) = agregadoVendas(inicioDia, fimDia)
        val (fatMes, qtdMes) = agregadoVendas(inicioMes, fimDia)
        val vendas30     = vendasPorDia(inicio30, fimDia)
        val topProdutos  = topProdutos(inicio30, fimDia)
        val estoqueCrit  = estoqueCritico()
        val titulos      = titulosEmAberto()
        val contasPagar  = contasAPagar()

        return DashboardResponse(
            faturamentoDia        = fatDia.toPlainString(),
            faturamentoMes        = fatMes.toPlainString(),
            quantidadeVendasDia   = qtdDia,
            quantidadeVendasMes   = qtdMes,
            titulosEmAberto       = titulos,
            contasAPagar          = contasPagar,
            vendasUltimos30Dias   = vendas30,
            topProdutos           = topProdutos,
            estoqueCritico        = estoqueCrit,
        )
    }

    // ── Relatórios exportáveis ────────────────────────────────────────────────

    suspend fun vendasExport(dataInicio: LocalDate, dataFim: LocalDate): RelatorioVendasResponse = dbQuery {
        val brt    = ZoneOffset.ofHours(-3)
        val inicio = dataInicio.atStartOfDay(brt).toInstant()
        val fim    = dataFim.plusDays(1).atStartOfDay(brt).toInstant()

        val vendasRows = VendaTable
            .select {
                (VendaTable.status eq StatusVenda.CONFIRMADO) and
                (VendaTable.createdAt greaterEq inicio.toKotlin()) and
                (VendaTable.createdAt less fim.toKotlin())
            }
            .toList()

        val totalFaturamento = vendasRows.fold(BigDecimal.ZERO) { acc, r -> acc.add(r[VendaTable.valorTotal]) }

        val clienteIds = vendasRows.mapNotNull { it[VendaTable.clienteId] }.toSet()
        val clientes = if (clienteIds.isEmpty()) emptyMap() else
            ClienteTable
                .select { ClienteTable.id inList clienteIds.toList() }
                .associate { it[ClienteTable.id] to it[ClienteTable.razaoSocial] }

        val vendaIdMap = vendasRows.associate { it[VendaTable.id] to it }

        val linhas = if (vendaIdMap.isEmpty()) emptyList() else
            ItemVendaTable
                .join(ProdutoTable, JoinType.INNER, ItemVendaTable.produtoId, ProdutoTable.id)
                .join(UnidadeMedidaTable, JoinType.INNER, ProdutoTable.unidadeMedidaId, UnidadeMedidaTable.id)
                .select { ItemVendaTable.vendaId inList vendaIdMap.keys.toList() }
                .map { row ->
                    val vendaRow = vendaIdMap[row[ItemVendaTable.vendaId]]!!
                    val tipo     = row[ItemVendaTable.tipoProduto]
                    val data     = vendaRow[VendaTable.createdAt].toJava()
                        .atZone(brt).toLocalDate().toString()
                    val unidade  = row[UnidadeMedidaTable.codigo]
                    val quantidade = when (tipo) {
                        TipoProduto.MADEIRA ->
                            "${row[ItemVendaTable.quantidadeMLinear]?.toPlainString() ?: "0"} m"
                        TipoProduto.NORMAL  ->
                            "${row[ItemVendaTable.quantidadeUnidade]?.toPlainString() ?: "0"} $unidade"
                    }
                    RelatorioVendaLinha(
                        vendaNumero    = vendaRow[VendaTable.numero],
                        data           = data,
                        clienteNome    = vendaRow[VendaTable.clienteId]?.let { clientes[it] } ?: "Consumidor Final",
                        formaPagamento = vendaRow[VendaTable.formaPagamento]?.name ?: "—",
                        produtoCodigo  = row[ProdutoTable.codigo],
                        produtoDescricao = row[ProdutoTable.descricao],
                        tipo           = tipo.name,
                        quantidade     = quantidade,
                        precoUnitario  = row[ItemVendaTable.precoUnitario].toPlainString(),
                        valorTotal     = row[ItemVendaTable.valorTotalItem].toPlainString(),
                    )
                }
                .sortedWith(compareBy({ it.data }, { it.vendaNumero }))

        RelatorioVendasResponse(
            dataInicio       = dataInicio.toString(),
            dataFim          = dataFim.toString(),
            totalVendas      = vendasRows.size,
            totalFaturamento = totalFaturamento.toPlainString(),
            linhas           = linhas,
        )
    }

    suspend fun estoqueExport(): RelatorioEstoqueResponse = dbQuery {
        val rows = EstoqueSaldoTable
            .join(ProdutoTable, JoinType.INNER, EstoqueSaldoTable.produtoId, ProdutoTable.id)
            .join(UnidadeMedidaTable, JoinType.INNER, ProdutoTable.unidadeMedidaId, UnidadeMedidaTable.id)
            .selectAll()
            .toList()

        val madeiraProdutoIds = rows
            .filter { it[ProdutoTable.tipo] == TipoProduto.MADEIRA }
            .map { it[ProdutoTable.id] }

        val fatores = if (madeiraProdutoIds.isEmpty()) emptyMap() else
            DimensaoMadeiraTable
                .select {
                    (DimensaoMadeiraTable.produtoId inList madeiraProdutoIds) and
                    DimensaoMadeiraTable.vigenteAte.isNull()
                }
                .associate { it[DimensaoMadeiraTable.produtoId] to it[DimensaoMadeiraTable.fatorConversao] }

        val linhas = rows.map { row ->
            val tipo   = row[ProdutoTable.tipo]
            val saldoM3 = row[EstoqueSaldoTable.saldoM3Disponivel]
            val fator  = fatores[row[ProdutoTable.id]]
            RelatorioEstoqueLinha(
                codigo           = row[ProdutoTable.codigo],
                descricao        = row[ProdutoTable.descricao],
                tipo             = tipo.name,
                unidade          = row[UnidadeMedidaTable.codigo],
                saldoM3          = if (tipo == TipoProduto.MADEIRA) saldoM3.toPlainString() else null,
                saldoMetroLinear = if (tipo == TipoProduto.MADEIRA)
                    fator?.let { ConversionEngine.m3ParaLinear(saldoM3, it).toPlainString() }
                    else null,
                saldoUnidade     = if (tipo == TipoProduto.NORMAL)
                    row[EstoqueSaldoTable.saldoUnidadeDisponivel].toPlainString()
                    else null,
            )
        }.sortedWith(compareBy({ it.tipo }, { it.descricao }))

        RelatorioEstoqueResponse(
            geradoEm      = LocalDate.now().toString(),
            totalProdutos = linhas.size,
            linhas        = linhas,
        )
    }

    suspend fun fluxoCaixaExport(dataInicio: LocalDate, dataFim: LocalDate): RelatorioFluxoCaixaResponse = dbQuery {
        val brt    = ZoneOffset.ofHours(-3)
        val inicio = dataInicio.atStartOfDay(brt).toInstant()
        val fim    = dataFim.plusDays(1).atStartOfDay(brt).toInstant()

        val vendas = VendaTable
            .select {
                (VendaTable.status eq StatusVenda.CONFIRMADO) and
                (VendaTable.createdAt greaterEq inicio.toKotlin()) and
                (VendaTable.createdAt less fim.toKotlin())
            }
            .toList()

        val totalEntradas = vendas.fold(BigDecimal.ZERO) { acc, r -> acc.add(r[VendaTable.valorTotal]) }

        val linhas = vendas
            .groupBy { row ->
                val data = row[VendaTable.createdAt].toJava().atZone(brt).toLocalDate().toString()
                val fp   = row[VendaTable.formaPagamento]?.name ?: "—"
                Pair(data, fp)
            }
            .map { (key, rows) ->
                RelatorioFluxoLinha(
                    data           = key.first,
                    formaPagamento = key.second,
                    quantidade     = rows.size,
                    total          = rows.fold(BigDecimal.ZERO) { acc, r -> acc.add(r[VendaTable.valorTotal]) }.toPlainString(),
                )
            }
            .sortedWith(compareBy({ it.data }, { it.formaPagamento }))

        RelatorioFluxoCaixaResponse(
            dataInicio    = dataInicio.toString(),
            dataFim       = dataFim.toString(),
            totalEntradas = totalEntradas.toPlainString(),
            linhas        = linhas,
        )
    }

    // ── Relatório de Margem ───────────────────────────────────────────────────

    suspend fun margemExport(): RelatorioMargemResponse = dbQuery {
        // Todos os produtos ativos, com saldo do depósito padrão se houver
        val rows = ProdutoTable
            .join(
                EstoqueSaldoTable,
                JoinType.LEFT,
                onColumn = ProdutoTable.id,
                otherColumn = EstoqueSaldoTable.produtoId,
                additionalConstraint = { EstoqueSaldoTable.depositoId eq DEPOSITO_PADRAO },
            )
            .select { ProdutoTable.ativo eq true }
            .toList()

        val madeiraProdutoIds = rows
            .filter { it[ProdutoTable.tipo] == TipoProduto.MADEIRA }
            .map { it[ProdutoTable.id] }

        val fatores = if (madeiraProdutoIds.isEmpty()) emptyMap() else
            DimensaoMadeiraTable
                .select {
                    (DimensaoMadeiraTable.produtoId inList madeiraProdutoIds) and
                    DimensaoMadeiraTable.vigenteAte.isNull()
                }
                .associate { it[DimensaoMadeiraTable.produtoId] to it[DimensaoMadeiraTable.fatorConversao] }

        val linhas = rows.map { row ->
            val tipo       = row[ProdutoTable.tipo]
            val precoVenda = row[ProdutoTable.precoVenda]
            val custoM3    = row.getOrNull(EstoqueSaldoTable.custoMedioM3)
            val saldoM3    = row.getOrNull(EstoqueSaldoTable.saldoM3Disponivel) ?: BigDecimal.ZERO
            val saldoUnd   = row.getOrNull(EstoqueSaldoTable.saldoUnidadeDisponivel) ?: BigDecimal.ZERO
            val fator      = fatores[row[ProdutoTable.id]]

            // custo e saldo na unidade de venda
            val (custoUnit, saldoDisp) = when (tipo) {
                TipoProduto.MADEIRA -> {
                    val custo = if (custoM3 != null && fator != null) custoM3.multiply(fator) else null
                    val saldo = fator?.let { ConversionEngine.m3ParaLinear(saldoM3, it) }
                    custo to saldo
                }
                TipoProduto.NORMAL -> custoM3 to saldoUnd
            }

            val (margemBruta, margemValor) = if (
                precoVenda != null && precoVenda > BigDecimal.ZERO && custoUnit != null
            ) {
                val mb = precoVenda.subtract(custoUnit)
                    .divide(precoVenda, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal("100"))
                    .setScale(2, RoundingMode.HALF_UP)
                val mv = precoVenda.subtract(custoUnit).setScale(2, RoundingMode.HALF_UP)
                mb to mv
            } else null to null

            RelatorioMargemLinha(
                produtoCodigo    = row[ProdutoTable.codigo],
                produtoDescricao = row[ProdutoTable.descricao],
                tipo             = tipo.name,
                precoVenda       = precoVenda?.setScale(2, RoundingMode.HALF_UP)?.toPlainString(),
                custoMedio       = custoUnit?.setScale(2, RoundingMode.HALF_UP)?.toPlainString(),
                margemBruta      = margemBruta?.toPlainString(),
                margemValor      = margemValor?.toPlainString(),
                saldoDisponivel  = saldoDisp?.setScale(3, RoundingMode.HALF_UP)?.toPlainString(),
                semPreco         = precoVenda == null,
                semCusto         = custoUnit == null,
            )
        }.sortedWith(compareBy({ it.tipo }, { it.produtoDescricao }))

        val comMargem = linhas.filter { it.margemBruta != null }
        val margemMedia = if (comMargem.isNotEmpty())
            comMargem.fold(BigDecimal.ZERO) { acc, l -> acc.add(BigDecimal(l.margemBruta!!)) }
                .divide(BigDecimal(comMargem.size), 2, RoundingMode.HALF_UP)
                .toPlainString()
        else null

        RelatorioMargemResponse(
            geradoEm         = LocalDate.now().toString(),
            totalProdutos    = linhas.size,
            produtosSemPreco = linhas.count { it.semPreco },
            produtosSemCusto = linhas.count { !it.semPreco && it.semCusto },
            margemMediaGeral = margemMedia,
            linhas           = linhas,
        )
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────

    private suspend fun agregadoVendas(
        inicio: java.time.Instant,
        fim: java.time.Instant,
    ): Pair<BigDecimal, Int> = dbQuery {
        val rows = VendaTable
            .select {
                (VendaTable.status eq StatusVenda.CONFIRMADO) and
                (VendaTable.createdAt greaterEq inicio.toKotlin()) and
                (VendaTable.createdAt less fim.toKotlin())
            }
            .toList()
        val total = rows.fold(BigDecimal.ZERO) { acc, r -> acc.add(r[VendaTable.valorTotal]) }
        Pair(total, rows.size)
    }

    private suspend fun vendasPorDia(
        inicio: java.time.Instant,
        fim: java.time.Instant,
    ): List<VendasDia> = dbQuery {
        val brt = ZoneOffset.ofHours(-3)
        VendaTable
            .select {
                (VendaTable.status eq StatusVenda.CONFIRMADO) and
                (VendaTable.createdAt greaterEq inicio.toKotlin()) and
                (VendaTable.createdAt less fim.toKotlin())
            }
            .toList()
            .groupBy { row ->
                row[VendaTable.createdAt].toJava()
                    .atZone(brt)
                    .toLocalDate()
                    .toString()
            }
            .map { (data, rows) ->
                VendasDia(
                    data       = data,
                    total      = rows.fold(BigDecimal.ZERO) { acc, r -> acc.add(r[VendaTable.valorTotal]) }.toPlainString(),
                    quantidade = rows.size,
                )
            }
            .sortedBy { it.data }
    }

    private suspend fun topProdutos(
        inicio: java.time.Instant,
        fim: java.time.Instant,
    ): List<TopProduto> = dbQuery {
        val vendaIds = VendaTable
            .select {
                (VendaTable.status eq StatusVenda.CONFIRMADO) and
                (VendaTable.createdAt greaterEq inicio.toKotlin()) and
                (VendaTable.createdAt less fim.toKotlin())
            }
            .map { it[VendaTable.id] }

        if (vendaIds.isEmpty()) return@dbQuery emptyList()

        ItemVendaTable
            .join(ProdutoTable, JoinType.INNER, ItemVendaTable.produtoId, ProdutoTable.id)
            .select { ItemVendaTable.vendaId inList vendaIds }
            .toList()
            .groupBy { it[ItemVendaTable.produtoId] }
            .map { (produtoId, rows) ->
                val first = rows.first()
                val totalM3 = rows
                    .mapNotNull { it[ItemVendaTable.volumeM3Calculado] }
                    .fold(BigDecimal.ZERO) { acc, v -> acc.add(v) }
                TopProduto(
                    produtoId        = produtoId.toString(),
                    produtoCodigo    = first[ProdutoTable.codigo],
                    produtoDescricao = first[ProdutoTable.descricao],
                    totalM3          = totalM3.takeIf { it > BigDecimal.ZERO }?.toPlainString(),
                    totalValor       = rows.fold(BigDecimal.ZERO) { acc, r -> acc.add(r[ItemVendaTable.valorTotalItem]) }.toPlainString(),
                    quantidadeVendas = rows.size,
                )
            }
            .sortedByDescending { BigDecimal(it.totalValor) }
            .take(5)
    }

    private suspend fun estoqueCritico(): List<EstoqueCriticoItem> = dbQuery {
        val rows = EstoqueSaldoTable
            .join(ProdutoTable, JoinType.INNER, EstoqueSaldoTable.produtoId, ProdutoTable.id)
            .select { ProdutoTable.tipo eq TipoProduto.MADEIRA }
            .orderBy(EstoqueSaldoTable.saldoM3Disponivel, SortOrder.ASC)
            .limit(5)
            .toList()

        val produtoIds = rows.map { it[ProdutoTable.id] }
        val fatores = if (produtoIds.isEmpty()) emptyMap() else
            DimensaoMadeiraTable
                .select {
                    (DimensaoMadeiraTable.produtoId inList produtoIds) and
                    DimensaoMadeiraTable.vigenteAte.isNull()
                }
                .associate { it[DimensaoMadeiraTable.produtoId] to it[DimensaoMadeiraTable.fatorConversao] }

        rows.map { row ->
            val produtoId = row[ProdutoTable.id]
            val saldoM3   = row[EstoqueSaldoTable.saldoM3Disponivel]
            val fator     = fatores[produtoId]
            EstoqueCriticoItem(
                produtoId        = produtoId.toString(),
                produtoCodigo    = row[ProdutoTable.codigo],
                produtoDescricao = row[ProdutoTable.descricao],
                saldoM3          = saldoM3.toPlainString(),
                saldoMetroLinear = fator?.let { ConversionEngine.m3ParaLinear(saldoM3, it).toPlainString() },
            )
        }
    }

    private suspend fun titulosEmAberto(): TitulosAberto = dbQuery {
        val rows = TituloFinanceiroTable
            .select {
                (TituloFinanceiroTable.tipo eq TipoTitulo.RECEBER) and
                ((TituloFinanceiroTable.status eq StatusTitulo.ABERTO) or
                (TituloFinanceiroTable.status eq StatusTitulo.VENCIDO))
            }
            .toList()
        TitulosAberto(
            quantidade = rows.size,
            valorTotal = rows.fold(BigDecimal.ZERO) { acc, r ->
                acc.add(r[TituloFinanceiroTable.valorOriginal].subtract(r[TituloFinanceiroTable.valorPago]))
            }.toPlainString(),
        )
    }

    private suspend fun contasAPagar(): TitulosAberto = dbQuery {
        val rows = TituloFinanceiroTable
            .select {
                (TituloFinanceiroTable.tipo eq TipoTitulo.PAGAR) and
                ((TituloFinanceiroTable.status eq StatusTitulo.ABERTO) or
                (TituloFinanceiroTable.status eq StatusTitulo.VENCIDO))
            }
            .toList()
        TitulosAberto(
            quantidade = rows.size,
            valorTotal = rows.fold(BigDecimal.ZERO) { acc, r ->
                acc.add(r[TituloFinanceiroTable.valorOriginal].subtract(r[TituloFinanceiroTable.valorPago]))
            }.toPlainString(),
        )
    }
}

private fun java.time.Instant.toKotlin() =
    kotlinx.datetime.Instant.fromEpochMilliseconds(toEpochMilli())

private fun kotlinx.datetime.Instant.toJava() =
    java.time.Instant.ofEpochMilli(toEpochMilliseconds())
