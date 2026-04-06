package br.com.madeireira.modules.fiscal.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class DanfeResponse(
    val nf:           DanfeNfData,
    val emitente:     DanfeEmitente,
    val destinatario: DanfeDestinatario?,
    val itens:        List<DanfeItem>,
    val totais:       DanfeTotais,
)

@Serializable
data class DanfeNfData(
    val numero:               String,
    val serie:                String,
    val chaveAcesso:          String?,
    val protocoloAutorizacao: String?,
    val dataEmissao:          String,
    val dataAutorizacao:      String?,
    val naturezaOperacao:     String,
    val ambiente:             String,
    val tipoOperacao:         String,
)

@Serializable
data class DanfeEmitente(
    val cnpj:        String,
    val razaoSocial: String,
    val nomeFantasia: String?,
    val ie:          String?,
    val logradouro:  String,
    val numero:      String,
    val bairro:      String,
    val cidade:      String,
    val uf:          String,
    val cep:         String,
)

@Serializable
data class DanfeDestinatario(
    val nome:       String,
    val cpfCnpj:    String?,
    val ie:         String?,
    val logradouro: String?,
    val numero:     String?,
    val bairro:     String?,
    val cidade:     String?,
    val uf:         String?,
    val cep:        String?,
)

@Serializable
data class DanfeItem(
    val numeroItem:    Int,
    val codigo:        String,
    val descricao:     String,
    val ncm:           String,
    val cfop:          String,
    val unidade:       String,
    val quantidade:    String,
    val valorUnitario: String,
    val valorTotal:    String,
)

@Serializable
data class DanfeTotais(
    val valorProdutos: String,
    val valorDesconto: String,
    val valorFrete:    String,
    val valorTotal:    String,
)
