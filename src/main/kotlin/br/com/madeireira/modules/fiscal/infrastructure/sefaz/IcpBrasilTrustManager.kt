package br.com.madeireira.modules.fiscal.infrastructure.sefaz

import io.github.oshai.kotlinlogging.KotlinLogging
import java.io.FileInputStream
import java.security.KeyStore
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import javax.net.ssl.TrustManager
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager

private val log = KotlinLogging.logger {}

/**
 * Fornece um [TrustManager] adequado para os webservices SEFAZ (ICP-Brasil).
 *
 * As CAs raiz do ICP-Brasil não estão no `cacerts` padrão da JVM, portanto
 * precisamos carregá-las explicitamente. A resolução segue três níveis:
 *
 *   1. **Variável de ambiente** `ICP_BRASIL_TRUSTSTORE_PATH` apontando para um
 *      arquivo JKS/PKCS12 externo (recomendado em produção).
 *      Senha via `ICP_BRASIL_TRUSTSTORE_PASSWORD` (padrão: `changeit`).
 *
 *   2. **Classpath** `/icp-brasil.jks` — truststore embutido no JAR.
 *      Para gerar: ver instrução abaixo.
 *
 *   3. **Fallback inseguro** — trust-all (aceita qualquer certificado).
 *      Aceitável apenas em homologação. Em produção é registrado como WARN.
 *
 * ── Como gerar o truststore ICP-Brasil ──────────────────────────────────────
 *
 *   1. Baixar as CAs raiz em https://www.gov.br/iti/pt-br/assuntos/repositorio
 *      (arquivos: ICP-Brasilv1.crt, ICP-Brasilv2.crt, ICP-Brasilv5.crt,
 *       ICP-Brasilv10.crt, AC-Raiz-v7.crt)
 *
 *   2. Importar com keytool:
 *      ```
 *      keytool -import -trustcacerts -alias icp-v1  -file ICP-Brasilv1.crt  -keystore icp-brasil.jks -storepass changeit -noprompt
 *      keytool -import -trustcacerts -alias icp-v2  -file ICP-Brasilv2.crt  -keystore icp-brasil.jks -storepass changeit -noprompt
 *      keytool -import -trustcacerts -alias icp-v5  -file ICP-Brasilv5.crt  -keystore icp-brasil.jks -storepass changeit -noprompt
 *      keytool -import -trustcacerts -alias icp-v10 -file ICP-Brasilv10.crt -keystore icp-brasil.jks -storepass changeit -noprompt
 *      ```
 *
 *   3. Copiar `icp-brasil.jks` para `src/main/resources/` (opção classpath)
 *      ou para um caminho externo e configurar `ICP_BRASIL_TRUSTSTORE_PATH`.
 */
object IcpBrasilTrustManager {

    fun carregar(ambiente: String = "HOMOLOGACAO"): Array<TrustManager> {
        // ── Fonte 1: variável de ambiente ────────────────────────────────────
        val pathEnv = System.getenv("ICP_BRASIL_TRUSTSTORE_PATH")
        if (!pathEnv.isNullOrBlank()) {
            val senha = (System.getenv("ICP_BRASIL_TRUSTSTORE_PASSWORD") ?: "changeit").toCharArray()
            runCatching {
                val ks = carregarKeyStore(FileInputStream(pathEnv), senha, pathEnv)
                val managers = tmfDe(ks)
                log.info { "ICP-Brasil TrustStore carregado de $pathEnv (${ks.size()} CAs)" }
                return managers
            }.onFailure {
                log.error(it) { "Falha ao carregar ICP-Brasil TrustStore de $pathEnv — tentando classpath" }
            }
        }

        // ── Fonte 2: classpath /icp-brasil.jks ───────────────────────────────
        val stream = IcpBrasilTrustManager::class.java.getResourceAsStream("/icp-brasil.jks")
        if (stream != null) {
            val senha = (System.getenv("ICP_BRASIL_TRUSTSTORE_PASSWORD") ?: "changeit").toCharArray()
            runCatching {
                val ks = carregarKeyStore(stream, senha, "classpath:/icp-brasil.jks")
                val managers = tmfDe(ks)
                log.info { "ICP-Brasil TrustStore carregado do classpath (${ks.size()} CAs)" }
                return managers
            }.onFailure {
                log.error(it) { "Falha ao carregar ICP-Brasil TrustStore do classpath" }
            }
        }

        // ── Fallback: trust-all ──────────────────────────────────────────────
        if (ambiente.uppercase() == "PRODUCAO") {
            log.warn {
                "⚠️  SEGURANÇA: trust-all TrustManager ativo em PRODUÇÃO. " +
                "Configure ICP_BRASIL_TRUSTSTORE_PATH para habilitar validação real dos certificados SEFAZ."
            }
        } else {
            log.info {
                "ICP-Brasil TrustStore não configurado — usando trust-all (homologação). " +
                "Em produção configure ICP_BRASIL_TRUSTSTORE_PATH."
            }
        }
        return trustAll()
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun carregarKeyStore(
        stream: java.io.InputStream,
        senha: CharArray,
        origem: String,
    ): KeyStore {
        val tipo = if (origem.endsWith(".p12") || origem.endsWith(".pfx")) "PKCS12" else "JKS"
        return KeyStore.getInstance(tipo).also { ks ->
            stream.use { ks.load(it, senha) }
        }
    }

    private fun tmfDe(ks: KeyStore): Array<TrustManager> {
        val tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
        tmf.init(ks)
        return tmf.trustManagers
    }

    private fun trustAll(): Array<TrustManager> = arrayOf(object : X509TrustManager {
        override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) = Unit
        override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) = Unit
        override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
    })
}
