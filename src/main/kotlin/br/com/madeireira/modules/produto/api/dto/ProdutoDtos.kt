package br.com.madeireira.modules.produto.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class CriarProdutoRequest(
    val codigo: String,
    val descricao: String,
    val tipo: String,                          // "MADEIRA" | "NORMAL"
    val ncm: String,
    val unidadeVendaSigla: String? = null,     // ex: "KG", "UN", "M", "L" — NORMAL obrigatório; MADEIRA usa "M"
    val espessuraM: Double? = null,            // obrigatório se tipo == MADEIRA (em metros, ex: 0.05)
    val larguraM: Double? = null,              // obrigatório se tipo == MADEIRA (em metros, ex: 0.20)
    val controlarConversaoMadeira: Boolean? = null, // default: true (compra m³ → estoque ml → NF m³)
    val comprimentoPecaM: Double? = null,           // ex: 10.0 para tábuas de 10m (null = sem modo peça)
    val precoVenda: Double? = null,                 // R$/m (MADEIRA) ou R$/unidade (NORMAL)
)

@Serializable
data class ProdutoResponse(
    val id: String,
    val codigo: String,
    val descricao: String,
    val tipo: String,
    val ncm: String,
    val unidadeVendaSigla: String,
    val ativo: Boolean,
    val dimensaoVigente: DimensaoResponse? = null,
    val controlarConversaoMadeira: Boolean = true,
    val comprimentoPecaM: Double? = null,  // ex: 10.0 para tábuas de 10m (null = sem modo peça)
    val unidadeCompra: String? = null,     // ex: "m³" para MADEIRA
    val unidadeEstoque: String? = null,    // ex: "metro linear" para MADEIRA
    val unidadeFiscal: String? = null,     // ex: "m³" para MADEIRA
    val precoVenda: String? = null,        // R$/m (MADEIRA) ou R$/unidade (NORMAL)
)

@Serializable
data class DimensaoResponse(
    val espessuraM: Double,              // espessura em metros (ex: 0.05)
    val larguraM: Double,               // largura em metros (ex: 0.20)
    val fatorConversao: String,         // formatado: "0.01000000"
    val metrosLinearPorM3: String,      // calculado: "100.00"
)

@Serializable
data class AtualizarDimensaoRequest(
    val espessuraM: Double,   // em metros (ex: 0.05)
    val larguraM: Double,    // em metros (ex: 0.20)
)

@Serializable
data class AtualizarProdutoRequest(
    val descricao: String,
    val ncm: String,
    val comprimentoPecaM: Double? = null,  // null = sem modo peça; 0.0 = remover modo peça
    val precoVenda: Double? = null,        // null = não alterar; 0.0 = remover preço
)

@Serializable
data class UnidadeMedidaResponse(
    val id: String,
    val codigo: String,
    val descricao: String,
    val tipo: String,
    val casasDecimais: Int,
)

@Serializable
data class PrecificacaoResponse(
    val pfVista: String? = null,   // R$/unidade ou R$/metro — PF à vista
    val pfPrazo: String? = null,   // PF a prazo
    val pjVista: String? = null,   // PJ à vista
    val pjPrazo: String? = null,   // PJ a prazo
)

@Serializable
data class SalvarPrecificacaoRequest(
    val pfVista: Double? = null,   // null ou ≤0 = remover
    val pfPrazo: Double? = null,
    val pjVista: Double? = null,
    val pjPrazo: Double? = null,
)

@Serializable
data class AtualizarPrecoRequest(
    val preco: Double?,   // null ou 0.0 = remover preço; >0 = definir novo preço
)

@Serializable
data class ErroResponse(
    val erro: String,
    val detalhes: String? = null,
)
