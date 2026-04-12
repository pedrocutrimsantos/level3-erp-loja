package br.com.madeireira.modules.fiscal.application

import io.github.oshai.kotlinlogging.KotlinLogging
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress

private val log = KotlinLogging.logger {}

/**
 * Valida o relógio do servidor contra um pool NTP antes de cada emissão de NF-e.
 *
 * Problema mitigado (Risco 2):
 *   A SEFAZ rejeita NF-e com horário desviado em mais de 5 minutos (código 205).
 *   Um servidor sem NTP ou com chrony parado pode acumular desvio silenciosamente.
 *
 * Comportamento:
 *   - Se o desvio for > NFE_NTP_TOLERANCIA_S (padrão 120 s): lança exceção — bloqueia emissão.
 *   - Se o desvio for > 60 s:                                  loga WARNING.
 *   - Se o servidor NTP não responder em 3 s:                  loga WARNING, não bloqueia.
 *     (Servidores sem internet não devem ser impedidos de emitir por falha NTP.)
 *
 * Configuração via variável de ambiente:
 *   NFE_NTP_HOST         — servidor NTP (padrão: pool.ntp.org)
 *   NFE_NTP_TOLERANCIA_S — tolerância em segundos (padrão: 120)
 */
object RelogioNfeValidator {

    private const val NTP_PORT     = 123
    private const val TIMEOUT_MS   = 3_000
    private const val NTP_DELTA    = 2_208_988_800L // segundos entre 1900-01-01 e 1970-01-01

    private val ntpHost: String
        get() = System.getenv("NFE_NTP_HOST") ?: "pool.ntp.org"

    private val toleranciaSegundos: Long
        get() = System.getenv("NFE_NTP_TOLERANCIA_S")?.toLongOrNull() ?: 120L

    /**
     * Verifica sincronização do relógio.
     * @throws IllegalStateException se o desvio exceder a tolerância configurada.
     */
    fun validar() {
        val desvio = medirDesvioSegundos()

        if (desvio == null) {
            log.warn { "[NF-e] Servidor NTP '$ntpHost' inacessível — prosseguindo sem validação de relógio" }
            return
        }

        val desvioAbs = kotlin.math.abs(desvio)
        when {
            desvioAbs > toleranciaSegundos -> error(
                "[NF-e] Relógio do servidor desviado em $desvioAbs segundos do NTP '$ntpHost'. " +
                "A SEFAZ rejeita NF-e com desvio > 5 minutos. " +
                "Sincronize o relógio (chrony/ntpdate) ou ajuste NFE_NTP_TOLERANCIA_S."
            )
            desvioAbs > 60 ->
                log.warn { "[NF-e] Relógio desviado ${desvioAbs}s do NTP — verifique sincronização (chrony status)" }
            else ->
                log.debug { "[NF-e] Relógio OK — desvio NTP: ${desvio}s" }
        }
    }

    /**
     * Retorna o desvio em segundos (positivo = relógio adiantado, negativo = atrasado).
     * Retorna null se o servidor NTP não responder dentro do timeout.
     */
    private fun medirDesvioSegundos(): Long? = runCatching {
        val buffer = ByteArray(48).also { it[0] = 0x1B.toByte() } // NTP v3, modo cliente
        val address = InetAddress.getByName(ntpHost)
        val localBefore = System.currentTimeMillis()

        DatagramSocket().use { socket ->
            socket.soTimeout = TIMEOUT_MS
            socket.send(DatagramPacket(buffer, buffer.size, address, NTP_PORT))
            socket.receive(DatagramPacket(buffer, buffer.size))
        }

        val localAfter = System.currentTimeMillis()
        val rttSegundos = (localAfter - localBefore) / 2_000L

        // Bytes 40–43: transmit timestamp (segundos desde 1900-01-01)
        val ntpSecs = ((buffer[40].toLong() and 0xFF) shl 24) or
                      ((buffer[41].toLong() and 0xFF) shl 16) or
                      ((buffer[42].toLong() and 0xFF) shl 8)  or
                       (buffer[43].toLong() and 0xFF)

        val ntpEpoch   = ntpSecs - NTP_DELTA + rttSegundos
        val localEpoch = System.currentTimeMillis() / 1_000L
        localEpoch - ntpEpoch
    }.getOrElse { e ->
        log.debug { "[NF-e] NTP check falhou (${e::class.simpleName}): ${e.message}" }
        null
    }
}
