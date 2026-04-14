package br.com.madeireira.modules.fiscal.sped

import br.com.madeireira.infrastructure.database.DatabaseConfig.dbQuery
import br.com.madeireira.modules.cliente.infrastructure.ClienteTable
import br.com.madeireira.modules.estoque.infrastructure.EstoqueSaldoTable
import br.com.madeireira.modules.fiscal.domain.model.StatusNf
import br.com.madeireira.modules.fiscal.infrastructure.NfEmitidaTable
import br.com.madeireira.modules.produto.infrastructure.ProdutoTable
import br.com.madeireira.modules.produto.infrastructure.UnidadeMedidaTable
import br.com.madeireira.modules.venda.infrastructure.VendaTable
import org.jetbrains.exposed.sql.*
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

// ── Tabelas locais (definidas aqui para não poluir outros módulos) ─────────────

private object NfItemT : Table("nf_item") {
    val id                     = uuid("id")
    val nfId                   = uuid("nf_id")
    val numeroItem             = integer("numero_item")
    val codigoProduto          = varchar("codigo_produto", 30)
    val descricao              = varchar("descricao", 120)
    val ncm                    = varchar("ncm", 8)
    val cfop                   = varchar("cfop", 5)
    val unidadeComercial       = varchar("unidade_comercial", 6)
    val quantidadeComercial    = decimal("quantidade_comercial", 14, 4)
    val valorUnitarioComercial = decimal("valor_unitario_comercial", 14, 4)
    val valorTotal             = decimal("valor_total", 14, 2)
    override val primaryKey = PrimaryKey(id)
}

private object NfItemSnapT : Table("nf_item_snapshot_tributario") {
    val nfItemId   = uuid("nf_item_id")
    val cfop       = varchar("cfop", 5)
    val cstIcms    = varchar("cst_icms", 3).nullable()
    val csosn      = varchar("csosn", 3).nullable()
    val aliqIcms   = decimal("aliq_icms", 5, 2)
    val cstPis     = varchar("cst_pis", 2)
    val aliqPis    = decimal("aliq_pis", 5, 4)
    val cstCofins  = varchar("cst_cofins", 2)
    val aliqCofins = decimal("aliq_cofins", 5, 4)
    override val primaryKey = PrimaryKey(uuid("id"))
}

private object EmpresaT : Table("empresa") {
    val cnpj                = varchar("cnpj", 18)
    val razaoSocial         = varchar("razao_social", 150)
    val ie                  = varchar("ie", 20).nullable()
    val uf                  = char("uf", 2)
    val logradouro          = varchar("logradouro", 150)
    val numero              = varchar("numero", 10)
    val bairro              = varchar("bairro", 80)
    val cidade              = varchar("cidade", 80)
    val cep                 = char("cep", 9)
    val regimeTributario    = varchar("regime_tributario", 30)
    val codigoMunicipioIbge = varchar("codigo_municipio_ibge", 7).nullable()
    override val primaryKey = PrimaryKey(uuid("id"))
}

private object ClienteEndT : Table("cliente_endereco") {
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

// ─────────────────────────────────────────────────────────────────────────────

private fun Instant.toKotlin() = kotlinx.datetime.Instant.fromEpochMilliseconds(toEpochMilli())
private fun kotlinx.datetime.Instant.toJava(): Instant = Instant.ofEpochMilli(toEpochMilliseconds())

class SpedEfdService {

    private val dtfSped = DateTimeFormatter.ofPattern("ddMMyyyy")
    private val brt     = ZoneOffset.ofHours(-3)
    private val ZERO    = BigDecimal.ZERO
    private val BRASIL  = "1058"

    private fun fmt2(v: BigDecimal) = v.setScale(2, RoundingMode.HALF_UP).toPlainString()
    private fun fmt4(v: BigDecimal) = v.setScale(4, RoundingMode.HALF_UP).toPlainString()
    private fun fmtDt(d: LocalDate) = d.format(dtfSped)
    private fun digitos(s: String)  = s.filter { it.isDigit() }

