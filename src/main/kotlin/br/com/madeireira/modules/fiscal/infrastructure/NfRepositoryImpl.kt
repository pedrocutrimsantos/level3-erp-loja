package br.com.madeireira.modules.fiscal.infrastructure

import br.com.madeireira.infrastructure.database.DatabaseConfig.dbQuery
import br.com.madeireira.modules.fiscal.api.dto.*
import br.com.madeireira.modules.fiscal.domain.model.NfEmitida
import br.com.madeireira.modules.fiscal.domain.model.StatusNf
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.TransactionManager
import java.math.BigDecimal
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.UUID

// ── Tabelas auxiliares para query do DANFE ────────────────────────────────────

private object EmpresaT : Table("empresa") {
    val cnpj         = varchar("cnpj", 18)
    val razaoSocial  = varchar("razao_social", 150)
    val nomeFantasia = varchar("nome_fantasia", 100).nullable()
    val ie           = varchar("ie", 20).nullable()
    val logradouro   = varchar("logradouro", 150)
    val numero       = varchar("numero", 10)
    val bairro       = varchar("bairro", 80)
    val cidade       = varchar("cidade", 80)
    val uf           = char("uf", 2)
    val cep          = char("cep", 9)
    val cfopPadrao   = varchar("cfop_padrao", 5)
    override val primaryKey = PrimaryKey(uuid("id"))
}

private object ClienteT : Table("cliente") {
    val id           = uuid("id")
    val razaoSocial  = varchar("razao_social", 150)
    val cnpjCpf      = varchar("cnpj_cpf", 18).nullable()
    val ie           = varchar("inscricao_estadual", 20).nullable()
    override val primaryKey = PrimaryKey(id)
}

private object ClienteEnderecoT : Table("cliente_endereco") {
    val clienteId  = uuid("cliente_id")
    val logradouro = varchar("logradouro", 150)
    val numero     = varchar("numero", 10)
    val bairro     = varchar("bairro", 80)
    val cidade     = varchar("cidade", 80)
    val uf         = char("uf", 2)
    val cep        = char("cep", 9)
    val principal  = bool("principal")
    override val primaryKey = PrimaryKey(uuid("id"))
}

private object VendaT : Table("venda") {
    val id            = uuid("id")
    val clienteId     = uuid("cliente_id").nullable()
    val valorSubtotal = decimal("valor_subtotal", 14, 2)
    val valorDesconto = decimal("valor_desconto", 14, 2)
    val valorFrete    = decimal("valor_frete", 12, 2)
    val valorTotal    = decimal("valor_total", 14, 2)
    override val primaryKey = PrimaryKey(id)
}

private object ItemVendaT : Table("item_venda") {
    val id                = uuid("id")
    val vendaId           = uuid("venda_id")
    val produtoId         = uuid("produto_id")
    val numeroLinha       = integer("numero_linha")
    val quantidadeUnidade = decimal("quantidade_unidade", 14, 4).nullable()
    val volumeM3Calculado = decimal("volume_m3_calculado", 10, 4).nullable()
    val precoUnitario     = decimal("preco_unitario", 12, 4)
    val valorTotalItem    = decimal("valor_total_item", 14, 2)
    override val primaryKey = PrimaryKey(id)
}

private object ProdutoT : Table("produto") {
    val id              = uuid("id")
    val codigo          = varchar("codigo_interno", 30)
    val descricao       = varchar("nome_comercial", 120)
    val ncm             = varchar("ncm", 8)
    val unidadeMedidaId = uuid("unidade_venda_id").nullable()
    override val primaryKey = PrimaryKey(id)
}

private object UnidadeMedidaT : Table("unidade_medida") {
    val id     = uuid("id")
    val codigo = varchar("codigo", 10)
    override val primaryKey = PrimaryKey(id)
}

private val danfeDtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneOffset.UTC)

// ── Implementação ─────────────────────────────────────────────────────────────

class NfRepositoryImpl : NfRepository {

    override suspend fun findAll(limit: Int): List<NfEmitida> = dbQuery {
        NfEmitidaTable
            .selectAll()
            .orderBy(NfEmitidaTable.dataEmissao, SortOrder.DESC)
            .limit(limit)
            .map { toNf(it) }
    }

    override suspend fun findById(id: UUID): NfEmitida? = dbQuery {
        NfEmitidaTable
            .select { NfEmitidaTable.id eq id }
            .map { toNf(it) }
            .singleOrNull()
    }

    override suspend fun findByVendaId(vendaId: UUID): NfEmitida? = dbQuery {
        NfEmitidaTable
            .select { NfEmitidaTable.vendaId eq vendaId }
            .map { toNf(it) }
            .firstOrNull()
    }

    override suspend fun vendaIdsComNf(excluirStatus: Set<StatusNf>): Set<UUID> = dbQuery {
        NfEmitidaTable
            .select {
                NfEmitidaTable.vendaId.isNotNull() and
                (NfEmitidaTable.statusSefaz notInList excluirStatus.toList())
            }
            .mapNotNull { it[NfEmitidaTable.vendaId] }
            .toSet()
    }

