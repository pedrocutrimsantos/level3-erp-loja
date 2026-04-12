package br.com.madeireira.modules.usuario.domain

import java.util.UUID

data class UsuarioListItem(
    val id: UUID,
    val nome: String,
    val email: String,
    val telefone: String?,
    val perfilId: UUID,
    val perfilCodigo: String,
    val perfilDescricao: String,
    val vendedor: Boolean,
    val ativo: Boolean,
    val primeiroAcessoPendente: Boolean,
    val ultimoAcesso: String?,
    val createdAt: String,
)

data class CriarUsuarioRequest(
    val nome: String,
    val email: String,
    val telefone: String,               // obrigatório — token de 1º acesso enviado via WhatsApp
    val perfilCodigo: String,
    val vendedor: Boolean = false,
)

data class AtualizarUsuarioRequest(
    val nome: String?,
    val email: String?,
    val senha: String?,
    val perfilCodigo: String?,
    val vendedor: Boolean?,
    val telefone: String? = null,
)

data class PerfilSimples(
    val id: UUID,
    val codigo: String,
    val descricao: String,
)