    suspend fun gerarEfd(ano: Int, mes: Int): String = dbQuery {

        val dtIni  = LocalDate.of(ano, mes, 1)
        val dtFin  = dtIni.withDayOfMonth(dtIni.lengthOfMonth())
        val inicio = dtIni.atStartOfDay(brt).toInstant().toKotlin()
        val fim    = dtFin.plusDays(1).atStartOfDay(brt).toInstant().toKotlin()

        val sb      = StringBuilder()
        val contReg = mutableMapOf<String, Int>()  // contagem por tipo de registro
        var totalLin = 0

        // Adiciona uma linha no arquivo e contabiliza
        fun reg(vararg campos: String) {
            sb.append("|").append(campos.joinToString("|")).append("|\r\n")
            contReg[campos[0]] = (contReg[campos[0]] ?: 0) + 1
            totalLin++
        }

        // ── Empresa ──────────────────────────────────────────────────────────
        val emp = EmpresaT.selectAll().firstOrNull()
            ?: throw IllegalStateException("Empresa não configurada. Acesse Configurações → Empresa.")

        val cnpj   = digitos(emp[EmpresaT.cnpj])
        val ie     = emp[EmpresaT.ie]?.filter { it.isLetterOrDigit() } ?: ""
        val uf     = emp[EmpresaT.uf]
        val codMun = emp[EmpresaT.codigoMunicipioIbge]?.filter { it.isDigit() } ?: ""

        // ── NF-e AUTORIZADAS e CANCELADAS do período ─────────────────────────
        val nfs = NfEmitidaTable.select {
            ((NfEmitidaTable.statusSefaz eq StatusNf.AUTORIZADA) or
             (NfEmitidaTable.statusSefaz eq StatusNf.CANCELADA)) and
            (NfEmitidaTable.tipoOperacao eq "SAIDA") and
            (NfEmitidaTable.dataEmissao greaterEq inicio) and
            (NfEmitidaTable.dataEmissao less fim)
        }.toList()

        val nfIds     = nfs.map { it[NfEmitidaTable.id] }
        val nfItens   = if (nfIds.isEmpty()) emptyList() else
            NfItemT.select { NfItemT.nfId inList nfIds }.toList()
        val nfItemIds = nfItens.map { it[NfItemT.id] }
        val snaps     = if (nfItemIds.isEmpty()) emptyList() else
            NfItemSnapT.select { NfItemSnapT.nfItemId inList nfItemIds }.toList()

        val snapByItem   = snaps.associateBy { it[NfItemSnapT.nfItemId] }
        val itensByNfId  = nfItens.groupBy { it[NfItemT.nfId] }

        // ── Clientes (participantes) ──────────────────────────────────────────
        val vendaIds  = nfs.mapNotNull { it[NfEmitidaTable.vendaId] }.toSet()
        val vendas    = if (vendaIds.isEmpty()) emptyList() else
            VendaTable.select { VendaTable.id inList vendaIds.toList() }.toList()
        val cliIds    = vendas.mapNotNull { it[VendaTable.clienteId] }.toSet()
        val clientes  = if (cliIds.isEmpty()) emptyList() else
            ClienteTable.select { ClienteTable.id inList cliIds.toList() }.toList()
        val cliEnd    = if (cliIds.isEmpty()) emptyMap() else
            ClienteEndT.select {
                (ClienteEndT.clienteId inList cliIds.toList()) and (ClienteEndT.principal eq true)
            }.associateBy { it[ClienteEndT.clienteId] }

        val vendaCliMap = vendas.associate { it[VendaTable.id] to it[VendaTable.clienteId] }
        val nfCliMap    = nfs.associate { nf ->
            nf[NfEmitidaTable.id] to nf[NfEmitidaTable.vendaId]?.let { vendaCliMap[it] }
        }

        // ── Produtos e unidades ───────────────────────────────────────────────
        val codsProd = nfItens.map { it[NfItemT.codigoProduto] }.toSet()
        val produtos = if (codsProd.isEmpty()) emptyList() else
            ProdutoTable.select { ProdutoTable.codigo inList codsProd.toList() }.toList()
        val unidIds  = produtos.map { it[ProdutoTable.unidadeMedidaId] }.toSet()
        val unidades = if (unidIds.isEmpty()) emptyList() else
            UnidadeMedidaTable.select { UnidadeMedidaTable.id inList unidIds.toList() }.toList()
        val unidPorId   = unidades.associate { it[UnidadeMedidaTable.id] to it[UnidadeMedidaTable.codigo] }
        val prodPorCod  = produtos.associateBy { it[ProdutoTable.codigo] }

        // ── Estoque atual (Bloco H) ───────────────────────────────────────────
        val estoqueRows = EstoqueSaldoTable
            .join(ProdutoTable, JoinType.INNER, EstoqueSaldoTable.produtoId, ProdutoTable.id)
            .select { ProdutoTable.ativo eq true }
            .toList()

        // ═══════════════════════════════════════════════════════════════════════
        // BLOCO 0 — Abertura, identificação, tabelas
        // ═══════════════════════════════════════════════════════════════════════

        // 0000 — Abertura do arquivo
        reg("0000",
            "013",               // COD_VER: versão do leiaute
            "0",                 // TIPO_ESCR: 0=original
            fmtDt(dtIni),        // DT_INI
            fmtDt(dtFin),        // DT_FIN
            emp[EmpresaT.razaoSocial].take(100), // NOME
            cnpj,                // CNPJ
            "",                  // CPF (PJ → em branco)
            uf,                  // UF
            ie,                  // IE
            codMun,              // COD_MUN
            "",                  // IM (inscrição municipal)
            "",                  // SUFRAMA
            "A",                 // IND_PERFIL: A=mais completo
            "0"                  // IND_ATIV: 0=industrial/outros
        )

        // 0001 — Abertura bloco 0 (IND_MOV=0 = bloco com dados)
        reg("0001", "0")

        // 0005 — Dados complementares
        reg("0005",
            "",  // NTF (nº do formulário de autenticação)
            "",  // TEL
            emp[EmpresaT.razaoSocial].take(60), // CONTATO
            ""   // EMAIL
        )

        // 0150 — Tabela de participantes (clientes das NF-e do período)
        val participSet = mutableSetOf<java.util.UUID>()
        clientes.forEach { cli ->
            val cliId = cli[ClienteTable.id]
            if (participSet.add(cliId)) {
                val end          = cliEnd[cliId]
                val cnpjCpfRaw   = cli[ClienteTable.cnpjCpf]?.let { digitos(it) } ?: ""
                val isCnpj       = cnpjCpfRaw.length == 14
                reg("0150",
                    cliId.toString().replace("-", "").take(60), // COD_PART
                    cli[ClienteTable.razaoSocial].take(100),    // NOME
                    BRASIL,                                      // COD_PAIS
                    if (isCnpj) cnpjCpfRaw else "",             // CNPJ
                    if (!isCnpj && cnpjCpfRaw.isNotEmpty()) cnpjCpfRaw else "", // CPF
                    "",                                          // IE
                    codMun,                                      // COD_MUN
                    "",                                          // SUFRAMA
                    end?.get(ClienteEndT.logradouro) ?: "",      // END
                    end?.get(ClienteEndT.numero) ?: "",          // NUM
                    "",                                          // COMPL
                    end?.get(ClienteEndT.bairro) ?: ""           // BAIRRO
                )
            }
        }

        // 0190 — Unidades de medida
        val unidsUsadas = (nfItens.map { it[NfItemT.unidadeComercial] } +
            produtos.mapNotNull { unidPorId[it[ProdutoTable.unidadeMedidaId]] }
        ).toSet().ifEmpty { setOf("UN") }

        unidsUsadas.forEach { unid ->
            reg("0190", unid, unid)
        }

        // 0200 — Produtos usados nas NF-e do período
        val itensReg = mutableSetOf<String>()
        nfItens.forEach { item ->
            val cod = item[NfItemT.codigoProduto]
            if (itensReg.add(cod)) {
                val prod  = prodPorCod[cod]
                val unid  = prod?.let { unidPorId[it[ProdutoTable.unidadeMedidaId]] }
                    ?: item[NfItemT.unidadeComercial]
                val ncm   = item[NfItemT.ncm].padStart(8, '0')
                reg("0200",
                    cod,                               // COD_ITEM
                    item[NfItemT.descricao].take(60),  // DESCR_ITEM
                    "",                                // COD_BARRA
                    "",                                // COD_ANT_ITEM
                    unid,                              // UNID_INV
                    "04",                              // TIPO_ITEM: 04=mercadoria p/ revenda
                    ncm,                               // COD_NCM
                    "",                                // EX_IPI
                    "",                                // COD_GEN
                    "",                                // COD_LST
                    "0.00"                             // ALIQ_ICMS
                )
            }
        }

        // 0990 — Encerramento bloco 0 (+1 = conta ele mesmo)
        val linBloco0 = totalLin + 1
        reg("0990", linBloco0.toString())

        // ═══════════════════════════════════════════════════════════════════════
        // BLOCO C — Documentos Fiscais I (Mercadorias/NF-e)
        // ═══════════════════════════════════════════════════════════════════════

        val linInicioC = totalLin
        reg("C001", if (nfs.isEmpty()) "1" else "0")

        nfs.forEach { nf ->
            val nfId   = nf[NfEmitidaTable.id]
            val dtEmis = nf[NfEmitidaTable.dataEmissao].toJava().atOffset(brt).toLocalDate()
            val numero = nf[NfEmitidaTable.numero].toString().padStart(9, '0')
            val serie  = nf[NfEmitidaTable.serie]
            val chave  = nf[NfEmitidaTable.chaveAcesso] ?: ""
            val codSit = when (nf[NfEmitidaTable.statusSefaz]) {
                StatusNf.CANCELADA -> "02"
                else               -> "00"
            }

            val itensNf = itensByNfId[nfId] ?: emptyList()
            val vlDoc   = itensNf.fold(ZERO) { acc, i -> acc + i[NfItemT.valorTotal] }
            val codPart = nfCliMap[nfId]?.let { id ->
                id.toString().replace("-", "").take(60)
            } ?: ""

            reg("C100",
                "1",           // IND_OPER: 1=saída
                "0",           // IND_EMIT: 0=emissão própria
                codPart,       // COD_PART
                "55",          // COD_MOD: NF-e modelo 55
                codSit,        // COD_SIT
                serie,         // SER
                numero,        // NUM_DOC
                chave,         // CHV_NFE
                fmtDt(dtEmis), // DT_DOC
                fmtDt(dtEmis), // DT_E_S
                fmt2(vlDoc),   // VL_DOC
                "0",           // IND_PGTO: 0=à vista
                "0.00",        // VL_DESC
                "0.00",        // VL_ABAT_NT
                fmt2(vlDoc),   // VL_MERC
                "0",           // IND_FRT: 0=sem frete
                "0.00",        // VL_FRT
                "0.00",        // VL_SEG
                "0.00",        // VL_OUT_DA
                "0.00",        // VL_BC_ICMS
                "0.00",        // VL_ICMS
                "0.00",        // VL_BC_ICMS_ST
                "0.00",        // VL_ICMS_ST
                "0.00",        // VL_IPI
                "0.00",        // VL_PIS
                "0.00",        // VL_COFINS
                "0.00",        // VL_PIS_ST
                "0.00"         // VL_COFINS_ST
            )

            // C170 — Itens da NF-e
            itensNf.forEachIndexed { idx, item ->
                val snap  = snapByItem[item[NfItemT.id]]
                val cfop  = snap?.get(NfItemSnapT.cfop) ?: item[NfItemT.cfop]
                val csosn = snap?.get(NfItemSnapT.csosn) ?: "400"   // 400 = não tributada SN
                val cstPis  = snap?.get(NfItemSnapT.cstPis) ?: "07" // 07 = não tributado PIS
                val cstCof  = snap?.get(NfItemSnapT.cstCofins) ?: "07"
                val aliqIcms = snap?.get(NfItemSnapT.aliqIcms) ?: ZERO

                reg("C170",
                    (idx + 1).toString(),                // NUM_ITEM
                    item[NfItemT.codigoProduto],          // COD_ITEM
                    item[NfItemT.descricao].take(60),     // DESCR_COMPL
                    fmt4(item[NfItemT.quantidadeComercial]), // QTD
                    item[NfItemT.unidadeComercial],        // UNID
                    fmt2(item[NfItemT.valorTotal]),        // VL_ITEM
                    "0.00",   // VL_DESC
                    "0",      // IND_MOV: 0=com movimentação física
                    csosn,    // CST_ICMS (CSOSN p/ Simples Nacional)
                    cfop,     // CFOP
                    "",       // COD_NAT
                    "0.00",   // VL_BC_ICMS
                    fmt2(aliqIcms), // ALIQ_ICMS
                    "0.00",   // VL_ICMS
                    "0.00",   // VL_BC_ICMS_ST
                    "0.00",   // ALIQ_ST
                    "0.00",   // VL_ICMS_ST
                    "",       // IND_APUR
                    "99",     // CST_IPI: 99=outras saídas
                    "",       // COD_ENQ
                    "0.00",   // VL_BC_IPI
                    "0.00",   // ALIQ_IPI
                    "0.00",   // VL_IPI
                    cstPis,   // CST_PIS
                    "0.00",   // VL_BC_PIS
                    "0.00",   // ALIQ_PIS_PCT
                    "0",      // QUANT_BC_PIS
                    "0.00",   // ALIQ_PIS_R
                    "0.00",   // VL_PIS
                    cstCof,   // CST_COFINS
                    "0.00",   // VL_BC_COFINS
                    "0.00",   // ALIQ_COFINS_PCT
                    "0",      // QUANT_BC_COFINS
                    "0.00",   // ALIQ_COFINS_R
                    "0.00",   // VL_COFINS
                    ""        // COD_CTA
                )
            }

            // C190 — Analítico do ICMS por CST/CFOP/alíquota
            data class ChaveCfop(val cst: String, val cfop: String, val aliq: BigDecimal)

            val agrupados = itensNf
                .groupBy { item ->
                    val snap = snapByItem[item[NfItemT.id]]
                    ChaveCfop(
                        cst  = snap?.get(NfItemSnapT.csosn) ?: "400",
                        cfop = snap?.get(NfItemSnapT.cfop) ?: item[NfItemT.cfop],
                        aliq = snap?.get(NfItemSnapT.aliqIcms) ?: ZERO,
                    )
                }

            agrupados.forEach { (chave, grupo) ->
                val vlOpr = grupo.fold(ZERO) { acc, i -> acc + i[NfItemT.valorTotal] }
                reg("C190",
                    chave.cst,        // CST_ICMS
                    chave.cfop,       // CFOP
                    fmt2(chave.aliq), // ALIQ_ICMS
                    fmt2(vlOpr),      // VL_OPR
                    "0.00",           // VL_BC_ICMS
                    "0.00",           // VL_ICMS
                    "0.00",           // VL_BC_ICMS_ST
                    "0.00",           // VL_ICMS_ST
                    "0.00",           // VL_RED_BC
                    ""                // COD_OBS
                )
            }
        }

        val linBlocoC = totalLin - linInicioC + 1
        reg("C990", linBlocoC.toString())

        // ═══════════════════════════════════════════════════════════════════════
        // BLOCO H — Inventário Físico (saldo no último dia do período)
        // ═══════════════════════════════════════════════════════════════════════

        val linInicioH = totalLin
        reg("H001", if (estoqueRows.isEmpty()) "1" else "0")

        if (estoqueRows.isNotEmpty()) {
            val vlTotalInv = estoqueRows.fold(ZERO) { acc, row ->
                val qtd   = row[EstoqueSaldoTable.saldoM3Total]
                    .takeIf { it > ZERO } ?: row[EstoqueSaldoTable.saldoUnidadeTotal]
                val custo = row[EstoqueSaldoTable.custoMedioM3] ?: ZERO
                acc + (qtd * custo)
            }

            reg("H005",
                fmtDt(dtFin),      // DT_INV: data do inventário (último dia do período)
                fmt2(vlTotalInv),   // VL_INV
                "01"                // MOT_INV: 01=fim de período
            )

            estoqueRows.forEach { row ->
                val codItem = row[ProdutoTable.codigo]
                val unid    = unidPorId[row[ProdutoTable.unidadeMedidaId]] ?: "UN"
                // Madeira → m³; outros → unidade
                val qtd     = row[EstoqueSaldoTable.saldoM3Total]
                    .takeIf { it > ZERO } ?: row[EstoqueSaldoTable.saldoUnidadeTotal]
                val custo   = row[EstoqueSaldoTable.custoMedioM3] ?: ZERO
                val vlItem  = qtd * custo

                reg("H010",
                    codItem,        // COD_ITEM
                    unid,           // UNID
                    fmt4(qtd),      // QTD
                    fmt2(custo),    // VL_UNIT
                    fmt2(vlItem),   // VL_ITEM
                    "0",            // IND_PROP: 0=próprio
                    "",             // COD_PART
                    "",             // TXT_COMPL
                    "",             // COD_CTA
                    "0.00"          // VL_ITEM_IR (apenas para imobilizado)
                )
            }
        }

        val linBlocoH = totalLin - linInicioH + 1
        reg("H990", linBlocoH.toString())

        // ═══════════════════════════════════════════════════════════════════════
        // BLOCO 9 — Controle e encerramento do arquivo
        // ═══════════════════════════════════════════════════════════════════════

        val linInicio9 = totalLin
        reg("9001", "0")

        // 9900 — Contagem por tipo de registro (incluindo os que ainda vamos escrever)
        // Registramos uma linha 9900 por tipo, mais 9900/9990/9999 abaixo
        val tiposUsados = contReg.keys.sorted()
        tiposUsados.forEach { tipo ->
            reg("9900", tipo, contReg[tipo].toString())
        }
        // Contagens dos registros do próprio bloco 9 (estimativas finais)
        val total9900 = tiposUsados.size + 1   // +1 para o próprio 9900 que engloba tudo
        reg("9900", "9900", total9900.toString())

        val linBloco9 = totalLin - linInicio9 + 2  // +2: 9990 + 9999
        reg("9990", linBloco9.toString())
        reg("9999", (totalLin + 1).toString())

        sb.toString()
    }
}
