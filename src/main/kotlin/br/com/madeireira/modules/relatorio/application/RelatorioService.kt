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
import br.com.madeireira.modules.devolucao.infrastructure.DevolucaoTable
import br.com.madeireira.modules.financeiro.domain.model.StatusParcela
import br.com.madeireira.modules.financeiro.infrastructure.ParcelaFinanceiraTable
import br.com.madeireira.modules.relatorio.api.dto.DashboardResponse
import br.com.madeireira.modules.relatorio.api.dto.DreCategoriaDto
import br.com.madeireira.modules.relatorio.api.dto.DreResponse
import br.com.madeireira.modules.relatorio.api.dto.MargemPeriodoDetalhe
import br.com.madeireira.modules.relatorio.api.dto.RelatorioMargemLinha
import br.com.madeireira.modules.relatorio.api.dto.RelatorioMargemPeriodoLinha
import br.com.madeireira.modules.relatorio.api.dto.RelatorioMargemPeriodoResponse
import br.com.madeireira.modules.relatorio.api.dto.RelatorioMargemResponse
import br.com.madeireira.modules.relatorio.api.dto.EstoqueCriticoItem
import br.com.madeireira.modules.relatorio.api.dto.RelatorioEstoqueLinha
import br.com.madeireira.modules.relatorio.api.dto.RelatorioEstoqueResponse
import br.com.madeireira.modules.relatorio.api.dto.VolumeVendidoLinha
import br.com.madeireira.modules.relatorio.api.dto.VolumeVendidoResponse
import br.com.madeireira.modules.relatorio.api.dto.VendasPorVendedorLinha
import br.com.madeireira.modules.relatorio.api.dto.VendasPorVendedorResponse
import br.com.madeireira.modules.relatorio.api.dto.NotificacaoItem
import br.com.madeireira.modules.relatorio.api.dto.NotificacoesResponse
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

