package br.com.madeireira.modules.usuario.domain

import java.util.UUID

data class UsuarioListItem(
    val id: UUID,
    val nome: String,
    val email: String,
    val perfilId: UUID,
    val perfilCodigo: String,
    val perfilDescricao: String,
    val vendedor: Boolean,
    val ativo: Boolean,
    val ultimoAcesso: String?,
    val createdAt: String,
)

data class CriarUsuarioRequest(
    val nome: String,
    val email: String,
    val senha: String,
    val perfilCodigo: String,
    val vendedor: Boolean = false,
)

data class AtualizarUsuarioRequest(
    val nome: String?,
    val email: String?,
    val senha: String?,
    val perfilCodigo: String?,
    val vendedor: Boolean?,
)

data class PerfilSimples(
    val id: UUID,
    val codigo: String,
    val descricao: String,
)
