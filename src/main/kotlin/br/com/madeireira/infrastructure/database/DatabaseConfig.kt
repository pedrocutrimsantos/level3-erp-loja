package br.com.madeireira.infrastructure.database

import br.com.madeireira.core.auth.TenantSchema
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.github.cdimascio.dotenv.dotenv
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import org.flywaydb.core.Flyway
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction

object DatabaseConfig {

    private lateinit var dataSource: HikariDataSource

    private val env = dotenv { ignoreIfMissing = true }

    private fun env(key: String, default: String): String =
        System.getenv(key) ?: runCatching { env[key] }.getOrNull() ?: default

    fun init() {
        val config = HikariConfig().apply {
            val databaseUrl = System.getenv("DATABASE_URL") ?: runCatching { env["DATABASE_URL"] }.getOrNull()
            if (databaseUrl != null) {
                val uri = java.net.URI(databaseUrl.replace(Regex("^postgresql?://"), "http://"))
                jdbcUrl  = "jdbc:postgresql://${uri.host}:${uri.port}${uri.path}"
                val userInfo = uri.userInfo?.split(":", limit = 2) ?: emptyList()
                if (userInfo.isNotEmpty()) username = userInfo[0]
                if (userInfo.size > 1)     password = userInfo[1]
            } else {
                jdbcUrl  = env("DB_URL",      "jdbc:postgresql://localhost:5432/madeireira")
                username = env("DB_USER",     "postgres")
                password = env("DB_PASSWORD", "postgres")
            }
            driverClassName      = "org.postgresql.Driver"
            maximumPoolSize      = 10
            isAutoCommit         = false
            transactionIsolation = "TRANSACTION_REPEATABLE_READ"
            validate()
        }

        dataSource = HikariDataSource(config)
        Database.connect(dataSource)

        // 1. Migra objetos compartilhados no schema public (tabela de tenants).
        // baselineOnMigrate=true + baselineVersion="0": schema public já existe com dados,
        // então Flyway cria o histórico a partir de V0 e aplica V001 normalmente.
        Flyway.configure()
            .dataSource(dataSource)
            .schemas("public")
            .locations("classpath:db/public")
            .table("flyway_public_history")
            .baselineOnMigrate(true)
            .baselineVersion("0")
            .load()
            .also { it.repair(); it.migrate() }

        // 2. Migra schema do tenant piloto (public) — comportamento atual mantido
        Flyway.configure()
            .dataSource(dataSource)
            .locations("classpath:db/migration")
            .load()
            .also { it.repair(); it.migrate() }
    }

    /**
     * Provisiona um novo tenant: cria o schema e executa todas as migrations.
     * Chamado pelo TenantProvisioner quando um novo cliente é cadastrado.
     */
    fun provisionTenant(schemaName: String) {
        val safe = schemaName.replace(Regex("[^a-z0-9_]"), "")
        require(safe.isNotBlank()) { "Schema name inválido: $schemaName" }

        Flyway.configure()
            .dataSource(dataSource)
            .schemas(safe)
            .locations("classpath:db/migration")
            .load()
            .migrate()
    }

    /**
     * Executa um bloco dentro de uma transação.
     * Se houver um TenantSchema no contexto de coroutine, o search_path é ajustado
     * automaticamente para o schema do tenant — sem nenhuma mudança nos repositórios existentes.
     */
    suspend fun <T> dbQuery(block: suspend () -> T): T {
        val tenant = currentCoroutineContext()[TenantSchema]
        return newSuspendedTransaction(Dispatchers.IO) {
            if (tenant != null) {
                val safe = tenant.schemaName.replace(Regex("[^a-zA-Z0-9_]"), "")
                exec("SET LOCAL search_path = \"$safe\", public")
            }
            block()
        }
    }
}
