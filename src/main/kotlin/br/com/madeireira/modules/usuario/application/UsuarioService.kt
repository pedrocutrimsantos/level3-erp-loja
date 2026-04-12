package br.com.madeireira.modules.usuario.application

import br.com.madeireira.modules.usuario.api.dto.CriarUsuarioDto
import br.com.madeireira.modules.usuario.api.dto.AtualizarUsuarioDto
import br.com.madeireira.modules.usuario.api.dto.PerfilResponse
import br.com.madeireira.modules.usuario.api.dto.UsuarioResponse
import br.com.madeireira.modules.usuario.domain.AtualizarUsuarioRequest
import br.com.madeireira.modules.usuario.domain.CriarUsuarioRequest
import br.com.madeireira.modules.usuario.domain.UsuarioListItem
import br.com.madeireira.modules.usuario.infrastructure.UsuarioRepository
import java.util.UUID

class UsuarioService(private val repo: UsuarioRepository) {

    suspend fun listar(): List<UsuarioResponse> =
        repo.findAll().map { toResponse(it) }

    suspend fun buscarPorId(id: UUID): UsuarioResponse {
        val usuario = repo.findById(id)
            ?: throw NoSuchElementException("Usuário não encontrado: $id")
        return toResponse(usuario)
    }

    suspend fun criar(dto: CriarUsuarioDto): UsuarioResponse {
        require(dto.nome.isNotBlank()) { "Nome é obrigatório" }
        require(dto.email.isNotBlank()) { "E-mail é obrigatório" }
        require(dto.telefone.isNotBlank()) { "Telefone é obrigatório para o envio do token de primeiro acesso" }
        require(!repo.emailJaExiste(dto.email)) { "Já existe um usuário com este e-mail" }
        require(repo.perfilExiste(dto.perfilCodigo)) { "Perfil não encontrado: ${dto.perfilCodigo}" }

        val req = CriarUsuarioRequest(
            nome         = dto.nome,
            email        = dto.email,
            telefone     = dto.telefone,
            perfilCodigo = dto.perfilCodigo,
            vendedor     = dto.vendedor,
        )
        return toResponse(repo.criar(req))
    }

    suspend fun atualizar(id: UUID, dto: AtualizarUsuarioDto): UsuarioResponse {
        repo.findById(id) ?: throw NoSuchElementException("Usuário não encontrado: $id")

        if (dto.email != null) {
            require(dto.email.isNotBlank()) { "E-mail não pode ser vazio" }
            require(!repo.emailJaExiste(dto.email, excluirId = id)) { "Já existe outro usuário com este e-mail" }
        }
        if (dto.nome != null) {
            require(dto.nome.isNotBlank()) { "Nome não pode ser vazio" }
        }
        if (dto.senha != null) {
            require(dto.senha.length >= 8) { "Senha deve ter no mínimo 8 caracteres" }
        }
        if (dto.perfilCodigo != null) {
            require(repo.perfilExiste(dto.perfilCodigo)) { "Perfil não encontrado: ${dto.perfilCodigo}" }
        }

        val req = AtualizarUsuarioRequest(
            nome        = dto.nome,
            email       = dto.email,
            senha       = dto.senha,
            perfilCodigo = dto.perfilCodigo,
            vendedor    = dto.vendedor,
            telefone    = dto.telefone,
        )
        return toResponse(repo.atualizar(id, req))
    }

    suspend fun ativar(id: UUID, solicitanteId: UUID): UsuarioResponse {
        repo.findById(id) ?: throw NoSuchElementException("Usuário não encontrado: $id")
        return toResponse(repo.setAtivo(id, true))
    }

    suspend fun desativar(id: UUID, solicitanteId: UUID): UsuarioResponse {
        require(id != solicitanteId) { "Você não pode desativar a sua própria conta" }
        repo.findById(id) ?: throw NoSuchElementException("Usuário não encontrado: $id")
        return toResponse(repo.setAtivo(id, false))
    }

    suspend fun listarPerfis(): List<PerfilResponse> =
        repo.listarPerfis().map { PerfilResponse(it.id.toString(), it.codigo, it.descricao) }

    private fun toResponse(u: UsuarioListItem) = UsuarioResponse(
        id                      = u.id.toString(),
        nome                    = u.nome,
        email                   = u.email,
        telefone                = u.telefone,
        perfilCodigo            = u.perfilCodigo,
        perfilDescricao         = u.perfilDescricao,
        vendedor                = u.vendedor,
        ativo                   = u.ativo,
        primeiroAcessoPendente  = u.primeiroAcessoPendente,
        ultimoAcesso            = u.ultimoAcesso,
        createdAt               = u.createdAt,
    )
}
