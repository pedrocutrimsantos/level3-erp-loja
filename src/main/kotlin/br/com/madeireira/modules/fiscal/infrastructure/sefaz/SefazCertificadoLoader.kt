package br.com.madeireira.modules.fiscal.infrastructure.sefaz

import io.github.oshai.kotlinlogging.KotlinLogging
import java.io.ByteArrayInputStream
import java.io.File
import java.security.KeyStore
import java.security.cert.X509Certificate
import java.time.Duration
import java.time.Instant

private val log = KotlinLogging.logger {}

/**
 * Carrega e valida o certificado A1 (PKCS#12 / .pfx) para assinatura de NF-e.
 *
 * Fontes suportadas (prioridade decrescente):
 *   1. Banco de dados — bytes + senha salvos pelo usuário na tela de Empresa
 *   2. Variáveis de ambiente — NFE_CERT_PATH / NFE_CERT_SENHA (fallback de servidor)
 *
 * Retorna null se nenhuma das fontes estiver configurada.
 * Falha ruidosamente se a fonte estiver configurada mas o certificado for inválido.
 *
 * Loga WARNING se vencer em ≤ 60 dias (crítico em ≤ 30 dias).
 */
object SefazCertificadoLoader {

    private const val ENV_PATH  = "NFE_CERT_PATH"
    private const val ENV_SENHA = "NFE_CERT_SENHA"

    /**
     * Wrapper que mantém o KeyStore e a senha juntos — necessário para inicializar
     * KeyManagerFactory.init(keyStore, senha) no SefazSoapClient (mTLS).
     */
    data class SefazCertificado(
        val keyStore: KeyStore,
        val senha: CharArray,
        /** Common Name do titular — exibido na UI (ex: "EMPRESA LTDA:12345678000195"). */
        val titularNome: String,
        /** Data de vencimento do certificado (ISO-8601). */
        val vencimento: Instant,
    )

    // ── Carregamento a partir do banco (fonte primária) ───────────────────────

    /**
     * Carrega certificado a partir dos bytes do .pfx armazenados no banco.
     * Chamado por [NfeService] com os dados lidos de [EmpresaData].
     *
     * @param bytes  conteúdo bruto do arquivo .pfx
     * @param senha  senha do .pfx em texto plano
     * @throws IllegalStateException se os bytes ou a senha estiverem errados
     */
    fun carregarDeBytes(bytes: ByteArray, senha: String): SefazCertificado {
        val ks = KeyStore.getInstance("PKCS12")
        try {
            ByteArrayInputStream(bytes).use { ks.load(it, senha.toCharArray()) }
        } catch (e: Exception) {
            error("Falha ao abrir certificado: ${e.message} — verifique se a senha está correta.")
        }
        return validarEEmpacotar(ks, senha.toCharArray(), "banco de dados")
    }

    // ── Carregamento a partir de env vars (fallback de servidor) ─────────────

    /**
     * Carrega o certificado a partir das variáveis de ambiente NFE_CERT_PATH / NFE_CERT_SENHA.
     * Retorna null se NFE_CERT_PATH não estiver definida.
     */
    fun carregarDeEnv(): SefazCertificado? {
        val path = System.getenv(ENV_PATH) ?: return null
        val senha = requireNotNull(System.getenv(ENV_SENHA)) {
            "$ENV_SENHA não definida. É obrigatória quando $ENV_PATH está configurada."
        }
        val file = File(path)
        require(file.exists() && file.isFile && file.canRead()) {
            "Certificado NF-e não encontrado ou sem permissão de leitura: $path"
        }
        val ks = KeyStore.getInstance("PKCS12")
        file.inputStream().use { stream ->
            try {
                ks.load(stream, senha.toCharArray())
            } catch (e: Exception) {
                error("Falha ao abrir certificado '$path': ${e.message} — verifique NFE_CERT_SENHA")
            }
        }
        return validarEEmpacotar(ks, senha.toCharArray(), path)
    }

    /**
     * Compat: mantido para o startup em Application.kt — usa a env var.
     * Retorna null em silêncio se a var não estiver configurada.
     */
    fun carregar(): KeyStore? = carregarDeEnv()?.keyStore

    /** Compat: retorna wrapper com senha exposta — usado pelo wiring legado. */
    fun carregarComSenha(): SefazCertificado? = carregarDeEnv()

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun validarEEmpacotar(ks: KeyStore, senha: CharArray, origem: String): SefazCertificado {
        val alias = ks.aliases().asSequence().firstOrNull()
            ?: error("Nenhum alias encontrado no certificado ($origem)")

        val cert = ks.getCertificate(alias) as? X509Certificate
            ?: error("Certificado em '$origem' não é X.509")

        val expiracao     = cert.notAfter.toInstant()
        val agora         = Instant.now()
        val diasRestantes = Duration.between(agora, expiracao).toDays()

        when {
            agora.isAfter(expiracao) ->
                error(
                    "Certificado A1 VENCIDO em ${cert.notAfter}. " +
                    "Renove o certificado antes de emitir NF-e."
                )
            diasRestantes <= 30 ->
                log.warn {
                    "CRÍTICO: Certificado A1 vence em $diasRestantes dias (${cert.notAfter}). " +
                    "Renove IMEDIATAMENTE para não interromper a emissão."
                }
            diasRestantes <= 60 ->
                log.warn { "Certificado A1 vence em $diasRestantes dias. Providencie renovação." }
            else ->
                log.info { "Certificado A1 válido: vence em $diasRestantes dias (${cert.notAfter})" }
        }

        val titularNome = cert.subjectX500Principal.name
            .split(",")
            .firstOrNull { it.trim().startsWith("CN=") }
            ?.removePrefix("CN=")
            ?.trim()
            ?: cert.subjectX500Principal.name

        return SefazCertificado(
            keyStore    = ks,
            senha       = senha,
            titularNome = titularNome,
            vencimento  = expiracao,
        )
    }
}