    override suspend fun proximoNumero(serie: String): Int = dbQuery {
        // Advisory lock por série dentro da transação.
        // Garante que duas emissões simultâneas nunca obtenham o mesmo número,
        // sem necessidade de tabela auxiliar. O lock é liberado automaticamente
        // no commit ou rollback da transação (pg_advisory_xact_lock).
        TransactionManager.current().exec("SELECT pg_advisory_xact_lock(hashtext('nf_numero_$serie'))")

        NfEmitidaTable
            .select { NfEmitidaTable.serie eq serie }
            .maxOfOrNull { it[NfEmitidaTable.numero] }
            ?.plus(1)
            ?: 1
    }

    override suspend fun insert(nf: NfEmitida): NfEmitida = dbQuery {
        NfEmitidaTable.insert {
            it[id]                    = nf.id
            it[vendaId]               = nf.vendaId
            it[tipoOperacao]          = nf.tipoOperacao
            it[modelo]                = nf.modelo
            it[numero]                = nf.numero
            it[serie]                 = nf.serie
            it[chaveAcesso]           = nf.chaveAcesso
            it[statusSefaz]           = nf.statusSefaz
            it[ambiente]              = nf.ambiente
            it[dataEmissao]           = nf.dataEmissao.toKotlin()
            it[dataAutorizacao]       = nf.dataAutorizacao?.toKotlin()
            it[protocoloAutorizacao]  = nf.protocoloAutorizacao
            it[xmlAutorizado]         = nf.xmlAutorizado
            it[motivoRejeicao]        = nf.motivoRejeicao
            it[chaveCorrelacao]       = nf.chaveCorrelacao
            it[tentativasEnvio]       = nf.tentativasEnvio
            it[justificativaCancel]   = nf.justificativaCancel
            it[dataCancelamento]      = nf.dataCancelamento?.toKotlin()
            it[protocoloCancelamento] = nf.protocoloCancelamento
            it[createdAt]             = nf.createdAt.toKotlin()
        }
        nf
    }

    override suspend fun update(nf: NfEmitida): NfEmitida = dbQuery {
        NfEmitidaTable.update({ NfEmitidaTable.id eq nf.id }) {
            it[chaveAcesso]           = nf.chaveAcesso
            it[statusSefaz]           = nf.statusSefaz
            it[dataAutorizacao]       = nf.dataAutorizacao?.toKotlin()
            it[protocoloAutorizacao]  = nf.protocoloAutorizacao
            it[xmlAutorizado]         = nf.xmlAutorizado
            it[motivoRejeicao]        = nf.motivoRejeicao
            it[tentativasEnvio]       = nf.tentativasEnvio
            it[justificativaCancel]   = nf.justificativaCancel
            it[dataCancelamento]      = nf.dataCancelamento?.toKotlin()
            it[protocoloCancelamento] = nf.protocoloCancelamento
        }
        nf
    }

