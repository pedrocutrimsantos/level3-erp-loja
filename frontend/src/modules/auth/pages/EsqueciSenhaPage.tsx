import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Layers, ArrowLeft, Copy, Check } from 'lucide-react'
import { authApi } from '@/shared/api/auth'

export default function EsqueciSenhaPage() {
  const [email,    setEmail]    = useState('')
  const [token,    setToken]    = useState<string | null>(null)
  const [erro,     setErro]     = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [copiado,  setCopiado]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setLoading(true)
    try {
      const data = await authApi.solicitarReset(email)
      setToken(data.token || null)
    } catch {
      setErro('Erro ao processar solicitação. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function copiar() {
    if (!token) return
    await navigator.clipboard.writeText(token)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">

        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center justify-center rounded-xl bg-primary/10 p-3">
            <Layers className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Recuperar senha</h1>
          <p className="text-center text-sm text-muted-foreground">
            Informe seu e-mail para receber o código de redefinição
          </p>
        </div>

        {token === null ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {erro && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Processando…' : 'Enviar código'}
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            {token ? (
              <>
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4">
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-1">
                    Código gerado com sucesso! Válido por 1 hora.
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-3">
                    Se você tiver telefone cadastrado, o código também foi enviado por mensagem.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-lg bg-white dark:bg-[#0d1117] border border-border px-3 py-2 text-base font-mono font-bold tracking-widest text-foreground text-center">
                      {token}
                    </code>
                    <button
                      onClick={copiar}
                      className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted transition-colors"
                      title="Copiar código"
                    >
                      {copiado ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Link
                  to={`/redefinir-senha?token=${token}`}
                  className="block text-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Continuar e definir nova senha
                </Link>
              </>
            ) : (
              <div className="rounded-xl bg-muted p-4">
                <p className="text-sm text-muted-foreground text-center">
                  Se o e-mail estiver cadastrado, um código foi enviado por mensagem para o telefone cadastrado.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  )
}
