package br.com.madeireira.modules.usuario.infrastructure

import br.com.madeireira.modules.usuario.domain.AtualizarUsuarioRequest
import br.com.madeireira.modules.usuario.domain.CriarUsuarioRequest
import br.com.madeireira.modules.usuario.domain.PerfilSimples
import br.com.madeireira.modules.usuario.domain.UsuarioListItem
import java.util.UUID

interface UsuarioRepository {
    suspend fun findAll(): List<UsuarioListItem>
    suspend fun findById(id: UUID): UsuarioListItem?
    suspend fun emailJaExiste(email: String, excluirId: UUID? = null): Boolean
    suspend fun criar(req: CriarUsuarioRequest): UsuarioListItem
    suspend fun atualizar(id: UUID, req: AtualizarUsuarioRequest): UsuarioListItem
    suspend fun setAtivo(id: UUID, ativo: Boolean): UsuarioListItem
    suspend fun listarPerfis(): List<PerfilSimples>
    suspend fun perfilExiste(codigo: String): Boolean
}
