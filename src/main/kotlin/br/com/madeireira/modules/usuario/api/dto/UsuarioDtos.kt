package br.com.madeireira.modules.usuario.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class UsuarioResponse(
    val id: String,
    val nome: String,
    val email: String,
    val perfilCodigo: String,
    val perfilDescricao: String,
    val vendedor: Boolean,
    val ativo: Boolean,
    val ultimoAcesso: String?,
    val createdAt: String,
)

@Serializable
data class CriarUsuarioDto(
    val nome: String,
    val email: String,
    val senha: String,
    val perfilCodigo: String,
    val vendedor: Boolean = false,
)

@Serializable
data class AtualizarUsuarioDto(
    val nome: String? = null,
    val email: String? = null,
    val senha: String? = null,
    val perfilCodigo: String? = null,
    val vendedor: Boolean? = null,
)

@Serializable
data class PerfilResponse(
    val id: String,
    val codigo: String,
    val descricao: String,
)