// Referência local à tabela usuario — evita dependência cruzada de módulo
private object UsuarioTableRef : Table("usuario") {
    val id   = uuid("id")
    val nome = varchar("nome", 120)
}

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
            val tipo           = row[ProdutoTable.tipo]
            val saldoM3        = row[EstoqueSaldoTable.saldoM3Disponivel]
            val fator          = fatores[row[ProdutoTable.id]]
            val comprimentoRaw = row[ProdutoTable.comprimentoPecaM]
            val metrosLineares = if (tipo == TipoProduto.MADEIRA)
                fator?.let { ConversionEngine.m3ParaLinear(saldoM3, it) }
                else null
            val saldoPecas = if (tipo == TipoProduto.MADEIRA && comprimentoRaw != null && comprimentoRaw > BigDecimal.ZERO && metrosLineares != null)
                metrosLineares.divide(comprimentoRaw, 0, RoundingMode.FLOOR).toInt()
                else null
            RelatorioEstoqueLinha(
                codigo           = row[ProdutoTable.codigo],
                descricao        = row[ProdutoTable.descricao],
                tipo             = tipo.name,
                unidade          = row[UnidadeMedidaTable.codigo],
                saldoM3          = if (tipo == TipoProduto.MADEIRA) saldoM3.toPlainString() else null,
                saldoMetroLinear = metrosLineares?.toPlainString(),
                saldoUnidade     = if (tipo == TipoProduto.NORMAL)
                    row[EstoqueSaldoTable.saldoUnidadeDisponivel].toPlainString()
                    else null,
                saldoPecas       = saldoPecas,
                comprimentoPecaM = comprimentoRaw?.takeIf { tipo == TipoProduto.MADEIRA && it > BigDecimal.ZERO }?.toPlainString(),
            )
        }.sortedWith(compareBy({ it.tipo }, { it.descricao }))

        val totalM3 = linhas
            .mapNotNull { it.saldoM3?.let { v -> BigDecimal(v) } }
            .fold(BigDecimal.ZERO, BigDecimal::add)

        val totalML = linhas
            .mapNotNull { it.saldoMetroLinear?.let { v -> BigDecimal(v) } }
            .fold(BigDecimal.ZERO, BigDecimal::add)

        RelatorioEstoqueResponse(
            geradoEm            = LocalDate.now().toString(),
            totalProdutos       = linhas.size,
            totalM3Madeira      = totalM3.setScale(4, RoundingMode.HALF_UP).toPlainString(),
            totalMetrosLineares = totalML.setScale(2, RoundingMode.HALF_UP).toPlainString(),
            linhas              = linhas,
        )
    }

    suspend fun volumeVendido(dataInicio: LocalDate, dataFim: LocalDate): VolumeVendidoResponse = dbQuery {
        val brt    = ZoneOffset.ofHours(-3)
        val inicio = dataInicio.atStartOfDay(brt).toInstant()
        val fim    = dataFim.plusDays(1).atStartOfDay(brt).toInstant()

        val vendaIds = VendaTable
            .select {
                (VendaTable.status inList listOf(
                    StatusVenda.CONFIRMADO,
                    StatusVenda.EM_ENTREGA,
                    StatusVenda.ENTREGUE_PARCIAL,
                    StatusVenda.CONCLUIDO,
                )) and
                (VendaTable.createdAt greaterEq inicio.toKotlin()) and
                (VendaTable.createdAt less fim.toKotlin())
            }
            .map { it[VendaTable.id] }

        if (vendaIds.isEmpty()) {
            return@dbQuery VolumeVendidoResponse(
                dataInicio          = dataInicio.toString(),
                dataFim             = dataFim.toString(),
                totalM3             = "0.0000",
                totalMetrosLineares = "0.00",
                totalFaturamento    = "0.00",
                linhas              = emptyList(),
            )
        }

        data class ProdutoAgg(
            var totalM3: BigDecimal = BigDecimal.ZERO,
            var totalML: BigDecimal = BigDecimal.ZERO,
            var totalFat: BigDecimal = BigDecimal.ZERO,
            var qtdVendas: Int = 0,
            var codigo: String = "",
            var descricao: String = "",
        )

        val agrupado = mutableMapOf<UUID, ProdutoAgg>()

        ItemVendaTable
            .join(ProdutoTable, JoinType.INNER, ItemVendaTable.produtoId, ProdutoTable.id)
            .select {
                (ItemVendaTable.vendaId inList vendaIds) and
                (ItemVendaTable.tipoProduto eq TipoProduto.MADEIRA)
            }
            .forEach { row ->
                val prodId = row[ProdutoTable.id]
                val agg = agrupado.getOrPut(prodId) {
                    ProdutoAgg(
                        codigo    = row[ProdutoTable.codigo],
                        descricao = row[ProdutoTable.descricao],
                    )
                }
                agg.totalM3  = agg.totalM3.add(row[ItemVendaTable.volumeM3Calculado] ?: BigDecimal.ZERO)
                agg.totalML  = agg.totalML.add(row[ItemVendaTable.quantidadeMLinear] ?: BigDecimal.ZERO)
                agg.totalFat = agg.totalFat.add(row[ItemVendaTable.valorTotalItem])
                agg.qtdVendas++
            }

        val linhas = agrupado.values
            .sortedByDescending { it.totalM3 }
            .map { agg ->
                VolumeVendidoLinha(
                    produtoCodigo       = agg.codigo,
                    produtoDescricao    = agg.descricao,
                    totalM3             = agg.totalM3.setScale(4, RoundingMode.HALF_UP).toPlainString(),
                    totalMetrosLineares = agg.totalML.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                    totalFaturamento    = agg.totalFat.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                    quantidadeVendas    = agg.qtdVendas,
                )
            }

        val grandM3  = linhas.fold(BigDecimal.ZERO) { acc, l -> acc.add(BigDecimal(l.totalM3)) }
        val grandML  = linhas.fold(BigDecimal.ZERO) { acc, l -> acc.add(BigDecimal(l.totalMetrosLineares)) }
        val grandFat = linhas.fold(BigDecimal.ZERO) { acc, l -> acc.add(BigDecimal(l.totalFaturamento)) }

        VolumeVendidoResponse(
            dataInicio          = dataInicio.toString(),
            dataFim             = dataFim.toString(),
            totalM3             = grandM3.setScale(4, RoundingMode.HALF_UP).toPlainString(),
            totalMetrosLineares = grandML.setScale(2, RoundingMode.HALF_UP).toPlainString(),
            totalFaturamento    = grandFat.setScale(2, RoundingMode.HALF_UP).toPlainString(),
            linhas              = linhas,
        )
    }

    suspend fun vendasPorVendedor(dataInicio: LocalDate, dataFim: LocalDate): VendasPorVendedorResponse = dbQuery {
        val brt    = ZoneOffset.ofHours(-3)
        val inicio = dataInicio.atStartOfDay(brt).toInstant()
        val fim    = dataFim.plusDays(1).atStartOfDay(brt).toInstant()

        val vendasRows = VendaTable
            .select {
                (VendaTable.status inList listOf(
                    StatusVenda.CONFIRMADO,
                    StatusVenda.EM_ENTREGA,
                    StatusVenda.ENTREGUE_PARCIAL,
                    StatusVenda.CONCLUIDO,
                )) and
                (VendaTable.createdAt greaterEq inicio.toKotlin()) and
                (VendaTable.createdAt less fim.toKotlin())
            }
            .toList()

        if (vendasRows.isEmpty()) {
            return@dbQuery VendasPorVendedorResponse(
                dataInicio       = dataInicio.toString(),
                dataFim          = dataFim.toString(),
                totalFaturamento = "0.00",
                totalVendas      = 0,
                linhas           = emptyList(),
            )
        }

        // Nomes dos vendedores
        val vendedorIds = vendasRows.map { it[VendaTable.vendedorId] }.toSet()
        val nomes = UsuarioTableRef
            .select { UsuarioTableRef.id inList vendedorIds.toList() }
            .associate { it[UsuarioTableRef.id] to it[UsuarioTableRef.nome] }

        // Volumes m³ e metros lineares — somente itens MADEIRA
        val vendaIds = vendasRows.map { it[VendaTable.id] }
        data class VolumeAgg(var m3: BigDecimal = BigDecimal.ZERO, var ml: BigDecimal = BigDecimal.ZERO)
        val volumePorVenda = mutableMapOf<UUID, VolumeAgg>()
        ItemVendaTable
            .select {
                (ItemVendaTable.vendaId inList vendaIds) and
                (ItemVendaTable.tipoProduto eq TipoProduto.MADEIRA)
            }
            .forEach { row ->
                val agg = volumePorVenda.getOrPut(row[ItemVendaTable.vendaId]) { VolumeAgg() }
                agg.m3 = agg.m3.add(row[ItemVendaTable.volumeM3Calculado] ?: BigDecimal.ZERO)
                agg.ml = agg.ml.add(row[ItemVendaTable.quantidadeMLinear] ?: BigDecimal.ZERO)
            }

        // Agrupa por vendedor
        data class VendedorAgg(
            var totalVendas: Int = 0,
            var totalFat: BigDecimal = BigDecimal.ZERO,
            var totalM3: BigDecimal = BigDecimal.ZERO,
            var totalML: BigDecimal = BigDecimal.ZERO,
        )

        val agrupado = mutableMapOf<UUID, VendedorAgg>()
        vendasRows.forEach { row ->
            val vId = row[VendaTable.vendedorId]
            val agg = agrupado.getOrPut(vId) { VendedorAgg() }
            agg.totalVendas++
            agg.totalFat = agg.totalFat.add(row[VendaTable.valorTotal])
            val vol = volumePorVenda[row[VendaTable.id]]
            if (vol != null) {
                agg.totalM3 = agg.totalM3.add(vol.m3)
                agg.totalML = agg.totalML.add(vol.ml)
            }
        }

        val linhas = agrupado.entries
            .sortedByDescending { it.value.totalFat }
            .map { (vId, agg) ->
                val ticket = if (agg.totalVendas > 0)
                    agg.totalFat.divide(BigDecimal(agg.totalVendas), 2, RoundingMode.HALF_UP)
                else BigDecimal.ZERO
                VendasPorVendedorLinha(
                    vendedorNome        = nomes[vId] ?: "Desconhecido",
                    totalVendas         = agg.totalVendas,
                    totalFaturamento    = agg.totalFat.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                    ticketMedio         = ticket.toPlainString(),
                    totalM3             = agg.totalM3.setScale(4, RoundingMode.HALF_UP).toPlainString(),
                    totalMetrosLineares = agg.totalML.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                )
            }

        val grandFat = linhas.fold(BigDecimal.ZERO) { acc, l -> acc.add(BigDecimal(l.totalFaturamento)) }

        VendasPorVendedorResponse(
            dataInicio       = dataInicio.toString(),
            dataFim          = dataFim.toString(),
            totalFaturamento = grandFat.setScale(2, RoundingMode.HALF_UP).toPlainString(),
            totalVendas      = vendasRows.size,
            linhas           = linhas,
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

    // ── DRE ───────────────────────────────────────────────────────────────────

    suspend fun dre(dataInicio: LocalDate, dataFim: LocalDate): DreResponse = dbQuery {
        val brt    = ZoneOffset.ofHours(-3)
        val inicio = dataInicio.atStartOfDay(brt).toInstant()
        val fim    = dataFim.plusDays(1).atStartOfDay(brt).toInstant()

        // ── 1. Receita Bruta ──────────────────────────────────────────────────
        val vendasRows = VendaTable
            .select {
                (VendaTable.status eq StatusVenda.CONFIRMADO) and
                (VendaTable.createdAt greaterEq inicio.toKotlin()) and
                (VendaTable.createdAt less fim.toKotlin())
            }
            .toList()

        val receitaBruta = vendasRows.fold(BigDecimal.ZERO) { acc, r -> acc.add(r[VendaTable.valorTotal]) }
        val qtdVendas    = vendasRows.size

        // ── 2. Devoluções ─────────────────────────────────────────────────────
        val devolucaoRows = DevolucaoTable
            .select {
                (DevolucaoTable.createdAt greaterEq inicio.toKotlin()) and
                (DevolucaoTable.createdAt less fim.toKotlin())
            }
            .toList()

        val totalDevolucoes = devolucaoRows.fold(BigDecimal.ZERO) { acc, r -> acc.add(r[DevolucaoTable.valorTotal]) }
        val qtdDevolucoes   = devolucaoRows.size

        // ── 3. Receita Líquida ────────────────────────────────────────────────
        val receitaLiquida = receitaBruta.subtract(totalDevolucoes)

        // ── 4. CMV (custo médio atual × quantidade vendida) ───────────────────
        val vendaIds = vendasRows.map { it[VendaTable.id] }
        val cmv: BigDecimal = if (vendaIds.isEmpty()) BigDecimal.ZERO else {
            ItemVendaTable
                .join(
                    EstoqueSaldoTable,
                    JoinType.LEFT,
                    onColumn    = ItemVendaTable.produtoId,
                    otherColumn = EstoqueSaldoTable.produtoId,
                    additionalConstraint = { EstoqueSaldoTable.depositoId eq DEPOSITO_PADRAO },
                )
                .select { ItemVendaTable.vendaId inList vendaIds }
                .toList()
                .fold(BigDecimal.ZERO) { acc, row ->
                    val custoM3 = row.getOrNull(EstoqueSaldoTable.custoMedioM3) ?: return@fold acc
                    val tipo    = row[ItemVendaTable.tipoProduto]
                    val custo   = when (tipo) {
                        TipoProduto.MADEIRA ->
                            (row[ItemVendaTable.volumeM3Calculado] ?: BigDecimal.ZERO).multiply(custoM3)
                        TipoProduto.NORMAL  ->
                            (row[ItemVendaTable.quantidadeUnidade]  ?: BigDecimal.ZERO).multiply(custoM3)
                    }
                    acc.add(custo)
                }
        }

        // ── 5. Lucro Bruto ────────────────────────────────────────────────────
        val lucroBruto  = receitaLiquida.subtract(cmv)
        val margemBruta = if (receitaLiquida > BigDecimal.ZERO)
            lucroBruto.divide(receitaLiquida, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal("100"))
                .setScale(2, RoundingMode.HALF_UP)
        else BigDecimal.ZERO

        // ── 6. Despesas operacionais (parcelas pagas de títulos a pagar) ──────
        val despesasRows = (ParcelaFinanceiraTable innerJoin TituloFinanceiroTable)
            .select {
                (TituloFinanceiroTable.tipo eq TipoTitulo.PAGAR) and
                (ParcelaFinanceiraTable.status eq StatusParcela.PAGO) and
                (ParcelaFinanceiraTable.dataPagamento greaterEq dataInicio.toKotlinDate()) and
                (ParcelaFinanceiraTable.dataPagamento lessEq dataFim.toKotlinDate())
            }
            .toList()

        val despesasPorCategoria = despesasRows
            .groupBy { row -> row[TituloFinanceiroTable.categoria] ?: "Sem Categoria" }
            .map { (categoria, rows) ->
                val valor = rows.fold(BigDecimal.ZERO) { acc, r ->
                    acc.add(r[ParcelaFinanceiraTable.valorPago] ?: r[ParcelaFinanceiraTable.valor])
                }
                val pct = if (receitaLiquida > BigDecimal.ZERO)
                    valor.divide(receitaLiquida, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal("100"))
                        .setScale(2, RoundingMode.HALF_UP)
                else BigDecimal.ZERO
                DreCategoriaDto(
                    categoria              = categoria,
                    valor                  = valor.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                    percentualSobreReceita = pct.toPlainString(),
                )
            }
            .sortedByDescending { BigDecimal(it.valor) }

        val totalDespesas = despesasPorCategoria
            .fold(BigDecimal.ZERO) { acc, d -> acc.add(BigDecimal(d.valor)) }

        // ── 7. Resultado Operacional ──────────────────────────────────────────
        val resultadoOperacional = lucroBruto.subtract(totalDespesas)
        val margemOperacional    = if (receitaLiquida > BigDecimal.ZERO)
            resultadoOperacional.divide(receitaLiquida, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal("100"))
                .setScale(2, RoundingMode.HALF_UP)
        else BigDecimal.ZERO

        val ticketMedio = if (qtdVendas > 0)
            receitaBruta.divide(BigDecimal(qtdVendas), 2, RoundingMode.HALF_UP)
        else BigDecimal.ZERO

        DreResponse(
            dataInicio           = dataInicio.toString(),
            dataFim              = dataFim.toString(),
            geradoEm             = LocalDate.now().toString(),
            receitaBruta         = receitaBruta.setScale(2, RoundingMode.HALF_UP).toPlainString(),
            devolucoes           = totalDevolucoes.setScale(2, RoundingMode.HALF_UP).toPlainString(),
            receitaLiquida       = receitaLiquida.setScale(2, RoundingMode.HALF_UP).toPlainString(),
            custoMercadorias     = cmv.setScale(2, RoundingMode.HALF_UP).toPlainString(),
            cmvEstimado          = true,
            lucroBruto           = lucroBruto.setScale(2, RoundingMode.HALF_UP).toPlainString(),
            margemBruta          = margemBruta.toPlainString(),
            despesas             = despesasPorCategoria,
            totalDespesas        = totalDespesas.setScale(2, RoundingMode.HALF_UP).toPlainString(),
            resultadoOperacional = resultadoOperacional.setScale(2, RoundingMode.HALF_UP).toPlainString(),
            margemOperacional    = margemOperacional.toPlainString(),
            resultadoPositivo    = resultadoOperacional >= BigDecimal.ZERO,
            quantidadeVendas     = qtdVendas,
            ticketMedio          = ticketMedio.toPlainString(),
            quantidadeDevolucoes = qtdDevolucoes,
        )
    }

    // ── Relatório de Margem por Período ──────────────────────────────────────

    suspend fun margemPeriodo(dataInicio: LocalDate, dataFim: LocalDate): RelatorioMargemPeriodoResponse = dbQuery {
        val brt    = ZoneOffset.ofHours(-3)
        val inicio = dataInicio.atStartOfDay(brt).toInstant()
        val fim    = dataFim.plusDays(1).atStartOfDay(brt).toInstant()

        // vendas confirmadas no período
        val vendasRows = VendaTable
            .select {
                (VendaTable.status eq StatusVenda.CONFIRMADO) and
                (VendaTable.createdAt greaterEq inicio.toKotlin()) and
                (VendaTable.createdAt less fim.toKotlin())
            }
            .toList()

        if (vendasRows.isEmpty()) return@dbQuery RelatorioMargemPeriodoResponse(
            dataInicio = dataInicio.toString(), dataFim = dataFim.toString(),
            geradoEm = LocalDate.now().toString(), totalProdutos = 0,
            receitaTotalPeriodo = "0.00", custoTotalPeriodo = "0.00",
            lucroBrutoPeriodo = "0.00", margemMediaPonderada = null,
            produtosSemCusto = 0, linhas = emptyList(),
        )

        val vendaMap = vendasRows.associate { row ->
            row[VendaTable.id] to Pair(
                row[VendaTable.numero],
                row[VendaTable.createdAt].toJava().atZone(brt).toLocalDate().toString(),
            )
        }

        // itens das vendas, com produto + unidade + custo médio atual
        val itensRows = ItemVendaTable
            .join(ProdutoTable, JoinType.INNER, ItemVendaTable.produtoId, ProdutoTable.id)
            .join(UnidadeMedidaTable, JoinType.INNER, ProdutoTable.unidadeMedidaId, UnidadeMedidaTable.id)
            .join(
                EstoqueSaldoTable,
                JoinType.LEFT,
                onColumn    = ItemVendaTable.produtoId,
                otherColumn = EstoqueSaldoTable.produtoId,
                additionalConstraint = { EstoqueSaldoTable.depositoId eq DEPOSITO_PADRAO },
            )
            .select { ItemVendaTable.vendaId inList vendaMap.keys.toList() }
            .toList()

        // agrupa por produto
        val porProduto = itensRows.groupBy { it[ItemVendaTable.produtoId] }

        val linhas = porProduto.map { (produtoId, rows) ->
            val first   = rows.first()
            val tipo    = first[ItemVendaTable.tipoProduto]
            val unidade = if (tipo == TipoProduto.MADEIRA) "m³" else first[UnidadeMedidaTable.codigo]

            // receita total do produto no período
            val receita = rows.fold(BigDecimal.ZERO) { acc, r -> acc.add(r[ItemVendaTable.valorTotalItem]) }

            // custo estimado (custo médio atual × quantidade)
            val custoM3 = first.getOrNull(EstoqueSaldoTable.custoMedioM3)
            val (custo, qtdTotal) = rows.fold(BigDecimal.ZERO to BigDecimal.ZERO) { (accCusto, accQtd), row ->
                val qty = when (tipo) {
                    TipoProduto.MADEIRA -> row[ItemVendaTable.volumeM3Calculado]   ?: BigDecimal.ZERO
                    TipoProduto.NORMAL  -> row[ItemVendaTable.quantidadeUnidade]   ?: BigDecimal.ZERO
                }
                val c   = if (custoM3 != null) qty.multiply(custoM3) else BigDecimal.ZERO
                (accCusto.add(c)) to accQtd.add(qty)
            }

            val semCusto  = custoM3 == null
            val lucro     = if (!semCusto) receita.subtract(custo) else null
            val margem    = if (!semCusto && receita > BigDecimal.ZERO)
                lucro!!.divide(receita, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal("100"))
                    .setScale(2, RoundingMode.HALF_UP)
                else null

            val qtdVendas  = rows.map { it[ItemVendaTable.vendaId] }.distinct().size
            val ticketMedio = if (qtdVendas > 0)
                receita.divide(BigDecimal(qtdVendas), 2, RoundingMode.HALF_UP)
                else BigDecimal.ZERO

            // detalhe por venda
            val detalhe = rows.groupBy { it[ItemVendaTable.vendaId] }.map { (vid, vRows) ->
                val (numero, data) = vendaMap[vid]!!
                val vQty = vRows.fold(BigDecimal.ZERO) { acc, r ->
                    acc.add(when (tipo) {
                        TipoProduto.MADEIRA -> r[ItemVendaTable.volumeM3Calculado]  ?: BigDecimal.ZERO
                        TipoProduto.NORMAL  -> r[ItemVendaTable.quantidadeUnidade]  ?: BigDecimal.ZERO
                    })
                }
                val vReceita = vRows.fold(BigDecimal.ZERO) { acc, r -> acc.add(r[ItemVendaTable.valorTotalItem]) }
                val vPreco   = vRows.first()[ItemVendaTable.precoUnitario]
                val vCusto   = if (custoM3 != null) vQty.multiply(custoM3).setScale(2, RoundingMode.HALF_UP) else null
                val vLucro   = if (vCusto != null) vReceita.subtract(vCusto).setScale(2, RoundingMode.HALF_UP) else null
                MargemPeriodoDetalhe(
                    vendaNumero   = numero,
                    data          = data,
                    quantidade    = "${vQty.setScale(3, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString()} $unidade",
                    precoUnitario = vPreco.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                    valorTotal    = vReceita.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                    custoEstimado = vCusto?.toPlainString(),
                    lucroEstimado = vLucro?.toPlainString(),
                )
            }.sortedBy { it.data }

            RelatorioMargemPeriodoLinha(
                produtoCodigo    = first[ProdutoTable.codigo],
                produtoDescricao = first[ProdutoTable.descricao],
                tipo             = tipo.name,
                unidade          = unidade,
                quantidadeVendida = "${qtdTotal.setScale(3, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString()} $unidade",
                receitaTotal     = receita.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                custoTotal       = if (!semCusto) custo.setScale(2, RoundingMode.HALF_UP).toPlainString() else null,
                lucroBruto       = lucro?.setScale(2, RoundingMode.HALF_UP)?.toPlainString(),
                margemBruta      = margem?.toPlainString(),
                ticketMedio      = ticketMedio.toPlainString(),
                quantidadeVendas = qtdVendas,
                semCusto         = semCusto,
                detalhe          = detalhe,
            )
        }.sortedByDescending { BigDecimal(it.receitaTotal) }

        // totais
        val receitaTotal = linhas.fold(BigDecimal.ZERO) { acc, l -> acc.add(BigDecimal(l.receitaTotal)) }
        val custoTotal   = linhas.filter { !it.semCusto }
            .fold(BigDecimal.ZERO) { acc, l -> acc.add(BigDecimal(l.custoTotal!!)) }
        val lucroTotal   = receitaTotal.subtract(custoTotal)
        val margemPond   = if (receitaTotal > BigDecimal.ZERO)
            lucroTotal.divide(receitaTotal, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal("100"))
                .setScale(2, RoundingMode.HALF_UP)
                .toPlainString()
            else null

        RelatorioMargemPeriodoResponse(
            dataInicio           = dataInicio.toString(),
            dataFim              = dataFim.toString(),
            geradoEm             = LocalDate.now().toString(),
            totalProdutos        = linhas.size,
            receitaTotalPeriodo  = receitaTotal.setScale(2, RoundingMode.HALF_UP).toPlainString(),
            custoTotalPeriodo    = custoTotal.setScale(2, RoundingMode.HALF_UP).toPlainString(),
            lucroBrutoPeriodo    = lucroTotal.setScale(2, RoundingMode.HALF_UP).toPlainString(),
            margemMediaPonderada = margemPond,
            produtosSemCusto     = linhas.count { it.semCusto },
            linhas               = linhas,
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

    suspend fun notificacoes(): NotificacoesResponse = dbQuery {
        val hoje    = LocalDate.now()
        val amanha2 = hoje.plusDays(2)
        val limite30 = hoje.minusDays(30)
        val brt = ZoneOffset.ofHours(-3)
        val limite30Instant = limite30.atStartOfDay(brt).toInstant().toKotlin()

        val itens = mutableListOf<NotificacaoItem>()

        // 1. Títulos a receber vencidos
        val recVencidos = TituloFinanceiroTable
            .select {
                (TituloFinanceiroTable.tipo eq TipoTitulo.RECEBER) and
                (TituloFinanceiroTable.status eq StatusTitulo.VENCIDO)
            }
            .toList()
        if (recVencidos.isNotEmpty()) {
            val total = recVencidos.fold(BigDecimal.ZERO) { acc, r ->
                acc.add(r[TituloFinanceiroTable.valorOriginal].subtract(r[TituloFinanceiroTable.valorPago]))
            }
            itens += NotificacaoItem(
                tipo       = "TITULO_VENCIDO",
                severidade = "CRITICA",
                titulo     = "${recVencidos.size} título(s) a receber vencido(s)",
                descricao  = "Total em aberto: R$ ${total.setScale(2, RoundingMode.HALF_UP).toPlainString()}",
                quantidade = recVencidos.size,
                valorTotal = total.toPlainString(),
                link       = "/financeiro/contas-receber",
            )
        }

        // 2. Contas a pagar vencidas
        val pagVencidas = TituloFinanceiroTable
            .select {
                (TituloFinanceiroTable.tipo eq TipoTitulo.PAGAR) and
                (TituloFinanceiroTable.status eq StatusTitulo.VENCIDO)
            }
            .toList()
        if (pagVencidas.isNotEmpty()) {
            val total = pagVencidas.fold(BigDecimal.ZERO) { acc, r ->
                acc.add(r[TituloFinanceiroTable.valorOriginal].subtract(r[TituloFinanceiroTable.valorPago]))
            }
            itens += NotificacaoItem(
                tipo       = "CONTA_PAGAR_VENCIDA",
                severidade = "CRITICA",
                titulo     = "${pagVencidas.size} conta(s) a pagar vencida(s)",
                descricao  = "Total em atraso: R$ ${total.setScale(2, RoundingMode.HALF_UP).toPlainString()}",
                quantidade = pagVencidas.size,
                valorTotal = total.toPlainString(),
                link       = "/financeiro/contas-pagar",
            )
        }

        // 3. Parcelas a receber vencendo em até 2 dias
        val recVencendo = ParcelaFinanceiraTable
            .join(TituloFinanceiroTable, JoinType.INNER, ParcelaFinanceiraTable.tituloId, TituloFinanceiroTable.id)
            .select {
                (TituloFinanceiroTable.tipo eq TipoTitulo.RECEBER) and
                (ParcelaFinanceiraTable.status eq StatusParcela.ABERTO) and
                (ParcelaFinanceiraTable.dataVencimento greaterEq hoje.toKotlinDate()) and
                (ParcelaFinanceiraTable.dataVencimento lessEq amanha2.toKotlinDate())
            }
            .toList()
        if (recVencendo.isNotEmpty()) {
            val total = recVencendo.fold(BigDecimal.ZERO) { acc, r ->
                acc.add(r[ParcelaFinanceiraTable.valor].subtract(r[ParcelaFinanceiraTable.valorPago] ?: BigDecimal.ZERO))
            }
            itens += NotificacaoItem(
                tipo       = "TITULO_VENCENDO",
                severidade = "ALERTA",
                titulo     = "${recVencendo.size} título(s) vencendo em até 2 dias",
                descricao  = "Cobranças próximas do vencimento",
                quantidade = recVencendo.size,
                valorTotal = total.toPlainString(),
                link       = "/financeiro/contas-receber",
            )
        }

        // 4. Estoque crítico (saldo m³ zerado ou negativo)
        val estoqueZerado = EstoqueSaldoTable
            .join(ProdutoTable, JoinType.INNER, EstoqueSaldoTable.produtoId, ProdutoTable.id)
            .select {
                (ProdutoTable.tipo eq TipoProduto.MADEIRA) and
                (EstoqueSaldoTable.saldoM3Disponivel lessEq BigDecimal.ZERO)
            }
            .count()
            .toInt()
        if (estoqueZerado > 0) {
            itens += NotificacaoItem(
                tipo       = "ESTOQUE_CRITICO",
                severidade = "ALERTA",
                titulo     = "$estoqueZerado produto(s) com estoque zerado",
                descricao  = "Madeira com saldo m³ ≤ 0 — reposição necessária",
                quantidade = estoqueZerado,
                valorTotal = null,
                link       = "/estoque",
            )
        }

        // 5. Orçamentos sem movimento há mais de 30 dias
        val orcamentosAntigos = VendaTable
            .select {
                (VendaTable.status eq StatusVenda.ORCAMENTO) and
                (VendaTable.createdAt less limite30Instant)
            }
            .count()
            .toInt()
        if (orcamentosAntigos > 0) {
            itens += NotificacaoItem(
                tipo       = "ORCAMENTO_ANTIGO",
                severidade = "INFO",
                titulo     = "$orcamentosAntigos orçamento(s) sem ação há +30 dias",
                descricao  = "Revisar ou cancelar orçamentos antigos",
                quantidade = orcamentosAntigos,
                valorTotal = null,
                link       = "/vendas/orcamentos",
            )
        }

        val criticas = itens.count { it.severidade == "CRITICA" }
        NotificacoesResponse(total = itens.size, criticas = criticas, itens = itens)
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

private fun java.time.LocalDate.toKotlinDate() =
    kotlinx.datetime.LocalDate(year, monthValue, dayOfMonth)
