package br.com.madeireira.modules.produto.domain.model

import java.time.Instant
import java.util.UUID

data class Produto(
    val id: UUID,
    val codigo: String,
    val descricao: String,
    val unidadeMedidaId: UUID,
    val unidadeVendaSigla: String,         // sigla da unidade_medida (ex: "M", "KG", "UN")
    val tipo: TipoProduto,
    val ncm: String,
    val grupoFiscalId: UUID,
    val ativo: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
    val controlarConversaoMadeira: Boolean = true, // compra m³ → estoque metro linear → NF m³
    val comprimentoPecaM: Double? = null,          // comprimento fixo da peça em metros (null = sem modo peça)
    val precoVenda: java.math.BigDecimal? = null,  // R$/metro linear (MADEIRA) ou R$/unidade (NORMAL)
)

enum class TipoProduto { MADEIRA, NORMAL }
