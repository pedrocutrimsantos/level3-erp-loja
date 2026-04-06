package br.com.madeireira.modules.auth.application

import br.com.madeireira.core.auth.JwtConfig
import br.com.madeireira.modules.auth.domain.LoginRequest
import br.com.madeireira.modules.auth.domain.LoginResponse
import br.com.madeireira.modules.auth.infrastructure.AuthRepository
import org.mindrot.jbcrypt.BCrypt

class AuthService(private val repo: AuthRepository) {

    suspend fun login(req: LoginRequest, tenantSlug: String): LoginResponse {
        // 1. Valida tenant
        val tenant = repo.findTenant(tenantSlug)
            ?: throw IllegalArgumentException("Empresa não encontrada.")

        require(tenant.ativo) { "Empresa desativada. Entre em contato com o suporte." }

        // 2. Busca usuário no schema do tenant
        val usuario = repo.findUsuarioByEmail(req.email.trim().lowercase(), tenant.schemaName)
            ?: throw IllegalArgumentException("E-mail ou senha inválidos.")

        require(usuario.ativo) { "Usuário desativado. Consulte o administrador." }

        // 3. Verifica senha com bcrypt
        val senhaOk = BCrypt.checkpw(req.senha, usuario.senhaHash)
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
}
