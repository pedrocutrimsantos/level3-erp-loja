package br.com.madeireira.modules.financeiro.application

import br.com.madeireira.modules.cliente.infrastructure.ClienteRepository
import br.com.madeireira.modules.financeiro.api.dto.BaixaTituloRequest
import br.com.madeireira.modules.financeiro.api.dto.CriarDespesaRequest
import br.com.madeireira.modules.financeiro.api.dto.FluxoCaixaResponse
import br.com.madeireira.modules.financeiro.api.dto.LancamentoFluxoResponse
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
        val valor = runCatching { java.math.BigDecimal(req.valor) }.getOrElse {
            throw IllegalArgumentException("Valor inválido: ${req.valor}")
        }
        require(valor > java.math.BigDecimal.ZERO) { "Valor deve ser positivo." }
        val dataVenc = runCatching { LocalDate.parse(req.dataVencimento) }.getOrElse {
            throw IllegalArgumentException("Data de vencimento inválida: ${req.dataVencimento}")
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
            fornecedorId  = null,
            valorOriginal = valor,
            valorPago     = BigDecimal.ZERO,
            status        = StatusTitulo.ABERTO,
            dataEmissao   = LocalDate.now(),
            createdAt     = Instant.now(),
        )
        tituloRepo.criar(titulo)

        tituloRepo.criarParcela(ParcelaFinanceira(
            id             = UUID.randomUUID(),
            tituloId       = id,
            numeroParcela  = 1,
            valor          = valor,
            dataVencimento = dataVenc,
            dataPagamento  = null,
            valorPago      = null,
            formaPagamento = null,
            status         = StatusParcela.ABERTO,
        ))

        return toResponse(titulo)
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

        return TituloResponse(
            id             = titulo.id.toString(),
            numero         = titulo.numero,
            descricao      = titulo.descricao,
            tipo           = titulo.tipo.name,
            clienteNome    = clienteNome,
            fornecedorNome = fornecedorNome,
            vendaNumero    = vendaNumero,
            valorOriginal  = titulo.valorOriginal.toPlainString(),
            valorPago      = titulo.valorPago.toPlainString(),
            valorRestante  = titulo.valorOriginal.subtract(titulo.valorPago).toPlainString(),
            status         = titulo.status.name,
            dataEmissao    = titulo.dataEmissao.toString(),
            dataVencimento = primeiraParcela?.dataVencimento?.toString(),
            dataPagamento  = primeiraParcela?.dataPagamento?.toString(),
            formaPagamento = primeiraParcela?.formaPagamento?.name,
        )
    }
}
