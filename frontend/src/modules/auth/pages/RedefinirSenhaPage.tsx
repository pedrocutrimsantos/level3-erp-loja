import React, { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Layers, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/shared/api/auth'

export default function RedefinirSenhaPage() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()

  const [token,      setToken]      = useState(searchParams.get('token') ?? '')
  const [novaSenha,  setNovaSenha]  = useState('')
  const [confirmar,  setConfirmar]  = useState('')
  const [mostrar,    setMostrar]    = useState(false)
  const [erro,       setErro]       = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [sucesso,    setSucesso]    = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    if (novaSenha.length < 8) {
      setErro('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (novaSenha !== confirmar) {
      setErro('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      await authApi.confirmarReset(token.trim(), novaSenha)
      setSucesso(true)
    } catch (err: any) {
      const msg = err?.response?.data?.detalhes ?? err?.response?.data?.erro ?? 'Token inválido ou expirado.'
      setErro(msg)
    } finally {
      setLoading(false)
    }
  }

  if (sucesso) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center flex flex-col items-center gap-4">
          <div className="flex items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 p-4">
            <Layers className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Senha redefinida!</h1>
          <p className="text-sm text-muted-foreground">
            Sua senha foi alterada com sucesso. Faça login com a nova senha.
          </p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Ir para o login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">

        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center justify-center rounded-xl bg-primary/10 p-3">
            <Layers className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Nova senha</h1>
          <p className="text-sm text-muted-foreground">Informe o código e defina uma nova senha</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="token">
              Código de recuperação
            </label>
            <input
              id="token"
              type="text"
              autoComplete="off"
              placeholder="Código recebido"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono tracking-widest text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="novaSenha">
              Nova senha
            </label>
            <div className="relative">
              <input
                id="novaSenha"
                type={mostrar ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setMostrar((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="confirmar">
              Confirmar nova senha
            </label>
            <input
              id="confirmar"
              type={mostrar ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repita a senha"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
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
            {loading ? 'Salvando…' : 'Redefinir senha'}
          </button>
        </form>

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
