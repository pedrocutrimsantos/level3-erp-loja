package br.com.madeireira.modules.fiscal.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class NfeXmlPreviewResponse(
    val chaveAcesso:  String?,
    val protocolo:    String?,
    val dataEmissao:  String,
    val emitenteCnpj: String,
    val emitenteNome: String,
    val valorTotal:   String,
    val itens:        List<NfeXmlItemPreview>,
)

@Serializable
data class NfeXmlItemPreview(
    val numeroItem:       Int,
    val codigoFornecedor: String,
    val descricao:        String,
    val ncm:              String,
    val cfop:             String,
    val unidade:          String,
    val quantidade:       String,
    val valorUnitario:    String,
    val valorTotal:       String,
    val produtoIdSistema: String? = null,
)

@Serializable
data class NfeXmlConfirmarRequest(
    val chaveAcesso:  String?,
    val emitenteCnpj: String,
    val emitenteNome: String,
    val fornecedorId: String? = null,
    val itens:        List<NfeXmlItemConfirmar>,
)

@Serializable
data class NfeXmlItemConfirmar(
    val descricao:     String,
    val quantidade:    String,
    val valorUnitario: String,
    val produtoId:     String,
    val observacao:    String? = null,
)

@Serializable
data class NfeXmlImportarResponse(
    val itensImportados: Int,
    val erros:           List<String>,
)
