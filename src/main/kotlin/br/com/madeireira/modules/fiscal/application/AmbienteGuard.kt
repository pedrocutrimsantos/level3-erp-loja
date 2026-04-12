package br.com.madeireira.modules.fiscal.application

import io.github.oshai.kotlinlogging.KotlinLogging

private val log = KotlinLogging.logger {}

/**
 * Valida a configuração de ambiente fiscal no startup da aplicação.
 *
 * Problema mitigado (Risco 12):
 *   Iniciar a aplicação com NFE_AMBIENTE=producao acidentalmente emite NF-e reais.
 *   Uma NF-e emitida é praticamente irrevogável — prazo de cancelamento é 24 h.
 *
 * Regras aplicadas:
 *   1. NFE_AMBIENTE só aceita "homologacao" ou "producao".
 *   2. NFE_AMBIENTE=producao exige confirmação explícita via NFE_PRODUCAO_CONFIRMADO=true.
 *   3. Em produção, loga banner de aviso bem visível nos logs.
 *   4. Em homologação, loga aviso para nunca confundir com produção.
 *
 * Nota: o ambiente definitivo é configurado na tabela empresa (campo ambiente_nfe),
 * não via variável de ambiente. Esta validação serve como trava de segurança no startup.
 *
 * Uso: chamar AmbienteGuard.validar() dentro de Application.module() antes de registrar rotas.
 */
object AmbienteGuard {

    private val AMBIENTES_VALIDOS = setOf("homologacao", "producao")

    fun validar() {
        val ambiente = System.getenv("NFE_AMBIENTE") ?: "homologacao"

        require(ambiente in AMBIENTES_VALIDOS) {
            "NFE_AMBIENTE='$ambiente' é inválido. Valores aceitos: ${AMBIENTES_VALIDOS.joinToString(", ")}"
        }

        if (ambiente == "producao") {
            val confirmado = System.getenv("NFE_PRODUCAO_CONFIRMADO")
            require(confirmado == "true") {
                """
                ╔══════════════════════════════════════════════════════════════╗
                ║  BLOQUEIO DE SEGURANÇA — EMISSÃO NF-e EM PRODUÇÃO            ║
                ╠══════════════════════════════════════════════════════════════╣
                ║  NFE_AMBIENTE=producao detectado.                             ║
                ║  Para habilitar emissão real, defina TAMBÉM:                  ║
                ║     NFE_PRODUCAO_CONFIRMADO=true                              ║
                ║                                                               ║
                ║  Esta trava existe para evitar NF-e reais em ambiente de      ║
                ║  desenvolvimento ou staging. NF-e emitida não pode ser        ║
                ║  desfeita facilmente — cancelamento tem prazo de 24 horas.    ║
                ╚══════════════════════════════════════════════════════════════╝
                """.trimIndent()
            }

            log.warn { "╔══════════════════════════════════════════╗" }
            log.warn { "║   ATENÇÃO: EMISSÃO NF-e EM PRODUÇÃO      ║" }
            log.warn { "║   NF-e emitidas são documentos fiscais   ║" }
            log.warn { "║   com validade jurídica.                  ║" }
            log.warn { "╚══════════════════════════════════════════╝" }
        } else {
            log.info { "[NF-e] Startup: variável NFE_AMBIENTE=$ambiente" }
        }
    }
}
