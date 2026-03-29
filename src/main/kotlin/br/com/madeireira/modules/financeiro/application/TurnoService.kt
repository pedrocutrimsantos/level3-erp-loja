package br.com.madeireira.modules.financeiro.application

import br.com.madeireira.modules.financeiro.api.dto.AbrirCaixaRequest
import br.com.madeireira.modules.financeiro.api.dto.FecharCaixaRequest
import br.com.madeireira.modules.financeiro.api.dto.RegistrarSangriaRequest
import br.com.madeireira.modules.financeiro.api.dto.SangriaResponse
import br.com.madeireira.modules.financeiro.api.dto.TurnoCaixaResponse
import br.com.madeireira.modules.financeiro.domain.model.SangriaCaixa
import br.com.madeireira.modules.financeiro.domain.model.StatusTurno
import br.com.madeireira.modules.financeiro.domain.model.TurnoCaixa
import br.com.madeireira.modules.financeiro.infrastructure.TurnoRepository
import br.com.madeireira.modules.venda.application.VendaService
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

class TurnoService(
    private val turnoRepo: TurnoRepository,
    private val vendaService: VendaService,
) {
    suspend fun buscarOuNulo(data: LocalDate): TurnoCaixaResponse? {
        val turno = turnoRepo.findByData(data) ?: return null
        return toResponse(turno, data)
    }

    suspend fun abrir(req: AbrirCaixaRequest): TurnoCaixaResponse {
        val hoje = LocalDate.now()
        val existente = turnoRepo.findByData(hoje)
        require(existente == null) { "Caixa já foi aberto para hoje." }

        val now = Instant.now()
        val turno = TurnoCaixa(
            id              = UUID.randomUUID(),
            data            = hoje,
            valorAbertura   = BigDecimal(req.valorAbertura),
            valorFechamento = null,
            status          = StatusTurno.ABERTO,
            observacao      = null,
            createdAt       = now,
            updatedAt       = now,
        )
        val salvo = turnoRepo.insert(turno)
        return toResponse(salvo, hoje)
    }

    suspend fun fechar(req: FecharCaixaRequest): TurnoCaixaResponse {
        val hoje = LocalDate.now()
        val turno = turnoRepo.findByData(hoje)
            ?: throw NoSuchElementException("Nenhum caixa aberto para hoje.")
        require(turno.status == StatusTurno.ABERTO) { "O caixa já foi fechado." }

        val atualizado = turno.copy(
            valorFechamento = BigDecimal(req.valorFechamento),
            status          = StatusTurno.FECHADO,
            observacao      = req.observacao,
            updatedAt       = Instant.now(),
        )
        val salvo = turnoRepo.update(atualizado)
        return toResponse(salvo, hoje)
    }

    suspend fun registrarSangria(req: RegistrarSangriaRequest): TurnoCaixaResponse {
        require(req.descricao.isNotBlank()) { "Descrição da sangria é obrigatória." }
        require(req.valor > 0) { "Valor da sangria deve ser positivo." }

        val hoje = LocalDate.now()
        val turno = turnoRepo.findByData(hoje)
            ?: throw NoSuchElementException("Nenhum caixa aberto para hoje.")
        require(turno.status == StatusTurno.ABERTO) { "O caixa já está fechado." }

        val sangria = SangriaCaixa(
            id        = UUID.randomUUID(),
            turnoId   = turno.id,
            descricao = req.descricao.trim(),
            valor     = BigDecimal(req.valor),
            createdAt = Instant.now(),
        )
        turnoRepo.insertSangria(sangria)
        return toResponse(turno, hoje)
    }

    suspend fun reabrir(): TurnoCaixaResponse {
        val hoje = LocalDate.now()
        val turno = turnoRepo.findByData(hoje)
            ?: throw NoSuchElementException("Nenhum turno encontrado para hoje.")
        require(turno.status == StatusTurno.FECHADO) { "O caixa já está aberto." }

        val atualizado = turno.copy(
            valorFechamento = null,
            status          = StatusTurno.ABERTO,
            observacao      = null,
            updatedAt       = Instant.now(),
        )
        val salvo = turnoRepo.update(atualizado)
        return toResponse(salvo, hoje)
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private suspend fun toResponse(turno: TurnoCaixa, data: LocalDate): TurnoCaixaResponse {
        val sangrias  = turnoRepo.findSangriasByTurno(turno.id)
        val resumo    = vendaService.resumoCaixa(data)

        // Entradas em dinheiro do dia (somente DINHEIRO vai para o caixa físico)
        val totalEntradas = resumo.resumoPorForma
            .filter { it.formaPagamento == "DINHEIRO" }
            .sumOf { it.total.toBigDecimal() }

        val totalSangrias  = sangrias.sumOf { it.valor }
        val saldoEsperado  = turno.valorAbertura + totalEntradas - totalSangrias
        val diferenca      = turno.valorFechamento?.let { it - saldoEsperado }

        return TurnoCaixaResponse(
            id              = turno.id.toString(),
            data            = turno.data.toString(),
            status          = turno.status.name,
            valorAbertura   = turno.valorAbertura.toPlainString(),
            valorFechamento = turno.valorFechamento?.toPlainString(),
            observacao      = turno.observacao,
            totalEntradas   = totalEntradas.toPlainString(),
            totalSangrias   = totalSangrias.toPlainString(),
            saldoEsperado   = saldoEsperado.toPlainString(),
            diferenca       = diferenca?.toPlainString(),
            sangrias        = sangrias.map { s ->
                SangriaResponse(
                    id        = s.id.toString(),
                    descricao = s.descricao,
                    valor     = s.valor.toPlainString(),
                    createdAt = s.createdAt.toString(),
                )
            },
            createdAt = turno.createdAt.toString(),
        )
    }
}
