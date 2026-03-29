package br.com.madeireira.modules.estoque.infrastructure

import br.com.madeireira.infrastructure.database.DatabaseConfig.dbQuery
import br.com.madeireira.modules.estoque.domain.model.EstoqueSaldo
import br.com.madeireira.modules.estoque.domain.model.MovimentacaoEstoque
import br.com.madeireira.modules.estoque.domain.model.SinalMovimentacao
import br.com.madeireira.modules.estoque.domain.model.SubloteMadeira
import br.com.madeireira.modules.estoque.domain.model.TipoMovimentacao
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

class EstoqueRepositoryImpl : EstoqueRepository {

    // -------------------------------------------------------------------------
    // EstoqueSaldo
    // -------------------------------------------------------------------------

    override suspend fun findSaldo(produtoId: UUID, depositoId: UUID): EstoqueSaldo? = dbQuery {
        EstoqueSaldoTable
            .select {
                (EstoqueSaldoTable.produtoId eq produtoId) and
                (EstoqueSaldoTable.depositoId eq depositoId)
            }
            .map { toSaldo(it) }
            .singleOrNull()
    }

    override suspend fun findAllSaldos(produtoId: UUID): List<EstoqueSaldo> = dbQuery {
        EstoqueSaldoTable
            .select { EstoqueSaldoTable.produtoId eq produtoId }
            .map { toSaldo(it) }
    }

    /**
     * INSERT se não existe, UPDATE se existe.
     * O UPDATE verifica `versao = versaoAtual` (lock otimista).
     */
    override suspend fun upsertSaldo(saldo: EstoqueSaldo): EstoqueSaldo = dbQuery {
        val now = saldo.dataUltimaAtualizacao.toKotlinInstant()

        val updated = EstoqueSaldoTable.update({
            (EstoqueSaldoTable.produtoId eq saldo.produtoId) and
            (EstoqueSaldoTable.depositoId eq saldo.depositoId) and
            (EstoqueSaldoTable.versao eq saldo.versao)
        }) {
            it[saldoM3Total]           = saldo.saldoM3Total
            it[saldoM3Disponivel]      = saldo.saldoM3Disponivel
            it[saldoM3Reservado]       = saldo.saldoM3Reservado
            it[saldoUnidadeTotal]      = saldo.saldoUnidadeTotal
            it[saldoUnidadeDisponivel] = saldo.saldoUnidadeDisponivel
            it[saldoUnidadeReservado]  = BigDecimal.ZERO
            it[custoMedioM3]           = saldo.custoMedioM3
            it[dataUltimaAtualizacao]  = now
            it[versao]                 = saldo.versao + 1
        }

        if (updated > 0) return@dbQuery saldo.copy(versao = saldo.versao + 1)

        val exists = EstoqueSaldoTable
            .select {
                (EstoqueSaldoTable.produtoId eq saldo.produtoId) and
                (EstoqueSaldoTable.depositoId eq saldo.depositoId)
            }
            .count() > 0

        if (exists) {
            throw ConcurrentModificationException(
                "Conflito de versão ao atualizar saldo do produto ${saldo.produtoId}. " +
                "Recarregue o saldo e tente novamente."
            )
        }

        EstoqueSaldoTable.insert {
            it[id]                     = saldo.id
            it[produtoId]              = saldo.produtoId
            it[depositoId]             = saldo.depositoId
            it[saldoM3Total]           = saldo.saldoM3Total
            it[saldoM3Disponivel]      = saldo.saldoM3Disponivel
            it[saldoM3Reservado]       = saldo.saldoM3Reservado
            it[saldoUnidadeTotal]      = saldo.saldoUnidadeTotal
            it[saldoUnidadeDisponivel] = saldo.saldoUnidadeDisponivel
            it[saldoUnidadeReservado]  = BigDecimal.ZERO
            it[custoMedioM3]           = saldo.custoMedioM3
            it[dataUltimaAtualizacao]  = now
            it[versao]                 = 0
        }

        saldo.copy(versao = 0)
    }

    // -------------------------------------------------------------------------
    // MovimentacaoEstoque — APPEND-ONLY
    // -------------------------------------------------------------------------

    override suspend fun findMovimentacoes(produtoId: UUID, limit: Int): List<MovimentacaoEstoque> = dbQuery {
        MovimentacaoEstoqueTable
            .select { MovimentacaoEstoqueTable.produtoId eq produtoId }
            .orderBy(MovimentacaoEstoqueTable.dataHora, SortOrder.DESC)
            .limit(limit)
            .map { toMovimentacao(it) }
    }

    override suspend fun findMovimentacoesByTipo(tipo: TipoMovimentacao, limit: Int): List<MovimentacaoEstoque> = dbQuery {
        MovimentacaoEstoqueTable
            .select { MovimentacaoEstoqueTable.tipoMovimentacao eq tipo }
            .orderBy(MovimentacaoEstoqueTable.dataHora, SortOrder.DESC)
            .limit(limit)
            .map { toMovimentacao(it) }
    }

    override suspend fun findMovimentacoesGeral(produtoId: UUID?, tipo: TipoMovimentacao?, limit: Int): List<MovimentacaoEstoque> = dbQuery {
        val query = MovimentacaoEstoqueTable.selectAll()
        if (produtoId != null) query.andWhere { MovimentacaoEstoqueTable.produtoId eq produtoId }
        if (tipo != null)      query.andWhere { MovimentacaoEstoqueTable.tipoMovimentacao eq tipo }
        query
            .orderBy(MovimentacaoEstoqueTable.dataHora, SortOrder.DESC)
            .limit(limit)
            .map { toMovimentacao(it) }
    }

