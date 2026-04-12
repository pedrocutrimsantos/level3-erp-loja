package br.com.madeireira.modules.fiscal.application

import io.github.oshai.kotlinlogging.KotlinLogging
import java.io.File
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private val log = KotlinLogging.logger {}

/**
 * Porta de arquivamento de XMLs de NF-e.
 *
 * Contrato:
 *  - [arquivar] persiste o XML **antes** do commit no banco. Se o banco falhar,
 *    o XML ainda existe no storage e pode ser recuperado manualmente ou por job.
 *  - [recuperar] retorna o XML a partir da chave de acesso, ou null se não encontrado.
 *
 * Implementação default: filesystem local ([XmlNfeArquivadorLocal]).
 * Para S3, implemente [XmlNfeArquivador] e injete via Application.kt.
 */
interface XmlNfeArquivador {
    fun arquivar(chaveAcesso: String, xml: String)
    fun recuperar(chaveAcesso: String): String?
}

/**
 * Arquiva XMLs em diretório local.
 *
 * Configuração via variável de ambiente:
 *   NFE_XML_DIR — diretório raiz (padrão: /var/data/nfe/xml)
 *
 * Estrutura de diretórios:
 *   {NFE_XML_DIR}/YYYY-MM/{chave_acesso}.xml
 *
 * A estrutura mensal limita o número de arquivos por diretório e facilita
 * backup incremental (basta copiar meses completos).
 *
 * Legislação: XMLs de NF-e devem ser mantidos por 5 anos (art. 97, CGSN 140/2018).
 */
class XmlNfeArquivadorLocal(
    baseDir: String = System.getenv("NFE_XML_DIR") ?: "/var/data/nfe/xml",
) : XmlNfeArquivador {

    private val root = File(baseDir)

    init {
        if (!root.exists()) {
            root.mkdirs()
            log.info { "[NF-e] Diretório de XMLs criado: ${root.absolutePath}" }
        }
        log.info { "[NF-e] XmlNfeArquivadorLocal configurado em: ${root.absolutePath}" }
    }

    override fun arquivar(chaveAcesso: String, xml: String) {
        require(chaveAcesso.length == 44) { "Chave de acesso inválida: $chaveAcesso" }

        val dir = subDir()
        if (!dir.exists()) dir.mkdirs()

        val file = File(dir, "$chaveAcesso.xml")
        try {
            // Escrita atômica: escreve em arquivo temporário e renomeia.
            // Evita arquivo parcialmente escrito em caso de falha de disco.
            val tmp = File(dir, "$chaveAcesso.xml.tmp")
            tmp.writeText(xml, Charsets.UTF_8)
            tmp.renameTo(file)
            log.info { "[NF-e] XML arquivado: ${file.absolutePath}" }
        } catch (e: Exception) {
            log.error { "[NF-e] FALHA ao arquivar XML da chave $chaveAcesso: ${e.message}" }
            // Não relança — o banco é a fonte primária. O log permite recuperação manual.
        }
    }

    override fun recuperar(chaveAcesso: String): String? {
        // Busca no mês atual e nos 12 anteriores (cobre XMLs de até 1 ano atrás)
        return (0L..12L)
            .map { meses -> LocalDate.now().minusMonths(meses) }
            .map { date -> File(subDir(date), "$chaveAcesso.xml") }
            .firstOrNull { it.exists() }
            ?.readText(Charsets.UTF_8)
            .also { if (it == null) log.warn { "[NF-e] XML não encontrado no storage: $chaveAcesso" } }
    }

    private fun subDir(date: LocalDate = LocalDate.now()): File =
        File(root, date.format(DateTimeFormatter.ofPattern("yyyy-MM")))
}
