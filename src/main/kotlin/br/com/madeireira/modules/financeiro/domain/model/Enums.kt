package br.com.madeireira.modules.financeiro.domain.model

enum class TipoTitulo { RECEBER, PAGAR }
enum class StatusTitulo { ABERTO, PAGO_PARCIAL, PAGO, VENCIDO, CANCELADO, NEGOCIADO }
enum class FormaPagamento { DINHEIRO, CARTAO_DEBITO, CARTAO_CREDITO, PIX, BOLETO, CHEQUE, FIADO }
enum class StatusParcela { ABERTO, PAGO, VENCIDO, CANCELADO }
