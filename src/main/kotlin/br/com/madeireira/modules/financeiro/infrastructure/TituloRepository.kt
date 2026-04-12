package br.com.madeireira.modules.financeiro.infrastructure

import br.com.madeireira.modules.financeiro.domain.model.ParcelaComTitulo
import br.com.madeireira.modules.financeiro.domain.model.ParcelaFinanceira
import br.com.madeireira.modules.financeiro.domain.model.StatusTitulo
import br.com.madeireira.modules.financeiro.domain.model.TipoTitulo
import br.com.madeireira.modules.financeiro.domain.model.TituloFinanceiro
import java.time.LocalDate
import java.util.UUID

interface TituloRepository {
    suspend fun criar(titulo: TituloFinanceiro): TituloFinanceiro
    suspend fun criarParcela(parcela: ParcelaFinanceira): ParcelaFinanceira
    suspend fun findById(id: UUID): TituloFinanceiro?
    suspend fun findAll(tipo: TipoTitulo?, status: StatusTitulo?, limit: Int): List<TituloFinanceiro>
    suspend fun findParcelasByTituloId(tituloId: UUID): List<ParcelaFinanceira>
    suspend fun updateTitulo(titulo: TituloFinanceiro): TituloFinanceiro
    suspend fun updateParcela(parcela: ParcelaFinanceira): ParcelaFinanceira
    suspend fun cancelarParcelas(tituloId: UUID)
    suspend fun findParcelasAbertasNoPeriodo(dataInicio: LocalDate, dataFim: LocalDate): List<ParcelaComTitulo>
    suspend fun sumParcelasAbertasPagar(ate: LocalDate): Map<String, java.math.BigDecimal>
    suspend fun sumParcelasAbertasReceber(ate: LocalDate): Map<String, java.math.BigDecimal>
}
