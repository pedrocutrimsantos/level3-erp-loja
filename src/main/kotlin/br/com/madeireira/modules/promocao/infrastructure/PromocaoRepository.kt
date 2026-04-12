package br.com.madeireira.modules.promocao.infrastructure

import br.com.madeireira.modules.promocao.domain.Promocao
import java.time.LocalDate
import java.util.UUID

interface PromocaoRepository {
    suspend fun findAll(): List<Promocao>
    suspend fun findById(id: UUID): Promocao?
    /** Promoções ativas em [data] — inclui produtos vinculados. */
    suspend fun findAtivas(data: LocalDate = LocalDate.now()): List<Promocao>
    /** Promoções ativas que se aplicam ao produto (globais + vinculadas). */
    suspend fun findAtivasPorProduto(produtoId: UUID, data: LocalDate = LocalDate.now()): List<Promocao>
    suspend fun criar(promocao: Promocao): Promocao
    suspend fun atualizar(promocao: Promocao): Promocao
    suspend fun desativar(id: UUID)
}
