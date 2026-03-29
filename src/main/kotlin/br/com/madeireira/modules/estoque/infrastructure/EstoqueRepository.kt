package br.com.madeireira.modules.estoque.infrastructure

import br.com.madeireira.modules.estoque.domain.model.EstoqueSaldo
import br.com.madeireira.modules.estoque.domain.model.MovimentacaoEstoque
import br.com.madeireira.modules.estoque.domain.model.SubloteMadeira
import br.com.madeireira.modules.estoque.domain.model.TipoMovimentacao
import java.util.UUID

interface EstoqueRepository {
    suspend fun findSaldo(produtoId: UUID, depositoId: UUID): EstoqueSaldo?
    suspend fun findAllSaldos(produtoId: UUID): List<EstoqueSaldo>
    suspend fun upsertSaldo(saldo: EstoqueSaldo): EstoqueSaldo
    suspend fun findMovimentacoes(produtoId: UUID, limit: Int = 50): List<MovimentacaoEstoque>
    suspend fun findMovimentacoesByTipo(tipo: TipoMovimentacao, limit: Int = 50): List<MovimentacaoEstoque>
    suspend fun findMovimentacoesGeral(produtoId: UUID? = null, tipo: TipoMovimentacao? = null, limit: Int = 100): List<MovimentacaoEstoque>
    suspend fun insertMovimentacao(mov: MovimentacaoEstoque): MovimentacaoEstoque
    suspend fun findSublotes(produtoId: UUID, apenasDisponiveis: Boolean = true): List<SubloteMadeira>
    suspend fun findSubloteById(id: UUID): SubloteMadeira?
}
