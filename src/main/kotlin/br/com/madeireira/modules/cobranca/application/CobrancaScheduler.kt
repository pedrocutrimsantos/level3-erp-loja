package br.com.madeireira.modules.cobranca.application

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import io.github.oshai.kotlinlogging.KotlinLogging
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime

private val log = KotlinLogging.logger {}

/**
 * Dispara a régua de cobrança uma vez por dia às [horaDisparo] (padrão 08:00 BRT).
 * Executa em background numa coroutine supervisor — falhas não derrubam o servidor.
 */
class CobrancaScheduler(
    private val service: CobrancaService,
    private val horaDisparo: LocalTime = LocalTime.of(8, 0),
    private val zona: ZoneId = ZoneId.of("America/Sao_Paulo"),
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun iniciar() {
        scope.launch {
            log.info { "CobrancaScheduler iniciado — disparo diário às $horaDisparo $zona" }
            while (true) {
                val agora      = ZonedDateTime.now(zona)
                val proximoRun = agora.toLocalDate().atTime(horaDisparo).atZone(zona)
                    .let { if (it.isBefore(agora)) it.plusDays(1) else it }

                val msAte = proximoRun.toInstant().toEpochMilli() - agora.toInstant().toEpochMilli()
                log.info { "CobrancaScheduler aguardando ${msAte / 60_000} min até $proximoRun" }
                delay(msAte)

                try {
                    val hoje = LocalDate.now(zona)
                    log.info { "CobrancaScheduler disparando régua para $hoje" }
                    val resultado = service.dispararLote(hoje)
                    log.info {
                        "Régua concluída: enviados=${resultado.enviados} " +
                        "semFone=${resultado.semFone} erros=${resultado.erros}"
                    }
                } catch (ex: Exception) {
                    log.error(ex) { "Erro no disparo agendado da régua de cobrança" }
                }
            }
        }
    }
}
