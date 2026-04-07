package br.com.madeireira.modules.estoque.application

import br.com.madeireira.core.conversion.ConversionEngine
import br.com.madeireira.modules.estoque.api.dto.AjusteEstoqueRequest
import br.com.madeireira.modules.estoque.api.dto.MovimentacaoResponse
import br.com.madeireira.modules.estoque.api.dto.SaldoResponse
import br.com.madeireira.modules.estoque.api.dto.SubloteResponse
import br.com.madeireira.modules.estoque.domain.model.EstoqueSaldo
import br.com.madeireira.modules.estoque.domain.model.MovimentacaoEstoque
import br.com.madeireira.modules.estoque.domain.model.TipoMovimentacao
import br.com.madeireira.modules.estoque.infrastructure.EstoqueRepository
import br.com.madeireira.modules.produto.domain.model.TipoProduto
import br.com.madeireira.modules.produto.infrastructure.ProdutoRepository
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.util.UUID

private val DEPOSITO_PADRAO = UUID.fromString("00000000-0000-0000-0000-000000000030")

class EstoqueService(
    private val repo: EstoqueRepository,
    private val produtoRepo: ProdutoRepository,
) {

    suspend fun consultarSaldo(produtoId: UUID): SaldoResponse {
        val produto = produtoRepo.findById(produtoId)
            ?: throw NoSuchElementException("Produto $produtoId não encontrado")

        val saldo = repo.findSaldo(produtoId, DEPOSITO_PADRAO) ?: saldoZerado(produtoId)

        return if (produto.tipo == TipoProduto.MADEIRA) {
            val dimensao = produtoRepo.findDimensaoVigente(produtoId)
            val metrosLineares = dimensao?.let {
                ConversionEngine.m3ParaLinear(saldo.saldoM3Disponivel, it.fatorConversao)
            }
            val saldoPecas = if (produto.comprimentoPecaM != null && produto.comprimentoPecaM > 0 && metrosLineares != null) {
                (metrosLineares / produto.comprimentoPecaM.toBigDecimal()).toInt()
            } else null
            SaldoResponse(
                produtoId             = produtoId.toString(),
                saldoM3               = saldo.saldoM3Disponivel.setScale(4, RoundingMode.HALF_UP).toPlainString(),
                saldoMetrosLineares   = metrosLineares?.toPlainString(),
                saldoPecas            = saldoPecas,
                comprimentoPecaM      = produto.comprimentoPecaM?.toBigDecimal()?.toPlainString(),
                saldoUnidade          = null,
                unidadeSigla          = null,
                custoMedioM3          = saldo.custoMedioM3?.setScale(4, RoundingMode.HALF_UP)?.toPlainString(),
                dataUltimaAtualizacao = saldo.dataUltimaAtualizacao.toString(),
            )
        } else {
            SaldoResponse(
                produtoId             = produtoId.toString(),
                saldoM3               = "0.0000",
                saldoMetrosLineares   = null,
                saldoPecas            = null,
                comprimentoPecaM      = null,
                saldoUnidade          = saldo.saldoUnidadeDisponivel.setScale(4, RoundingMode.HALF_UP).toPlainString(),
                unidadeSigla          = produto.unidadeVendaSigla,
                custoMedioM3          = null,
                dataUltimaAtualizacao = saldo.dataUltimaAtualizacao.toString(),
            )
        }
    }

    suspend fun listarSublotes(produtoId: UUID): List<SubloteResponse> {
        val produto = produtoRepo.findById(produtoId)
            ?: throw NoSuchElementException("Produto $produtoId não encontrado")

        val dimensao = if (produto.tipo == TipoProduto.MADEIRA)
            produtoRepo.findDimensaoVigente(produtoId) else null

        return repo.findSublotes(produtoId, apenasDisponiveis = true).map { sublote ->
            val metrosLineares = dimensao?.let {
                ConversionEngine.m3ParaLinear(sublote.volumeM3Disponivel, it.fatorConversao)
            }
            SubloteResponse(
                id                 = sublote.id.toString(),
                loteId             = sublote.loteId.toString(),
                volumeM3Disponivel = sublote.volumeM3Disponivel.setScale(4, RoundingMode.HALF_UP).toPlainString(),
                metrosLineares     = metrosLineares?.toPlainString(),
                comprimentoM       = sublote.comprimentoM.toPlainString(),
                quantidadePecas    = sublote.quantidadePecas,
                tipo               = sublote.tipo,
            )
        }
    }

    suspend fun registrarAjuste(req: AjusteEstoqueRequest): MovimentacaoResponse {
        val produtoId = UUID.fromString(req.produtoId)
        val quantidade = BigDecimal(req.quantidade)

        require(quantidade > BigDecimal.ZERO) {
            "quantidade deve ser positivo. Recebido: ${req.quantidade}"
        }
        require(req.sinal == "ENTRADA" || req.sinal == "SAIDA") {
            "sinal deve ser ENTRADA ou SAIDA. Recebido: ${req.sinal}"
        }

        val produto = produtoRepo.findById(produtoId)
            ?: throw NoSuchElementException("Produto $produtoId não encontrado")

        val saldoAtual = repo.findSaldo(produtoId, DEPOSITO_PADRAO)
            ?: saldoZerado(produtoId, versao = -1)

        val now = Instant.now()

        return if (produto.tipo == TipoProduto.MADEIRA) {
            val saldoAntes = saldoAtual.saldoM3Disponivel
            if (req.sinal == "SAIDA") {
                require(saldoAntes >= quantidade) {
                    "Saldo insuficiente. Disponível: ${saldoAntes.toPlainString()} m³, solicitado: ${quantidade.toPlainString()} m³"
                }
            }
            val saldoDepois = if (req.sinal == "ENTRADA") saldoAntes.add(quantidade) else saldoAntes.subtract(quantidade)
            repo.upsertSaldo(saldoAtual.copy(
                saldoM3Total      = if (req.sinal == "ENTRADA") saldoAtual.saldoM3Total.add(quantidade) else saldoAtual.saldoM3Total.subtract(quantidade),
                saldoM3Disponivel = saldoDepois,
                dataUltimaAtualizacao = now,
            ))
            val tipoMov = if (req.sinal == "ENTRADA") "AJUSTE_POSITIVO" else "AJUSTE_NEGATIVO"
            val sinalDb = if (req.sinal == "ENTRADA") "POSITIVO" else "NEGATIVO"
            val mov = repo.insertMovimentacao(MovimentacaoEstoque(
                id               = UUID.randomUUID(),
                produtoId        = produtoId,
                depositoId       = DEPOSITO_PADRAO,
                subloteId        = null, dimensaoId = null,
                tipoMovimentacao = tipoMov,
                quantidadeM3     = quantidade,
                quantidadeUnidade = null,
                sinal            = sinalDb,
                custoUnitario    = null,
                dataHora         = now,
                observacao       = req.observacao,
                saldoAntesM3     = saldoAntes,
                saldoDepoisM3    = saldoDepois,
            ))
            toMovimentacaoResponse(mov)
        } else {
            val saldoAntes = saldoAtual.saldoUnidadeDisponivel
            if (req.sinal == "SAIDA") {
                require(saldoAntes >= quantidade) {
                    "Saldo insuficiente. Disponível: ${saldoAntes.toPlainString()} ${produto.unidadeVendaSigla}, solicitado: ${quantidade.toPlainString()}"
                }
            }
            val saldoDepois = if (req.sinal == "ENTRADA") saldoAntes.add(quantidade) else saldoAntes.subtract(quantidade)
            repo.upsertSaldo(saldoAtual.copy(
                saldoUnidadeTotal      = if (req.sinal == "ENTRADA") saldoAtual.saldoUnidadeTotal.add(quantidade) else saldoAtual.saldoUnidadeTotal.subtract(quantidade),
                saldoUnidadeDisponivel = saldoDepois,
                dataUltimaAtualizacao  = now,
            ))
            val tipoMov = if (req.sinal == "ENTRADA") "AJUSTE_POSITIVO" else "AJUSTE_NEGATIVO"
            val sinalDb = if (req.sinal == "ENTRADA") "POSITIVO" else "NEGATIVO"
            val mov = repo.insertMovimentacao(MovimentacaoEstoque(
                id                = UUID.randomUUID(),
                produtoId         = produtoId,
                depositoId        = DEPOSITO_PADRAO,
                subloteId         = null, dimensaoId = null,
                tipoMovimentacao  = tipoMov,
                quantidadeM3      = null,
                quantidadeUnidade = quantidade,
                sinal             = sinalDb,
                custoUnitario     = null,
                dataHora          = now,
                observacao        = req.observacao,
                saldoAntesM3      = null,
                saldoDepoisM3     = null,
            ))
            toMovimentacaoResponse(mov)
        }
    }

    suspend fun listarMovimentacoes(produtoId: UUID, limit: Int = 50): List<MovimentacaoResponse> {
        produtoRepo.findById(produtoId)
            ?: throw NoSuchElementException("Produto $produtoId não encontrado")
        return repo.findMovimentacoes(produtoId, limit).map { toMovimentacaoResponse(it) }
    }

    suspend fun listarMovimentacoesGeral(produtoId: UUID?, tipo: String?, limit: Int = 100): List<MovimentacaoResponse> {
        val tipoEnum = tipo?.let { runCatching { TipoMovimentacao.valueOf(it) }.getOrNull() }
        val movs = repo.findMovimentacoesGeral(produtoId, tipoEnum, limit)

        // Enriquece com dados do produto sem N+1
        val produtosMap = movs.map { it.produtoId }.distinct()
            .mapNotNull { id -> produtoRepo.findById(id)?.let { id to it } }
            .toMap()

        return movs.map { mov ->
            val produto = produtosMap[mov.produtoId]
            toMovimentacaoResponse(mov).copy(
                produtoId        = mov.produtoId.toString(),
                produtoCodigo    = produto?.codigo,
                produtoDescricao = produto?.descricao,
            )
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private fun saldoZerado(produtoId: UUID, versao: Int = 0) = EstoqueSaldo(
        id                     = UUID.randomUUID(),
        produtoId              = produtoId,
        depositoId             = DEPOSITO_PADRAO,
        saldoM3Total           = BigDecimal.ZERO,
        saldoM3Disponivel      = BigDecimal.ZERO,
        saldoM3Reservado       = BigDecimal.ZERO,
        saldoUnidadeTotal      = BigDecimal.ZERO,
        saldoUnidadeDisponivel = BigDecimal.ZERO,
        custoMedioM3           = null,
        versao                 = versao,
        dataUltimaAtualizacao  = Instant.now(),
    )

    private fun toMovimentacaoResponse(mov: MovimentacaoEstoque) = MovimentacaoResponse(
        id                = mov.id.toString(),
        tipoMovimentacao  = mov.tipoMovimentacao,
        quantidadeM3      = mov.quantidadeM3?.setScale(4, RoundingMode.HALF_UP)?.toPlainString(),
        quantidadeUnidade = mov.quantidadeUnidade?.setScale(4, RoundingMode.HALF_UP)?.toPlainString(),
        sinal             = mov.sinal,
        saldoAntesM3      = mov.saldoAntesM3?.setScale(4, RoundingMode.HALF_UP)?.toPlainString(),
        saldoDepoisM3     = mov.saldoDepoisM3?.setScale(4, RoundingMode.HALF_UP)?.toPlainString(),
        dataHora          = mov.dataHora.toString(),
        observacao        = mov.observacao,
    )
}
