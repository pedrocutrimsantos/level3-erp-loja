import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Layers, ArrowLeft, CheckCircle } from 'lucide-react'
import { authApi } from '@/shared/api/auth'

type Etapa = 'email' | 'token' | 'senha' | 'concluido'

export default function PrimeiroAcessoPage() {
  const navigate = useNavigate()

  const [etapa, setEtapa]       = useState<Etapa>('email')
  const [email, setEmail]       = useState('')
  const [token, setToken]       = useState('')
  const [novaSenha, setNovaSenha]         = useState('')
  const [confirmacao, setConfirmacao]     = useState('')
  const [erro, setErro]         = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  // ── Etapa 1: enviar código ──────────────────────────────────────────────────

  async function handleSolicitar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setLoading(true)
    try {
      await authApi.primeiroAcessoSolicitar(email)
      setEtapa('token')
    } catch {
      // mensagem genérica mesmo em erro — não revela se o e-mail existe
      setEtapa('token')
    } finally {
      setLoading(false)
    }
  }

  // ── Etapa 2: validar código ─────────────────────────────────────────────────

  async function handleValidarToken(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setLoading(true)
    try {
      await authApi.primeiroAcessoValidarToken(email, token)
      setEtapa('senha')
    } catch (err: any) {
      setErro(err?.response?.data?.detalhes ?? 'Código inválido ou expirado.')
    } finally {
      setLoading(false)
    }
  }

  async function handleReenviar() {
    setErro(null)
    setLoading(true)
    try {
      await authApi.primeiroAcessoReenviar(email)
      setErro('Novo código enviado. Verifique seu WhatsApp.')
    } catch {
      setErro('Não foi possível reenviar o código. Tente novamente mais tarde.')
    } finally {
      setLoading(false)
    }
  }

  // ── Etapa 3: definir senha ──────────────────────────────────────────────────

  async function handleDefinirSenha(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (novaSenha !== confirmacao) {
      setErro('As senhas não coincidem.')
      return
    }
    setLoading(true)
    try {
      await authApi.primeiroAcessoDefinirSenha(email, token, novaSenha, confirmacao)
      setEtapa('concluido')
    } catch (err: any) {
      setErro(err?.response?.data?.detalhes ?? 'Erro ao definir a senha.')
    } finally {
      setLoading(false)
    }
  }

  // ── Layout base ─────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center justify-center rounded-xl bg-primary/10 p-3">
            <Layers className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Madex</h1>
          <p className="text-sm text-muted-foreground">Primeiro acesso</p>
        </div>

        {/* Indicador de progresso */}
        {etapa !== 'concluido' && (
          <div className="mb-6 flex items-center gap-2">
            {(['email', 'token', 'senha'] as const).map((e, i) => (
              <React.Fragment key={e}>
                <div className={`h-2 flex-1 rounded-full transition-colors ${
                  etapa === e ? 'bg-primary' :
                  (['email','token','senha'].indexOf(etapa) > i) ? 'bg-primary/40' : 'bg-muted'
                }`} />
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ── Etapa 1: E-mail ── */}
        {etapa === 'email' && (
          <form onSubmit={handleSolicitar} className="flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Informe seu e-mail</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enviaremos um código de verificação para o WhatsApp cadastrado.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="email">E-mail</label>
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

            {erro && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Enviando…' : 'Enviar código'}
            </button>

            <div className="text-center">
              <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar para o login
              </Link>
            </div>
          </form>
        )}

        {/* ── Etapa 2: Token ── */}
        {etapa === 'token' && (
          <form onSubmit={handleValidarToken} className="flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Digite o código</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Um código de 6 dígitos foi enviado para o WhatsApp associado ao e-mail <strong>{email}</strong>.
                O código expira em 10 minutos.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="token">Código</label>
              <input
                id="token"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                className="rounded-lg border border-input bg-background px-3 py-2 text-center text-lg font-mono tracking-widest text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {erro && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>}

            <button
              type="submit"
              disabled={loading || token.length !== 6}
              className="mt-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Verificando…' : 'Verificar código'}
            </button>

            <button
              type="button"
              onClick={handleReenviar}
              disabled={loading}
              className="text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
            >
              Não recebi o código — reenviar
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setEtapa('email'); setToken(''); setErro(null) }}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar
              </button>
            </div>
          </form>
        )}

        {/* ── Etapa 3: Senha ── */}
        {etapa === 'senha' && (
          <form onSubmit={handleDefinirSenha} className="flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Crie sua senha</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Escolha uma senha segura. Ela deve ter pelo menos 8 caracteres, com maiúsculas, minúsculas, números e um caractere especial.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="nova-senha">Nova senha</label>
              <input
                id="nova-senha"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                required
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="confirmacao">Confirmar senha</label>
              <input
                id="confirmacao"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                required
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Indicadores de força */}
            <ul className="space-y-1">
              {[
                { ok: novaSenha.length >= 8,           label: 'Mínimo 8 caracteres' },
                { ok: /[A-Z]/.test(novaSenha),         label: 'Uma letra maiúscula' },
                { ok: /[a-z]/.test(novaSenha),         label: 'Uma letra minúscula' },
                { ok: /[0-9]/.test(novaSenha),         label: 'Um número' },
                { ok: /[^a-zA-Z0-9]/.test(novaSenha), label: 'Um caractere especial' },
              ].map(({ ok, label }) => (
                <li key={label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                  {label}
                </li>
              ))}
            </ul>

            {erro && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Salvando…' : 'Definir senha e entrar'}
            </button>
          </form>
        )}

        {/* ── Concluído ── */}
        {etapa === 'concluido' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-4">
              <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Cadastro concluído!</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sua senha foi definida com sucesso. Agora você pode fazer login normalmente.
              </p>
            </div>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="mt-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Ir para o login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
