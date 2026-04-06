import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAdminStore } from '../store/adminStore'
import { adminApi } from '../api/adminApi'

export default function AdminLoginPage() {
  const navigate    = useNavigate()
  const setAdminKey = useAdminStore((s) => s.setAdminKey)
  const [key,     setKey]     = useState('')
  const [erro,    setErro]    = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setLoading(true)
    try {
      await adminApi.listarTenants(key.trim())
      setAdminKey(key.trim())
      navigate('/admin/tenants', { replace: true })
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setErro('Chave de administração inválida.')
      } else {
        setErro('Não foi possível conectar ao servidor.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center justify-center rounded-xl bg-primary/10 p-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground">Madex — Gestão de Tenants</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="key">
              Chave de acesso
            </label>
            <input
              id="key"
              type="password"
              autoComplete="off"
              placeholder="••••••••••••••••"
              value={key}
              onChange={(e) => setKey(e.target.value)}
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
            {loading ? 'Verificando…' : 'Acessar'}
          </button>
        </form>
      </div>
    </div>
  )
}
