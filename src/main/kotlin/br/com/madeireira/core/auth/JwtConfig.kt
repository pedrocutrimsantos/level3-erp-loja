package br.com.madeireira.core.auth

import com.auth0.jwt.JWT
import com.auth0.jwt.JWTVerifier
import com.auth0.jwt.algorithms.Algorithm
import io.github.cdimascio.dotenv.dotenv
import java.util.Date

object JwtConfig {

    private val env = dotenv { ignoreIfMissing = true }
    private fun env(key: String, default: String) = System.getenv(key) ?: runCatching { env[key] }.getOrNull() ?: default

    val secret: String   = env("JWT_SECRET", "dev-secret-32chars-change-in-prod!")
    val realm:  String   = "shopping-das-madeiras"
    private val algorithm: Algorithm = Algorithm.HMAC256(secret)
    private val expiryMs: Long       = 8 * 60 * 60 * 1000L  // 8 horas

    val verifier: JWTVerifier = JWT.require(algorithm).withIssuer(realm).build()

    fun generateToken(
        userId:       String,
        tenantSlug:   String,
        schemaName:   String,
        perfilCodigo: String,
    ): String = JWT.create()
        .withIssuer(realm)
        .withSubject(userId)
        .withClaim("tenant",  tenantSlug)
        .withClaim("schema",  schemaName)
        .withClaim("perfil",  perfilCodigo)
        .withExpiresAt(Date(System.currentTimeMillis() + expiryMs))
        .sign(algorithm)
}