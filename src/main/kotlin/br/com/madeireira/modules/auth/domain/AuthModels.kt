package br.com.madeireira.modules.auth.domain

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val email: String,
    val senha: String,
)

@Serializable
data class LoginResponse(
    val token:       String,
    val userId:      String,
    val nome:        String,
    val perfil:      String,
    val tenantSlug:  String,
)

@Serializable
data class MeResponse(
    val userId:    String,
    val nome:      String,
    val email:     String,
    val perfil:    String,
    val tenant:    String,
)

data class TenantRecord(
    val id:         String,
    val slug:       String,
    val schemaName: String,
    val ativo:      Boolean,
)

data class UsuarioAuth(
    val id:        String,
    val nome:      String,
    val email:     String,
    val senhaHash: String,
    val ativo:     Boolean,
    val perfil:    String,
)
