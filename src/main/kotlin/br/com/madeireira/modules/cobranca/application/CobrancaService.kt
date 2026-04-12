package br.com.madeireira.modules.cobranca.application

import br.com.madeireira.infrastructure.sms.RedbotWhatsAppService
import br.com.madeireira.modules.cobranca.domain.CobrancaLog
import br.com.madeireira.modules.cobranca.domain.ParcelaPendente
import br.com.madeireira.modules.cobranca.domain.ResultadoDisparo
import br.com.madeireira.modules.cobranca.infrastructure.CobrancaRepository
import io.github.oshai.kotlinlogging.KotlinLogging
import java.time.Instant
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.UUID

private val log = KotlinLogging.logger {}

private val FMT_DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy")
private val FMT_VALOR = java.text.NumberFormat.getCurrencyInstance(java.util.Locale("pt", "BR"))

class CobrancaService(
    private val repo: CobrancaRepository,
    private val whatsApp: RedbotWhatsAppService,
) {

    /** Dispara cobranças para todas as parcelas do dia (chamado pelo scheduler). */
    suspend fun dispararLote(hoje: LocalDate = LocalDate.now()): ResultadoDisparo {
        val parcelas = repo.findParcelasParaCobranca(hoje)
        log.info { "Cobrança diária: ${parcelas.size} parcelas elegíveis para $hoje" }

        var enviados = 0; var semFone = 0; var erros = 0
        val detalhes = mutableListOf<String>()

        for (p in parcelas) {
            val reguaDia = p.diasAtraso

            if (p.telefone.isNullOrBlank()) {
                semFone++
                detalhes.add("${p.tituloNumero} — sem telefone")
                continue
            }

            if (repo.jaEnviouHoje(p.parcelaId, reguaDia)) {
                detalhes.add("${p.tituloNumero} — já enviado hoje (reguaDia=$reguaDia)")
                continue
            }

            val mensagem = formatarMensagem(p, reguaDia)
            val (status, erroDetalhe) = try {
                whatsApp.enviar(p.telefone, mensagem)
                enviados++
                "ENVIADO" to null
            } catch (ex: Exception) {
                erros++
                log.warn(ex) { "Erro ao enviar cobrança para parcela ${p.parcelaId}" }
                detalhes.add("${p.tituloNumero} — erro: ${ex.message}")
                "ERRO" to ex.message
            }

            repo.salvarLog(
                CobrancaLog(
                    id          = UUID.randomUUID(),
                    parcelaId   = p.parcelaId,
                    tituloId    = p.tituloId,
                    clienteId   = p.clienteId,
                    telefone    = p.telefone,
                    mensagem    = mensagem,
                    reguaDia    = reguaDia,
                    status      = status,
                    erroDetalhe = erroDetalhe,
                    enviadoEm   = Instant.now(),
                )
            )
        }

        log.info { "Cobrança diária concluída: enviados=$enviados semFone=$semFone erros=$erros" }
        return ResultadoDisparo(enviados, semFone, erros, detalhes)
    }

    /** Dispara cobrança manual para uma única parcela (independente da régua). */
    suspend fun dispararUnica(parcelaId: UUID, hoje: LocalDate = LocalDate.now()): ResultadoDisparo {
        val parcelas = repo.findParcelasParaCobranca(hoje)
        val p = parcelas.find { it.parcelaId == parcelaId }
            ?: return ResultadoDisparo(0, 0, 1, listOf("Parcela $parcelaId não elegível ou não encontrada"))

        if (p.telefone.isNullOrBlank()) {
            return ResultadoDisparo(0, 1, 0, listOf("${p.tituloNumero} — sem telefone cadastrado"))
        }

        val reguaDia = p.diasAtraso
        val mensagem = formatarMensagem(p, reguaDia)

        return try {
            whatsApp.enviar(p.telefone, mensagem)
            repo.salvarLog(
                CobrancaLog(
                    id = UUID.randomUUID(), parcelaId = p.parcelaId, tituloId = p.tituloId,
                    clienteId = p.clienteId, telefone = p.telefone, mensagem = mensagem,
                    reguaDia = reguaDia, status = "ENVIADO", erroDetalhe = null,
                    enviadoEm = Instant.now(),
                )
            )
            ResultadoDisparo(1, 0, 0, listOf("${p.tituloNumero} — enviado"))
        } catch (ex: Exception) {
            repo.salvarLog(
                CobrancaLog(
                    id = UUID.randomUUID(), parcelaId = p.parcelaId, tituloId = p.tituloId,
                    clienteId = p.clienteId, telefone = p.telefone, mensagem = mensagem,
                    reguaDia = reguaDia, status = "ERRO", erroDetalhe = ex.message,
                    enviadoEm = Instant.now(),
                )
            )
            ResultadoDisparo(0, 0, 1, listOf("${p.tituloNumero} — erro: ${ex.message}"))
        }
    }

    suspend fun findPendentes(hoje: LocalDate = LocalDate.now()): List<ParcelaPendente> =
        repo.findParcelasParaCobranca(hoje)

    suspend fun findHistorico(limit: Int = 100) = repo.findHistorico(limit)

    suspend fun findHistoricoParcela(parcelaId: UUID) = repo.findHistoricoParcela(parcelaId)

    // ── Mensagens da régua ────────────────────────────────────────────────────

    private fun formatarMensagem(p: ParcelaPendente, reguaDia: Int): String {
        val nome  = p.clienteNome?.let { it.split(" ").first() } ?: "Cliente"
        val valor = FMT_VALOR.format(p.valor)
        val data  = p.dataVencimento.format(FMT_DATA)
        val titulo = p.tituloNumero

        return when {
            reguaDia == -1 ->
                "Olá, $nome! 😊 Lembramos que o título *$titulo* no valor de *$valor* vence *amanhã ($data)*. " +
                "Para evitar juros, efetue o pagamento até o prazo. Obrigado!"

            reguaDia == 0 ->
                "Olá, $nome! Seu título *$titulo* de *$valor* vence *hoje ($data)*. " +
                "Realize o pagamento hoje para evitar encargos. Obrigado!"

            reguaDia in 1..5 ->
                "Olá, $nome, tudo bem? Identificamos que o título *$titulo* de *$valor* " +
                "venceu há *$reguaDia dia(s)* ($data) e ainda consta em aberto. " +
                "Por favor, entre em contato para regularizar. Obrigado!"

            reguaDia in 6..14 ->
                "Olá, $nome. O título *$titulo* de *$valor* venceu em $data e está em aberto " +
                "há *$reguaDia dias*. Para evitar negativação, entre em contato urgente. Obrigado!"

            else ->
                "AVISO: $nome, o título *$titulo* de *$valor* com vencimento em $data " +
                "está em aberto há *$reguaDia dias*. Solicitamos a regularização imediata " +
                "para evitar medidas de cobrança. Entre em contato."
        }
    }
}