    override suspend fun getDanfeData(nfId: UUID): DanfeResponse? = dbQuery {
        val nf = NfEmitidaTable
            .select { NfEmitidaTable.id eq nfId }
            .singleOrNull()
            ?.let { toNf(it) } ?: return@dbQuery null

        // 1. Emitente
        val emitRow  = EmpresaT.selectAll().limit(1).firstOrNull()
        val cfopEmit = emitRow?.get(EmpresaT.cfopPadrao)?.ifBlank { "5102" } ?: "5102"
        val emitente = if (emitRow != null) {
            DanfeEmitente(
                cnpj         = emitRow[EmpresaT.cnpj],
                razaoSocial  = emitRow[EmpresaT.razaoSocial],
                nomeFantasia = emitRow[EmpresaT.nomeFantasia],
                ie           = emitRow[EmpresaT.ie],
                logradouro   = emitRow[EmpresaT.logradouro],
                numero       = emitRow[EmpresaT.numero],
                bairro       = emitRow[EmpresaT.bairro],
                cidade       = emitRow[EmpresaT.cidade],
                uf           = emitRow[EmpresaT.uf],
                cep          = emitRow[EmpresaT.cep],
            )
        } else {
            DanfeEmitente("00.000.000/0000-00", "EMITENTE NÃO CONFIGURADO", null, null, "", "", "", "", "", "")
        }

        // 2. Venda + destinatário
        val venda = nf.vendaId?.let { vid ->
            VendaT.select { VendaT.id eq vid }.firstOrNull()
        }
        val destinatario = venda?.get(VendaT.clienteId)?.let { cid ->
            ClienteT.select { ClienteT.id eq cid }.firstOrNull()?.let { crow ->
                val endRow = ClienteEnderecoT
                    .select { ClienteEnderecoT.clienteId eq cid }
                    .orderBy(ClienteEnderecoT.principal, SortOrder.DESC)
                    .firstOrNull()
                DanfeDestinatario(
                    nome       = crow[ClienteT.razaoSocial],
                    cpfCnpj    = crow[ClienteT.cnpjCpf],
                    ie         = crow[ClienteT.ie],
                    logradouro = endRow?.get(ClienteEnderecoT.logradouro),
                    numero     = endRow?.get(ClienteEnderecoT.numero),
                    bairro     = endRow?.get(ClienteEnderecoT.bairro),
                    cidade     = endRow?.get(ClienteEnderecoT.cidade),
                    uf         = endRow?.get(ClienteEnderecoT.uf),
                    cep        = endRow?.get(ClienteEnderecoT.cep),
                )
            }
        }

        // 3. Itens com JOIN: item_venda → produto → unidade_medida
        val itens: List<DanfeItem> = nf.vendaId?.let { vid ->
            ItemVendaT
                .join(ProdutoT, JoinType.LEFT, ItemVendaT.produtoId, ProdutoT.id)
                .join(UnidadeMedidaT, JoinType.LEFT, ProdutoT.unidadeMedidaId, UnidadeMedidaT.id)
                .select { ItemVendaT.vendaId eq vid }
                .orderBy(ItemVendaT.numeroLinha)
                .mapIndexed { idx, row ->
                    val qtd = row[ItemVendaT.quantidadeUnidade]
                        ?: row[ItemVendaT.volumeM3Calculado]
                        ?: BigDecimal.ZERO
                    DanfeItem(
                        numeroItem    = idx + 1,
                        codigo        = row.getOrNull(ProdutoT.codigo) ?: "—",
                        descricao     = row.getOrNull(ProdutoT.descricao) ?: "—",
                        ncm           = row.getOrNull(ProdutoT.ncm) ?: "00000000",
                        cfop          = cfopEmit,
                        unidade       = row.getOrNull(UnidadeMedidaT.codigo) ?: "UN",
                        quantidade    = qtd.toPlainString(),
                        valorUnitario = row[ItemVendaT.precoUnitario].toPlainString(),
                        valorTotal    = row[ItemVendaT.valorTotalItem].toPlainString(),
                    )
                }
        } ?: emptyList()

        // 4. Totais
        val totais = if (venda != null) {
            DanfeTotais(
                valorProdutos = venda[VendaT.valorSubtotal].toPlainString(),
                valorDesconto = venda[VendaT.valorDesconto].toPlainString(),
                valorFrete    = venda[VendaT.valorFrete].toPlainString(),
                valorTotal    = venda[VendaT.valorTotal].toPlainString(),
            )
        } else {
            DanfeTotais("0", "0", "0", "0")
        }

        DanfeResponse(
            nf = DanfeNfData(
                numero               = nf.numero.toString().padStart(9, '0'),
                serie                = nf.serie,
                chaveAcesso          = nf.chaveAcesso,
                protocoloAutorizacao = nf.protocoloAutorizacao,
                dataEmissao          = danfeDtf.format(nf.dataEmissao),
                dataAutorizacao      = nf.dataAutorizacao?.let { danfeDtf.format(it) },
                naturezaOperacao     = "VENDA",
                ambiente             = nf.ambiente.name,
                tipoOperacao         = nf.tipoOperacao,
            ),
            emitente     = emitente,
            destinatario = destinatario,
            itens        = itens,
            totais       = totais,
        )
    }

    private fun toNf(row: ResultRow) = NfEmitida(
        id                    = row[NfEmitidaTable.id],
        vendaId               = row[NfEmitidaTable.vendaId],
        tipoOperacao          = row[NfEmitidaTable.tipoOperacao],
        modelo                = row[NfEmitidaTable.modelo],
        numero                = row[NfEmitidaTable.numero],
        serie                 = row[NfEmitidaTable.serie],
        chaveAcesso           = row[NfEmitidaTable.chaveAcesso],
        statusSefaz           = row[NfEmitidaTable.statusSefaz],
        ambiente              = row[NfEmitidaTable.ambiente],
        dataEmissao           = row[NfEmitidaTable.dataEmissao].toJava(),
        dataAutorizacao       = row[NfEmitidaTable.dataAutorizacao]?.toJava(),
        protocoloAutorizacao  = row[NfEmitidaTable.protocoloAutorizacao],
        xmlAutorizado         = row[NfEmitidaTable.xmlAutorizado],
        motivoRejeicao        = row[NfEmitidaTable.motivoRejeicao],
        chaveCorrelacao       = row[NfEmitidaTable.chaveCorrelacao],
        tentativasEnvio       = row[NfEmitidaTable.tentativasEnvio],
        justificativaCancel   = row[NfEmitidaTable.justificativaCancel],
        dataCancelamento      = row[NfEmitidaTable.dataCancelamento]?.toJava(),
        protocoloCancelamento = row[NfEmitidaTable.protocoloCancelamento],
        createdAt             = row[NfEmitidaTable.createdAt].toJava(),
    )
}

private fun Instant.toKotlin() = kotlinx.datetime.Instant.fromEpochMilliseconds(toEpochMilli())
private fun kotlinx.datetime.Instant.toJava() = Instant.ofEpochMilli(toEpochMilliseconds())
