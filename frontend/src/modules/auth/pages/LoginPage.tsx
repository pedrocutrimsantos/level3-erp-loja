import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Layers } from 'lucide-react'
import { authApi } from '@/shared/api/auth'
import { useAuthStore } from '@/shared/store/authStore'

export default function LoginPage() {
  const navigate  = useNavigate()
  const setAuth   = useAuthStore((s) => s.setAuth)

  const [form, setForm] = useState({ email: '', senha: '' })
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setLoading(true)
    try {
      const data = await authApi.login(form)
      setAuth(data)
      navigate('/', { replace: true })
    } catch (err: any) {
      if (!err?.response) {
        setErro('Sem conexão com o servidor. Verifique sua rede.')
      } else if (err.response.status === 401) {
        setErro(err.response.data?.detalhes ?? 'E-mail ou senha incorretos.')
      } else if (err.response.status === 400) {
        setErro(err.response.data?.detalhes ?? 'Requisição inválida.')
      } else {
        setErro(err.response.data?.detalhes ?? err.response.data?.erro ?? 'Erro interno. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const erroPrimeiroAcesso = erro != null && /primeiro acesso/i.test(erro)

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center justify-center rounded-xl bg-primary/10 p-3">
            <Layers className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Madex</h1>
          <p className="text-sm text-muted-foreground">by Level3 — Entre com sua conta</p>
        </div>

        {/* Formulário */}
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
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.senha}
              onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
              required
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {erro && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <p>{erro}</p>
              {erroPrimeiroAcesso && (
                <Link
                  to="/primeiro-acesso"
                  className="mt-1 inline-block font-semibold underline hover:opacity-80"
                >
                  Concluir primeiro acesso →
                </Link>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          <div className="flex items-center justify-center gap-4 text-sm">
            <Link
              to="/esqueci-senha"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Esqueci minha senha
            </Link>
            <span className="text-border">·</span>
            <Link
              to="/primeiro-acesso"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Primeiro acesso
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
