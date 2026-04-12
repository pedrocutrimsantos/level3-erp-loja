package br.com.madeireira.modules.auth.application

import br.com.madeireira.core.auth.JwtConfig
import br.com.madeireira.infrastructure.sms.RedbotWhatsAppService
import br.com.madeireira.modules.auth.domain.LoginRequest
import br.com.madeireira.modules.auth.domain.LoginResponse
import br.com.madeireira.modules.auth.infrastructure.AuthRepository
import kotlinx.datetime.Clock
import kotlinx.datetime.DateTimeUnit
import kotlinx.datetime.plus
import org.mindrot.jbcrypt.BCrypt
import java.security.SecureRandom

class AuthService(
    private val repo: AuthRepository,
    private val sms: RedbotWhatsAppService,
) {

    suspend fun login(req: LoginRequest, tenantSlug: String): LoginResponse {
        // 1. Valida tenant
        val tenant = repo.findTenant(tenantSlug)
            ?: throw IllegalArgumentException("Empresa não encontrada.")

        require(tenant.ativo) { "Empresa desativada. Entre em contato com o suporte." }

        // 2. Busca usuário no schema do tenant
        val usuario = repo.findUsuarioByEmail(req.email.trim().lowercase(), tenant.schemaName)
            ?: throw IllegalArgumentException("E-mail ou senha inválidos.")

        require(usuario.ativo) { "Usuário desativado. Consulte o administrador." }

        require(!usuario.primeiroAcessoPendente) {
            "Você ainda não definiu sua senha. Use a opção 'Primeiro acesso' para concluir o cadastro."
        }

        // 3. Verifica senha com bcrypt
        val senhaOk = BCrypt.checkpw(req.senha, usuario.senhaHash ?: "")
        require(senhaOk) { "E-mail ou senha inválidos." }

        // 4. Atualiza ultimo_acesso (fire-and-forget, não bloqueia login)
        runCatching { repo.atualizarUltimoAcesso(usuario.id, tenant.schemaName) }

        // 5. Gera JWT
        val token = JwtConfig.generateToken(
            userId       = usuario.id,
            tenantSlug   = tenant.slug,
            schemaName   = tenant.schemaName,
            perfilCodigo = usuario.perfil,
        )

        return LoginResponse(
            token      = token,
            userId     = usuario.id,
            nome       = usuario.nome,
            perfil     = usuario.perfil,
            tenantSlug = tenant.slug,
        )
    }

    /**
     * Gera token de reset de senha (válido por 1 hora).
     * Retorna o token para exibição — sem envio de e-mail.
     */
    suspend fun solicitarReset(email: String, tenantSlug: String): String {
        val tenant = repo.findTenant(tenantSlug)
            ?: throw IllegalArgumentException("Empresa não encontrada.")

        // Não revela se o e-mail existe ou não — gera token apenas se existir
        val usuario = repo.findUsuarioByEmail(email.trim().lowercase(), tenant.schemaName)
            ?: return gerarToken() // descarta o token silenciosamente

        val token  = gerarToken()
        val expira = Clock.System.now().plus(1, DateTimeUnit.HOUR)
        repo.salvarResetToken(usuario.email, token, expira, tenant.schemaName)

        // Envia por SMS se o usuário tiver telefone cadastrado
        val telefone  = usuario.telefone
        if (!telefone.isNullOrBlank()) {
            runCatching {
                sms.enviar(telefone, "Madex\nCódigo de recuperação de senha: *$token*\nVálido por 1 hora.")
            }
        }

        return token
    }

    /** Confirma o reset usando o token e define a nova senha. */
    suspend fun confirmarReset(token: String, novaSenha: String, tenantSlug: String) {
        require(novaSenha.length >= 8) { "Senha deve ter no mínimo 8 caracteres." }

        val tenant = repo.findTenant(tenantSlug)
            ?: throw IllegalArgumentException("Empresa não encontrada.")

        val usuario = repo.findByResetToken(token, tenant.schemaName)
            ?: throw IllegalArgumentException("Token inválido ou expirado.")

        val hash = BCrypt.hashpw(novaSenha, BCrypt.gensalt(12))
        repo.redefinirSenha(usuario.id, hash, tenant.schemaName)
    }

    /** Altera a senha do usuário autenticado após verificar a senha atual. */
    suspend fun alterarSenha(userId: String, senhaAtual: String, novaSenha: String, tenantSlug: String) {
        require(novaSenha.length >= 8) { "Nova senha deve ter no mínimo 8 caracteres." }

        val tenant = repo.findTenant(tenantSlug)
            ?: throw IllegalArgumentException("Empresa não encontrada.")

        val hashAtual = repo.findSenhaHash(userId, tenant.schemaName)
            ?: throw NoSuchElementException("Usuário não encontrado.")

        require(BCrypt.checkpw(senhaAtual, hashAtual)) { "Senha atual incorreta." }

        val novoHash = BCrypt.hashpw(novaSenha, BCrypt.gensalt(12))
        repo.redefinirSenha(userId, novoHash, tenant.schemaName)
    }

    private fun gerarToken(): String {
        val chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
        val rng   = SecureRandom()
        return (1..10).map { chars[rng.nextInt(chars.length)] }.joinToString("")
    }
}
