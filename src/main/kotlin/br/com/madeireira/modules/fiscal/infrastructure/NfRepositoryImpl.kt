package br.com.madeireira.modules.fiscal.infrastructure

import br.com.madeireira.infrastructure.database.DatabaseConfig.dbQuery
import br.com.madeireira.modules.fiscal.domain.model.NfEmitida
import br.com.madeireira.modules.fiscal.domain.model.StatusNf
import org.jetbrains.exposed.sql.*
import java.time.Instant
import java.util.UUID

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
