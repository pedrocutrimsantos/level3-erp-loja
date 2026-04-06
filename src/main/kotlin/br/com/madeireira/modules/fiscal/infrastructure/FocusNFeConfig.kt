package br.com.madeireira.modules.fiscal.infrastructure

/**
 * Configuração do adapter Focus NF-e.
 * Todos os valores são lidos de variáveis de ambiente.
 *
 * Variáveis obrigatórias:
 *   FOCUS_NFE_TOKEN  — token da API Focus
 *   FOCUS_NFE_CNPJ   — CNPJ do emitente (14 dígitos, sem formatação)
 *
 * Variáveis opcionais (com padrões seguros):
 *   FOCUS_NFE_AMBIENTE  — "homologacao" (padrão) | "producao"
 *   FOCUS_NFE_CFOP      — CFOP padrão para vendas (padrão: "5102")
 *   FOCUS_NFE_UF        — UF do emitente (padrão: "SP")
 */
data class FocusNFeConfig(
    val token: String,
    val cnpjEmitente: String,
    val ambiente: String = "homologacao",
    val cfopPadrao: String = "5102",
    val ufEmitente: String = "SP",
) {
    val baseUrl: String get() = when (ambiente) {
        "producao" -> "https://api.focusnfe.com.br/v2"
        else       -> "https://homologacao.focusnfe.com.br/v2"
    }

    companion object {
        /** Retorna config se FOCUS_NFE_TOKEN e FOCUS_NFE_CNPJ estiverem definidos, senão null. */
        fun fromEnv(): FocusNFeConfig? {
            val token = System.getenv("FOCUS_NFE_TOKEN") ?: return null
            val cnpj  = System.getenv("FOCUS_NFE_CNPJ")  ?: return null
            return FocusNFeConfig(
                token         = token,
                cnpjEmitente  = cnpj,
                ambiente      = System.getenv("FOCUS_NFE_AMBIENTE") ?: "homologacao",
                cfopPadrao    = System.getenv("FOCUS_NFE_CFOP")     ?: "5102",
                ufEmitente    = System.getenv("FOCUS_NFE_UF")       ?: "SP",
            )
        }
    }
}
