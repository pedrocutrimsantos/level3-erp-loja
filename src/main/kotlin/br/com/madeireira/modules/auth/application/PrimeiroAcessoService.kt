package br.com.madeireira.modules.auth.application

import br.com.madeireira.infrastructure.sms.RedbotWhatsAppService
import br.com.madeireira.modules.auth.infrastructure.AuthRepository
import br.com.madeireira.modules.auth.infrastructure.PrimeiroAcessoRepository
import org.mindrot.jbcrypt.BCrypt
import org.slf4j.LoggerFactory
import java.security.MessageDigest
import java.security.SecureRandom
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

class PrimeiroAcessoService(
    private val repo: PrimeiroAcessoRepository,
    private val authRepo: AuthRepository,
    private val sms: RedbotWhatsAppService,
) {
    private val log = LoggerFactory.getLogger(PrimeiroAcessoService::class.java)
    private val devMode = System.getenv("KTOR_ENV") != "production"

    // ── Configurações de segurança ────────────────────────────────────────────

    private val EXPIRACAO_MINUTOS   = 10L
    private val MAX_TENTATIVAS      = 5
    private val MAX_REENVIOS        = 3
    private val COOLDOWN_SEGUNDOS   = 60L

    // ── Públicos ──────────────────────────────────────────────────────────────

    /**
     * Solicita o envio do token de primeiro acesso.
     * Resposta sempre genérica — não revela se o e-mail existe.
     */
    suspend fun solicitar(email: String, canal: String, tenantSlug: String) {
        val tenant = authRepo.findTenant(tenantSlug)
            ?: return  // tenant inexistente: falha silenciosa

        val usuario = repo.findByEmail(email.trim().lowercase(), tenant.schemaName)
            ?: return  // usuário inexistente: falha silenciosa

        if (!usuario.ativo || !usuario.primeiroAcessoPendente) return

        val tokenAtivo = repo.findTokenAtivo(usuario.id, tenant.schemaName)

        // Respeita cooldown se já existe token recente
        if (tokenAtivo != null) {
            val ultimoReenvio = tokenAtivo.ultimoReenvio
                ?: tokenAtivo.expiraEm.minus(EXPIRACAO_MINUTOS.minutes)
            val segundosDesde = (kotlinx.datetime.Clock.System.now() - ultimoReenvio).inWholeSeconds
            if (segundosDesde < COOLDOWN_SEGUNDOS) return  // ainda no cooldown

            if (tokenAtivo.reenvios >= MAX_REENVIOS) return  // limite de reenvios atingido

            // Invalida token anterior e registra o reenvio
            repo.registrarReenvio(tokenAtivo.id, tenant.schemaName)
        }

        val reenviosAnteriores = tokenAtivo?.reenvios?.plus(1) ?: 0

        val token     = gerarToken()
        val tokenHash = sha256(token)
        val expiraEm  = kotlinx.datetime.Clock.System.now()
            .plus((EXPIRACAO_MINUTOS * 60).seconds)

        repo.salvarToken(
            usuarioId           = usuario.id,
            tokenHash           = tokenHash,
            canal               = canal.uppercase(),
            expiraEm            = expiraEm,
            reenviosAnteriores  = reenviosAnteriores,
            schemaName          = tenant.schemaName,
        )

        val telefone = usuario.telefone
        if (!telefone.isNullOrBlank()) {
            runCatching {
                sms.enviar(telefone, "Madex\nSeu código de primeiro acesso é: *$token*\nVálido por $EXPIRACAO_MINUTOS minutos.")
            }.onFailure { e ->
                log.error("[PrimeiroAcesso] Falha ao enviar SMS para ${telefone.take(6)}*** — ${e.message}", e)
            }.onSuccess {
                log.info("[PrimeiroAcesso] SMS enviado para ${telefone.take(6)}***")
            }
        } else {
            log.warn("[PrimeiroAcesso] Usuário ${usuario.email} sem telefone — token gerado mas não enviado")
        }

        if (devMode) {
            log.info("[PrimeiroAcesso][DEV] token para ${usuario.email}: $token")
        }
    }

    /**
     * Valida o token informado pelo usuário.
     * Retorna verdadeiro se válido; em caso de falha lança IllegalArgumentException.
     */
    suspend fun validarToken(email: String, token: String, tenantSlug: String) {
        val tenant = authRepo.findTenant(tenantSlug)
            ?: throw IllegalArgumentException("Empresa não encontrada.")

        val usuario = repo.findByEmail(email.trim().lowercase(), tenant.schemaName)
            ?: throw IllegalArgumentException("Código inválido ou expirado.")  // mensagem neutra

        require(usuario.primeiroAcessoPendente) { "Este usuário já concluiu o primeiro acesso." }

        verificarTokenInterno(usuario.id, token, tenant.schemaName)
    }

    /**
     * Define a senha definitiva após validar o token.
     */
    suspend fun definirSenha(
        email: String,
        token: String,
        novaSenha: String,
        confirmacaoSenha: String,
        tenantSlug: String,
    ) {
        require(novaSenha == confirmacaoSenha) { "As senhas não coincidem." }
        validarForcaSenha(novaSenha)

        val tenant = authRepo.findTenant(tenantSlug)
            ?: throw IllegalArgumentException("Empresa não encontrada.")

        val usuario = repo.findByEmail(email.trim().lowercase(), tenant.schemaName)
            ?: throw IllegalArgumentException("Código inválido ou expirado.")

        require(usuario.primeiroAcessoPendente) { "Este usuário já concluiu o primeiro acesso." }

        val tokenRecord = verificarTokenInterno(usuario.id, token, tenant.schemaName)

        // Tudo validado — define a senha e finaliza o primeiro acesso
        val hash = BCrypt.hashpw(novaSenha, BCrypt.gensalt(12))
        repo.definirSenha(usuario.id, hash, tenant.schemaName)
        repo.marcarUtilizado(tokenRecord.id, tenant.schemaName)
    }

    /**
     * Reenvio com cooldown e limite de tentativas.
     * Resposta sempre genérica.
     */
    suspend fun reenviar(email: String, canal: String, tenantSlug: String) {
        // Reutiliza a mesma lógica de solicitar (que já implementa cooldown e limite)
        solicitar(email, canal, tenantSlug)
    }

    // ── Privados ──────────────────────────────────────────────────────────────

    /**
     * Valida o token e incrementa tentativas.
     * Lança IllegalArgumentException em qualquer falha (mensagem neutra).
     */
    private suspend fun verificarTokenInterno(
        usuarioId: java.util.UUID,
        token: String,
        schemaName: String,
    ): br.com.madeireira.modules.auth.infrastructure.TokenRecord {
        val registro = repo.findTokenAtivo(usuarioId, schemaName)
            ?: throw IllegalArgumentException("Código inválido ou expirado.")

        require(!registro.bloqueado) {
            "Muitas tentativas inválidas. Solicite um novo código."
        }
        require(registro.utilizadoEm == null) {
            "Este código já foi utilizado. Solicite um novo."
        }
        require(kotlinx.datetime.Clock.System.now() <= registro.expiraEm) {
            "Código expirado. Solicite um novo."
        }

        // Verifica o hash
        val hashInformado = sha256(token.trim())
        if (hashInformado != registro.tokenHash) {
            val novasTentativas = repo.incrementarTentativas(registro.id, schemaName)
            if (novasTentativas >= MAX_TENTATIVAS) {
                repo.bloquearToken(registro.id, schemaName)
                throw IllegalArgumentException("Muitas tentativas inválidas. Solicite um novo código.")
            }
            val restantes = MAX_TENTATIVAS - novasTentativas
            throw IllegalArgumentException("Código incorreto. Você tem $restantes tentativa(s) restante(s).")
        }

        return registro
    }

    private fun validarForcaSenha(senha: String) {
        require(senha.length >= 8)           { "Senha deve ter no mínimo 8 caracteres." }
        require(senha.any { it.isUpperCase() }) { "Senha deve conter pelo menos uma letra maiúscula." }
        require(senha.any { it.isLowerCase() }) { "Senha deve conter pelo menos uma letra minúscula." }
        require(senha.any { it.isDigit() })     { "Senha deve conter pelo menos um número." }
        require(senha.any { !it.isLetterOrDigit() }) { "Senha deve conter pelo menos um caractere especial." }
    }

    /** Token numérico de 6 dígitos gerado com SecureRandom. */
    private fun gerarToken(): String =
        String.format("%06d", SecureRandom().nextInt(1_000_000))

    /** Hash SHA-256 em hexadecimal (token não armazenado em texto puro). */
    private fun sha256(input: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(input.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
}
