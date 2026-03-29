package br.com.madeireira.modules.estoque.infrastructure

import br.com.madeireira.modules.estoque.domain.model.SinalMovimentacao
import br.com.madeireira.modules.estoque.domain.model.StatusLote
import br.com.madeireira.modules.estoque.domain.model.TipoMovimentacao
import br.com.madeireira.modules.estoque.domain.model.TipoSublote
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.kotlin.datetime.date
import org.jetbrains.exposed.sql.kotlin.datetime.timestamp
import org.postgresql.util.PGobject

object EstoqueSaldoTable : Table("estoque_saldo") {
    val id                     = uuid("id").autoGenerate()
    val produtoId              = uuid("produto_id")
    val depositoId             = uuid("deposito_id")
    val saldoM3Total           = decimal("saldo_m3_total", 12, 4)
    val saldoM3Disponivel      = decimal("saldo_m3_disponivel", 12, 4)
    val saldoM3Reservado       = decimal("saldo_m3_reservado", 12, 4)
    val saldoUnidadeTotal      = decimal("saldo_unidade_total", 14, 4)
    val saldoUnidadeDisponivel = decimal("saldo_unidade_disponivel", 14, 4)
    val saldoUnidadeReservado  = decimal("saldo_unidade_reservado", 14, 4)
    val custoMedioM3           = decimal("custo_medio_m3", 12, 4).nullable()
    val dataUltimaAtualizacao  = timestamp("data_ultima_atualizacao")
    val versao                 = integer("versao")

    override val primaryKey = PrimaryKey(id)
}

object MovimentacaoEstoqueTable : Table("movimentacao_estoque") {
    val id                = uuid("id").autoGenerate()
    val produtoId         = uuid("produto_id")
    val depositoId        = uuid("deposito_id")
    val subloteId         = uuid("sublote_id").nullable()
    val dimensaoId        = uuid("dimensao_id").nullable()
    val tipoMovimentacao  = customEnumeration(
        name   = "tipo_movimentacao",
        sql    = "tipo_movimentacao",
        fromDb = { value -> TipoMovimentacao.valueOf(value as String) },
        toDb   = { value -> PGobject().apply { type = "tipo_movimentacao"; this.value = value.name } },
    )
    val quantidadeM3      = decimal("quantidade_m3", 10, 4).nullable()
    val quantidadeUnidade = decimal("quantidade_unidade", 14, 4).nullable()
    val sinal             = customEnumeration(
        name   = "sinal",
        sql    = "sinal_movimentacao",
        fromDb = { value -> SinalMovimentacao.valueOf(value as String) },
        toDb   = { value -> PGobject().apply { type = "sinal_movimentacao"; this.value = value.name } },
    )
    val vendaId           = uuid("venda_id").nullable()
    val compraId          = uuid("compra_id").nullable()
    val custoUnitario     = decimal("custo_unitario", 12, 4).nullable()
    val dataHora          = timestamp("data_hora")
    val usuarioId         = uuid("usuario_id").nullable()
    val observacao        = text("observacao").nullable()
    val saldoAntesM3      = decimal("saldo_antes_m3", 12, 4).nullable()
    val saldoDepoisM3     = decimal("saldo_depois_m3", 12, 4).nullable()

    override val primaryKey = PrimaryKey(id)
}

object LoteMadeiraTable : Table("lote_madeira") {
    val id                = uuid("id").autoGenerate()
    val numeroLote        = varchar("numero_lote", 50)
    val produtoId         = uuid("produto_id")
    val dimensaoId        = uuid("dimensao_id")
    val fornecedorId      = uuid("fornecedor_id")
    val depositoId        = uuid("deposito_id")
    val dataEntrada       = date("data_entrada")
    val volumeM3Total     = decimal("volume_m3_total", 10, 4)
    val custoM3           = decimal("custo_m3", 12, 4)
    val custoM3SemFrete   = decimal("custo_m3_sem_frete", 12, 4)
    val freteRateadoM3    = decimal("frete_rateado_m3", 12, 4)
    val notaFiscalEntrada = varchar("nota_fiscal_entrada", 60).nullable()
    val status            = customEnumeration(
        name   = "status",
        sql    = "status_lote",
        fromDb = { value -> StatusLote.valueOf(value as String) },
        toDb   = { value -> PGobject().apply { type = "status_lote"; this.value = value.name } },
    )
    val observacao        = text("observacao").nullable()

    override val primaryKey = PrimaryKey(id)
}

object SubloteMadeiraTable : Table("sublote_madeira") {
    val id                 = uuid("id").autoGenerate()
    val loteId             = uuid("lote_id").references(LoteMadeiraTable.id)
    val sublotePaiId       = uuid("sublote_pai_id").nullable()
    val comprimentoM       = decimal("comprimento_m", 8, 3)
    val quantidadePecas    = integer("quantidade_pecas")
    val volumeM3Inicial    = decimal("volume_m3_inicial", 10, 4)
    val volumeM3Disponivel = decimal("volume_m3_disponivel", 10, 4)
    val volumeM3Reservado  = decimal("volume_m3_reservado", 10, 4)
    val tipo               = customEnumeration(
        name   = "tipo",
        sql    = "tipo_sublote",
        fromDb = { value -> TipoSublote.valueOf(value as String) },
        toDb   = { value -> PGobject().apply { type = "tipo_sublote"; this.value = value.name } },
    )
    val precoVendaSugerido = decimal("preco_venda_sugerido", 12, 4).nullable()
    val ativo              = bool("ativo")

    override val primaryKey = PrimaryKey(id)
}
