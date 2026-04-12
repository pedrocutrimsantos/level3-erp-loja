package br.com.madeireira.modules.financeiro.application

import br.com.madeireira.modules.cliente.infrastructure.ClienteRepository
import br.com.madeireira.modules.financeiro.api.dto.BaixaTituloRequest
import br.com.madeireira.modules.financeiro.api.dto.CriarDespesaRequest
import br.com.madeireira.modules.financeiro.api.dto.FluxoCaixaResponse
import br.com.madeireira.modules.financeiro.api.dto.LancamentoFluxoResponse
import br.com.madeireira.modules.financeiro.api.dto.ResumoPagarResponse
import br.com.madeireira.modules.financeiro.api.dto.ResumoReceberResponse
import br.com.madeireira.modules.financeiro.api.dto.TituloResponse
import br.com.madeireira.modules.financeiro.domain.model.FormaPagamento
import br.com.madeireira.modules.financeiro.domain.model.ParcelaFinanceira
import br.com.madeireira.modules.financeiro.domain.model.StatusParcela
import br.com.madeireira.modules.financeiro.domain.model.StatusTitulo
import br.com.madeireira.modules.financeiro.domain.model.TipoTitulo
import br.com.madeireira.modules.financeiro.domain.model.TituloFinanceiro
import br.com.madeireira.modules.financeiro.infrastructure.TituloRepository
import br.com.madeireira.modules.fornecedor.infrastructure.FornecedorRepository
import br.com.madeireira.modules.venda.infrastructure.VendaRepository
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

