package br.com.madeireira.core.auth

import kotlin.coroutines.AbstractCoroutineContextElement
import kotlin.coroutines.CoroutineContext

/**
 * Elemento de contexto de coroutine que carrega o schema do tenant ativo.
 * Injetado pelo interceptor JWT em Application.kt antes de cada handler.
 * Lido por DatabaseConfig.dbQuery para rotear para o schema correto.
 */
class TenantSchema(
    val slug: String,
    val schemaName: String,
) : AbstractCoroutineContextElement(TenantSchema) {
    companion object Key : CoroutineContext.Key<TenantSchema>
}
