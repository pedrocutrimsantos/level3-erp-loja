package br.com.madeireira.infrastructure.database

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.github.cdimascio.dotenv.dotenv
import org.flywaydb.core.Flyway
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import kotlinx.coroutines.Dispatchers

object DatabaseConfig {

    private lateinit var dataSource: HikariDataSource

    private val env = dotenv {
        ignoreIfMissing = true  // em produção não há .env — usa variáveis de ambiente reais
    }

    private fun env(key: String, default: String): String =
        System.getenv(key) ?: env[key] ?: default

    fun init() {
        val config = HikariConfig().apply {
            // Railway injeta DATABASE_URL no formato postgres://user:pass@host:port/db
            // Aceita esse formato diretamente (sem precisar de DB_URL/DB_USER/DB_PASSWORD separados)
            val databaseUrl = System.getenv("DATABASE_URL") ?: env["DATABASE_URL"]
            if (databaseUrl != null) {
                // Railway usa postgresql://user:pass@host:port/db — JDBC não aceita credenciais na URL
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
            driverClassName = "org.postgresql.Driver"
            maximumPoolSize = 10
            isAutoCommit    = false
            transactionIsolation = "TRANSACTION_REPEATABLE_READ"
            validate()
        }

        dataSource = HikariDataSource(config)

        Database.connect(dataSource)

        val flyway = Flyway.configure()
            .dataSource(dataSource)
            .locations("classpath:db/migration")
            .load()

        flyway.repair()   // atualiza checksums caso migrations já aplicadas tenham sido editadas
        flyway.migrate()
    }

    suspend fun <T> dbQuery(block: suspend () -> T): T =
        newSuspendedTransaction(Dispatchers.IO) { block() }
}