class TituloService(
    private val tituloRepo: TituloRepository,
    private val clienteRepo: ClienteRepository,
    private val vendaRepo: VendaRepository,
    private val fornecedorRepo: FornecedorRepository,
) {
    suspend fun listar(tipo: TipoTitulo?, status: StatusTitulo?, limit: Int = 100): List<TituloResponse> {
        val titulos = tituloRepo.findAll(tipo, status, limit)
        return titulos.map { toResponse(it) }
    }

    suspend fun registrarBaixa(id: UUID, req: BaixaTituloRequest): TituloResponse {
        val titulo = tituloRepo.findById(id)
            ?: throw NoSuchElementException("Título não encontrado: $id")

        require(titulo.status != StatusTitulo.PAGO) { "Título já foi pago." }
        require(titulo.status != StatusTitulo.CANCELADO) { "Título cancelado não pode ser baixado." }

        val forma = runCatching { FormaPagamento.valueOf(req.formaPagamento) }.getOrElse {
            throw IllegalArgumentException("Forma de pagamento inválida: ${req.formaPagamento}")
        }

        val dataPgto = req.dataPagamento?.let { LocalDate.parse(it) } ?: LocalDate.now()

        val parcelas = tituloRepo.findParcelasByTituloId(id)
        val parcela = parcelas.firstOrNull { it.status == StatusParcela.ABERTO || it.status == StatusParcela.VENCIDO }
            ?: throw IllegalStateException("Nenhuma parcela em aberto.")

        val parcelaAtualizada = parcela.copy(
            dataPagamento  = dataPgto,
            valorPago      = parcela.valor,
            formaPagamento = forma,
            status         = StatusParcela.PAGO,
        )
        tituloRepo.updateParcela(parcelaAtualizada)

        val novoValorPago = titulo.valorPago.add(parcela.valor)
        val novoStatus = if (novoValorPago >= titulo.valorOriginal) StatusTitulo.PAGO else StatusTitulo.PAGO_PARCIAL
        val tituloAtualizado = titulo.copy(valorPago = novoValorPago, status = novoStatus)
        tituloRepo.updateTitulo(tituloAtualizado)

        return toResponse(tituloAtualizado)
    }

    suspend fun criarDespesa(req: CriarDespesaRequest): TituloResponse {
        require(req.descricao.isNotBlank()) { "Descrição é obrigatória." }
        val valorTotal = runCatching { java.math.BigDecimal(req.valor) }.getOrElse {
            throw IllegalArgumentException("Valor inválido: ${req.valor}")
        }
        require(valorTotal > java.math.BigDecimal.ZERO) { "Valor deve ser positivo." }
        val dataVenc1 = runCatching { LocalDate.parse(req.dataVencimento) }.getOrElse {
            throw IllegalArgumentException("Data de vencimento inválida: ${req.dataVencimento}")
        }
        val nParcelas = req.numeroParcelas.coerceIn(1, 36)
        val intervalo = req.intervaloDiasParcelas.coerceIn(1, 365).toLong()
        val fornecedorId = req.fornecedorId?.let {
            runCatching { UUID.fromString(it) }.getOrElse { throw IllegalArgumentException("fornecedorId inválido") }
        }

        val id = UUID.randomUUID()
        val numero = "DESP-${System.currentTimeMillis().toString(36).takeLast(7).uppercase()}"

        val titulo = TituloFinanceiro(
            id            = id,
            numero        = numero,
            descricao     = req.descricao.trim(),
            tipo          = TipoTitulo.PAGAR,
            vendaId       = null,
            compraId      = null,
            clienteId     = null,
            fornecedorId  = fornecedorId,
            categoria     = req.categoria?.trim()?.uppercase()?.takeIf { it.isNotBlank() },
            valorOriginal = valorTotal,
            valorPago     = BigDecimal.ZERO,
            status        = StatusTitulo.ABERTO,
            dataEmissao   = LocalDate.now(),
            createdAt     = Instant.now(),
        )
        tituloRepo.criar(titulo)

        // Distribui o valor entre as parcelas (última absorve centavos de arredondamento)
        val valorParcela = valorTotal.divide(java.math.BigDecimal(nParcelas), 2, java.math.RoundingMode.DOWN)
        val resto = valorTotal.subtract(valorParcela.multiply(java.math.BigDecimal(nParcelas)))

        for (i in 1..nParcelas) {
            val valor = if (i == nParcelas) valorParcela.add(resto) else valorParcela
            tituloRepo.criarParcela(ParcelaFinanceira(
                id             = UUID.randomUUID(),
                tituloId       = id,
                numeroParcela  = i,
                valor          = valor,
                dataVencimento = dataVenc1.plusDays(intervalo * (i - 1)),
                dataPagamento  = null,
                valorPago      = null,
                formaPagamento = null,
                status         = StatusParcela.ABERTO,
            ))
        }

        return toResponse(titulo)
    }

    suspend fun cancelarTitulo(id: UUID): TituloResponse {
        val titulo = tituloRepo.findById(id)
            ?: throw NoSuchElementException("Título não encontrado: $id")
        require(titulo.status != StatusTitulo.PAGO)      { "Título já pago não pode ser cancelado." }
        require(titulo.status != StatusTitulo.CANCELADO) { "Título já cancelado." }

        val cancelado = titulo.copy(status = StatusTitulo.CANCELADO)
        tituloRepo.updateTitulo(cancelado)
        tituloRepo.cancelarParcelas(id)
        return toResponse(cancelado)
    }

    suspend fun resumoPagar(): ResumoPagarResponse {
        val hoje = LocalDate.now()
        val sums = tituloRepo.sumParcelasAbertasPagar(hoje)
        return ResumoPagarResponse(
            totalAberto      = (sums["total"]   ?: BigDecimal.ZERO).toPlainString(),
            totalVencido     = (sums["vencido"] ?: BigDecimal.ZERO).toPlainString(),
            totalVenceHoje   = (sums["hoje"]    ?: BigDecimal.ZERO).toPlainString(),
            totalVenceSemana = (sums["semana"]  ?: BigDecimal.ZERO).toPlainString(),
        )
    }

    suspend fun resumoReceber(): ResumoReceberResponse {
        val hoje = LocalDate.now()
        val sums = tituloRepo.sumParcelasAbertasReceber(hoje)
        return ResumoReceberResponse(
            totalAberto      = (sums["total"]   ?: BigDecimal.ZERO).toPlainString(),
            totalVencido     = (sums["vencido"] ?: BigDecimal.ZERO).toPlainString(),
            totalVenceHoje   = (sums["hoje"]    ?: BigDecimal.ZERO).toPlainString(),
            totalVenceSemana = (sums["semana"]  ?: BigDecimal.ZERO).toPlainString(),
        )
    }

    // Chamado internamente pelo CompraService
    suspend fun criarParaCompra(
        compraId: UUID,
        compraNumero: String,
        fornecedorId: UUID?,
        valorTotal: BigDecimal,
        dataVencimento: LocalDate,
        formaPagamento: FormaPagamento,
    ): TituloFinanceiro {
        val titulo = TituloFinanceiro(
            id            = UUID.randomUUID(),
            numero        = "PAG-$compraNumero",
            tipo          = TipoTitulo.PAGAR,
            vendaId       = null,
            compraId      = compraId,
            clienteId     = null,
            fornecedorId  = fornecedorId,
            valorOriginal = valorTotal,
            valorPago     = BigDecimal.ZERO,
            status        = StatusTitulo.ABERTO,
            dataEmissao   = LocalDate.now(),
            createdAt     = Instant.now(),
        )
        tituloRepo.criar(titulo)

        val parcela = ParcelaFinanceira(
            id             = UUID.randomUUID(),
            tituloId       = titulo.id,
            numeroParcela  = 1,
            valor          = valorTotal,
            dataVencimento = dataVencimento,
            dataPagamento  = null,
            valorPago      = null,
            formaPagamento = formaPagamento,
            status         = StatusParcela.ABERTO,
        )
        tituloRepo.criarParcela(parcela)

        return titulo
    }

    // Chamado internamente pelo VendaService (CARTAO_CREDITO parcelado)
    suspend fun criarParaVendaCredito(
        vendaId: UUID,
        vendaNumero: String,
        clienteId: UUID?,
        valorTotal: BigDecimal,
        numeroParcelas: Int,
    ): TituloFinanceiro {
        val nParcelas = numeroParcelas.coerceIn(1, 12)
        val titulo = TituloFinanceiro(
            id            = UUID.randomUUID(),
            numero        = "REC-$vendaNumero",
            tipo          = TipoTitulo.RECEBER,
            vendaId       = vendaId,
            compraId      = null,
            clienteId     = clienteId,
            fornecedorId  = null,
            valorOriginal = valorTotal,
            valorPago     = BigDecimal.ZERO,
            status        = StatusTitulo.ABERTO,
            dataEmissao   = LocalDate.now(),
            createdAt     = Instant.now(),
        )
        tituloRepo.criar(titulo)

        val valorParcela = valorTotal.divide(java.math.BigDecimal(nParcelas), 2, java.math.RoundingMode.DOWN)
        val resto = valorTotal.subtract(valorParcela.multiply(java.math.BigDecimal(nParcelas)))

        for (i in 1..nParcelas) {
            val valor = if (i == nParcelas) valorParcela.add(resto) else valorParcela
            tituloRepo.criarParcela(ParcelaFinanceira(
                id             = UUID.randomUUID(),
                tituloId       = titulo.id,
                numeroParcela  = i,
                valor          = valor,
                dataVencimento = LocalDate.now().plusDays(30L * i),
                dataPagamento  = null,
                valorPago      = null,
                formaPagamento = FormaPagamento.CARTAO_CREDITO,
                status         = StatusParcela.ABERTO,
            ))
        }

        return titulo
    }

    // Chamado internamente pelo VendaService (FIADO)
    suspend fun criarParaVendaFiado(
        vendaId: UUID,
        vendaNumero: String,
        clienteId: UUID?,
        valorTotal: BigDecimal,
        dataVencimento: LocalDate,
    ): TituloFinanceiro {
        val titulo = TituloFinanceiro(
            id            = UUID.randomUUID(),
            numero        = "REC-$vendaNumero",
            tipo          = TipoTitulo.RECEBER,
            vendaId       = vendaId,
            compraId      = null,
            clienteId     = clienteId,
            fornecedorId  = null,
            valorOriginal = valorTotal,
            valorPago     = BigDecimal.ZERO,
            status        = StatusTitulo.ABERTO,
            dataEmissao   = LocalDate.now(),
            createdAt     = Instant.now(),
        )
        tituloRepo.criar(titulo)

        val parcela = ParcelaFinanceira(
            id              = UUID.randomUUID(),
            tituloId        = titulo.id,
            numeroParcela   = 1,
            valor           = valorTotal,
            dataVencimento  = dataVencimento,
            dataPagamento   = null,
            valorPago       = null,
            formaPagamento  = FormaPagamento.FIADO,
            status          = StatusParcela.ABERTO,
        )
        tituloRepo.criarParcela(parcela)

        return titulo
    }

    suspend fun fluxoCaixa(dias: Int): FluxoCaixaResponse {
        val hoje     = LocalDate.now()
        // Inclui vencidos dos últimos 90 dias para mostrar alertas de atraso
        val inicio   = hoje.minusDays(90)
        val fim      = hoje.plusDays(dias.toLong().coerceIn(1, 365))

        val parcelas = tituloRepo.findParcelasAbertasNoPeriodo(inicio, fim)

        // Monta cache de nomes para evitar N+1
        val clienteNomes = mutableMapOf<UUID, String?>()
        val fornecedorNomes = mutableMapOf<UUID, String?>()

        val lancamentos = parcelas.map { p ->
            val contraparte = when (p.tipoTitulo) {
                br.com.madeireira.modules.financeiro.domain.model.TipoTitulo.RECEBER ->
                    p.clienteId?.let { id ->
                        clienteNomes.getOrPut(id) {
                            runCatching { clienteRepo.findById(id)?.razaoSocial }.getOrNull()
                        }
                    }
                br.com.madeireira.modules.financeiro.domain.model.TipoTitulo.PAGAR ->
                    p.fornecedorId?.let { id ->
                        fornecedorNomes.getOrPut(id) {
                            runCatching { fornecedorRepo.findById(id)?.razaoSocial }.getOrNull()
                        }
                    }
            }
            val vencido    = p.dataVencimento.isBefore(hoje)
            val diasAtraso = if (vencido) java.time.temporal.ChronoUnit.DAYS.between(p.dataVencimento, hoje).toInt() else null
            LancamentoFluxoResponse(
                parcelaId      = p.parcelaId.toString(),
                tituloNumero   = p.tituloNumero,
                tipo           = p.tipoTitulo.name,
                contraparte    = contraparte,
                valor          = p.valor.toPlainString(),
                dataVencimento = p.dataVencimento.toString(),
                vencido        = vencido,
                diasAtraso     = diasAtraso,
            )
        }

        val vencidoReceber  = lancamentos.filter { it.tipo == "RECEBER" && it.vencido }
            .sumOf { it.valor.toBigDecimal() }
        val vencidoPagar    = lancamentos.filter { it.tipo == "PAGAR"   && it.vencido }
            .sumOf { it.valor.toBigDecimal() }
        val proximosReceber = lancamentos.filter { it.tipo == "RECEBER" && !it.vencido }
            .sumOf { it.valor.toBigDecimal() }
        val proximosPagar   = lancamentos.filter { it.tipo == "PAGAR"   && !it.vencido }
            .sumOf { it.valor.toBigDecimal() }

        return FluxoCaixaResponse(
            hoje                 = hoje.toString(),
            totalVencidoReceber  = vencidoReceber.toPlainString(),
            totalVencidoPagar    = vencidoPagar.toPlainString(),
            totalProximosReceber = proximosReceber.toPlainString(),
            totalProximosPagar   = proximosPagar.toPlainString(),
            lancamentos          = lancamentos,
        )
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private suspend fun toResponse(titulo: TituloFinanceiro): TituloResponse {
        val clienteNome = titulo.clienteId?.let {
            runCatching { clienteRepo.findById(it)?.razaoSocial }.getOrNull()
        }
        val fornecedorNome = titulo.fornecedorId?.let {
            runCatching { fornecedorRepo.findById(it)?.razaoSocial }.getOrNull()
        }
        val vendaNumero = titulo.vendaId?.let {
            runCatching { vendaRepo.findVendaById(it)?.numero }.getOrNull()
        }
        val parcelas = tituloRepo.findParcelasByTituloId(titulo.id)
        val primeiraParcela = parcelas.firstOrNull()

        val parcelasPagas = parcelas.count { it.status == StatusParcela.PAGO }

        return TituloResponse(
            id             = titulo.id.toString(),
            numero         = titulo.numero,
            descricao      = titulo.descricao,
            tipo           = titulo.tipo.name,
            categoria      = titulo.categoria,
            clienteNome    = clienteNome,
            fornecedorNome = fornecedorNome,
            fornecedorId   = titulo.fornecedorId?.toString(),
            vendaNumero    = vendaNumero,
            valorOriginal  = titulo.valorOriginal.toPlainString(),
            valorPago      = titulo.valorPago.toPlainString(),
            valorRestante  = titulo.valorOriginal.subtract(titulo.valorPago).toPlainString(),
            status         = titulo.status.name,
            dataEmissao    = titulo.dataEmissao.toString(),
            dataVencimento = primeiraParcela?.dataVencimento?.toString(),
            dataPagamento  = primeiraParcela?.dataPagamento?.toString(),
            formaPagamento = primeiraParcela?.formaPagamento?.name,
            numeroParcelas = parcelas.size,
            parcelasPagas  = parcelasPagas,
        )
    }
}