    override suspend fun insertMovimentacao(mov: MovimentacaoEstoque): MovimentacaoEstoque = dbQuery {
        MovimentacaoEstoqueTable.insert {
            it[id]               = mov.id
            it[produtoId]        = mov.produtoId
            it[depositoId]       = mov.depositoId
            it[subloteId]        = mov.subloteId
            it[dimensaoId]       = mov.dimensaoId
            it[tipoMovimentacao] = TipoMovimentacao.valueOf(mov.tipoMovimentacao)
            it[quantidadeM3]     = mov.quantidadeM3
            it[quantidadeUnidade] = mov.quantidadeUnidade
            it[sinal]            = SinalMovimentacao.valueOf(mov.sinal)
            it[vendaId]          = null
            it[compraId]         = null
            it[custoUnitario]    = mov.custoUnitario
            it[dataHora]         = mov.dataHora.toKotlinInstant()
            it[usuarioId]        = null
            it[observacao]       = mov.observacao
            it[saldoAntesM3]     = mov.saldoAntesM3
            it[saldoDepoisM3]    = mov.saldoDepoisM3
        }
        mov
    }

    // -------------------------------------------------------------------------
    // SubloteMadeira
    // -------------------------------------------------------------------------

    override suspend fun findSublotes(produtoId: UUID, apenasDisponiveis: Boolean): List<SubloteMadeira> = dbQuery {
        (SubloteMadeiraTable innerJoin LoteMadeiraTable)
            .select {
                (LoteMadeiraTable.produtoId eq produtoId) and
                if (apenasDisponiveis) (SubloteMadeiraTable.ativo eq true) else Op.TRUE
            }
            .map { toSublote(it) }
    }

    override suspend fun findSubloteById(id: UUID): SubloteMadeira? = dbQuery {
        SubloteMadeiraTable
            .select { SubloteMadeiraTable.id eq id }
            .map { toSublote(it) }
            .singleOrNull()
    }

    // -------------------------------------------------------------------------
    // Mappers
    // -------------------------------------------------------------------------

    private fun toSaldo(row: ResultRow): EstoqueSaldo = EstoqueSaldo(
        id                     = row[EstoqueSaldoTable.id],
        produtoId              = row[EstoqueSaldoTable.produtoId],
        depositoId             = row[EstoqueSaldoTable.depositoId],
        saldoM3Total           = row[EstoqueSaldoTable.saldoM3Total],
        saldoM3Disponivel      = row[EstoqueSaldoTable.saldoM3Disponivel],
        saldoM3Reservado       = row[EstoqueSaldoTable.saldoM3Reservado],
        saldoUnidadeTotal      = row[EstoqueSaldoTable.saldoUnidadeTotal],
        saldoUnidadeDisponivel = row[EstoqueSaldoTable.saldoUnidadeDisponivel],
        custoMedioM3           = row[EstoqueSaldoTable.custoMedioM3],
        versao                 = row[EstoqueSaldoTable.versao],
        dataUltimaAtualizacao  = row[EstoqueSaldoTable.dataUltimaAtualizacao].toJavaInstant(),
    )

    private fun toMovimentacao(row: ResultRow): MovimentacaoEstoque = MovimentacaoEstoque(
        id               = row[MovimentacaoEstoqueTable.id],
        produtoId        = row[MovimentacaoEstoqueTable.produtoId],
        depositoId       = row[MovimentacaoEstoqueTable.depositoId],
        subloteId        = row[MovimentacaoEstoqueTable.subloteId],
        dimensaoId       = row[MovimentacaoEstoqueTable.dimensaoId],
        tipoMovimentacao = row[MovimentacaoEstoqueTable.tipoMovimentacao].name,
        quantidadeM3     = row[MovimentacaoEstoqueTable.quantidadeM3],
        quantidadeUnidade = row[MovimentacaoEstoqueTable.quantidadeUnidade],
        sinal            = row[MovimentacaoEstoqueTable.sinal].name,
        custoUnitario    = row[MovimentacaoEstoqueTable.custoUnitario],
        dataHora         = row[MovimentacaoEstoqueTable.dataHora].toJavaInstant(),
        observacao       = row[MovimentacaoEstoqueTable.observacao],
        saldoAntesM3     = row[MovimentacaoEstoqueTable.saldoAntesM3],
        saldoDepoisM3    = row[MovimentacaoEstoqueTable.saldoDepoisM3],
    )

    private fun toSublote(row: ResultRow): SubloteMadeira = SubloteMadeira(
        id                 = row[SubloteMadeiraTable.id],
        loteId             = row[SubloteMadeiraTable.loteId],
        sublotePaiId       = row[SubloteMadeiraTable.sublotePaiId],
        comprimentoM       = row[SubloteMadeiraTable.comprimentoM],
        quantidadePecas    = row[SubloteMadeiraTable.quantidadePecas],
        volumeM3Inicial    = row[SubloteMadeiraTable.volumeM3Inicial],
        volumeM3Disponivel = row[SubloteMadeiraTable.volumeM3Disponivel],
        tipo               = row[SubloteMadeiraTable.tipo].name,
        ativo              = row[SubloteMadeiraTable.ativo],
    )
}

private fun Instant.toKotlinInstant(): kotlinx.datetime.Instant =
    kotlinx.datetime.Instant.fromEpochMilliseconds(this.toEpochMilli())

private fun kotlinx.datetime.Instant.toJavaInstant(): Instant =
    Instant.ofEpochMilli(this.toEpochMilliseconds())
