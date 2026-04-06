import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, LogOut, Plus, Building2, Eye, EyeOff } from 'lucide-react'
import { adminApi, CriarTenantDto, TenantResponse } from '../api/adminApi'
import { useAdminStore } from '../store/adminStore'

// ── Modal de criação ──────────────────────────────────────────────────────────

interface NovoTenantModalProps {
  open: boolean
  onClose: () => void
  adminKey: string
}

function NovoTenantModal({ open, onClose, adminKey }: NovoTenantModalProps) {
  const qc = useQueryClient()
  const [form, setForm] = useState<CriarTenantDto>({
    slug: '', razaoSocial: '', cnpj: '',
    adminEmail: '', adminNome: '', adminSenha: '',
  })
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const criar = useMutation({
    mutationFn: () => adminApi.criarTenant(adminKey, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tenants'] })
      onClose()
      setForm({ slug: '', razaoSocial: '', cnpj: '', adminEmail: '', adminNome: '', adminSenha: '' })
      setErro(null)
    },
    onError: (err: any) => {
      setErro(err?.response?.data?.detalhes ?? err?.response?.data?.erro ?? 'Erro ao criar tenant.')
    },
  })

  if (!open) return null

  const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-card shadow-xl overflow-hidden dark:bg-[#161d27]">
        <div className="flex items-center justify-between bg-muted/50 border-b border-border px-6 py-4 dark:bg-[#1c2636] dark:border-[#243040]">
          <h2 className="text-base font-semibold text-foreground">Novo Tenant</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">✕</button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); criar.mutate() }}
          className="px-6 py-5 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Slug *</label>
              <input required placeholder="loja_abc" value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                className={inputClass} />
              <p className="text-[10px] text-muted-foreground">Usado no subdomínio e URL</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CNPJ *</label>
              <input required placeholder="00.000.000/0001-00" value={form.cnpj}
                onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
                className={inputClass} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Razão Social *</label>
            <input required placeholder="Madeireira Exemplo Ltda" value={form.razaoSocial}
              onChange={(e) => setForm((f) => ({ ...f, razaoSocial: e.target.value }))}
              className={inputClass} />
          </div>

          <div className="border-t border-border pt-4 dark:border-[#243040]">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Usuário administrador</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-foreground">Nome *</label>
                  <input required placeholder="Nome do admin" value={form.adminNome}
                    onChange={(e) => setForm((f) => ({ ...f, adminNome: e.target.value }))}
                    className={inputClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-foreground">E-mail *</label>
                  <input required type="email" placeholder="admin@loja.com" value={form.adminEmail}
                    onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                    className={inputClass} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Senha inicial *</label>
                <div className="relative">
                  <input required type={mostrarSenha ? 'text' : 'password'} placeholder="Mínimo 8 caracteres"
                    minLength={8} value={form.adminSenha}
                    onChange={(e) => setForm((f) => ({ ...f, adminSenha: e.target.value }))}
                    className={inputClass + ' pr-10'} />
                  <button type="button" onClick={() => setMostrarSenha((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {erro && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4 dark:border-[#243040]">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={criar.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
              {criar.isPending ? 'Provisionando…' : 'Criar tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Badge status ──────────────────────────────────────────────────────────────

function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
      ativo
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    }`}>
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function TenantsPage() {
  const navigate    = useNavigate()
  const adminKey    = useAdminStore((s) => s.adminKey)!
  const clearKey    = useAdminStore((s) => s.clearAdminKey)
  const qc          = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)

  const { data: tenants = [], isLoading, isError } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: () => adminApi.listarTenants(adminKey),
  })

  const ativar = useMutation({
    mutationFn: (id: string) => adminApi.ativarTenant(adminKey, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tenants'] }),
  })

  const desativar = useMutation({
    mutationFn: (id: string) => adminApi.desativarTenant(adminKey, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tenants'] }),
  })

  function handleLogout() {
    clearKey()
    navigate('/admin', { replace: true })
  }

  function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-background dark:bg-[#0d1117]">

      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 dark:bg-[#161d27] dark:border-[#243040]">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <span className="block text-sm font-bold text-foreground">Painel Admin — Madex</span>
              <span className="block text-[11px] text-muted-foreground">Gestão de Tenants</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="mx-auto max-w-5xl px-6 py-8">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Tenants</h1>
            <p className="text-sm text-muted-foreground">{tenants.length} {tenants.length === 1 ? 'empresa cadastrada' : 'empresas cadastradas'}</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Novo tenant
          </button>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted" />)}
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
            Erro ao carregar tenants. Verifique a chave de acesso.
          </div>
        ) : tenants.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center dark:bg-[#161d27] dark:border-[#243040]">
            <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Nenhum tenant cadastrado</p>
            <p className="mt-1 text-xs text-muted-foreground">Clique em "Novo tenant" para provisionar a primeira empresa.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden dark:bg-[#161d27] dark:border-[#243040]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 dark:bg-[#1c2636] dark:border-[#243040]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Slug</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">CNPJ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Criado em</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t: TenantResponse, i: number) => (
                  <tr key={t.id} className={`border-b border-border last:border-0 dark:border-[#243040] ${i % 2 === 1 ? 'bg-muted/20 dark:bg-[#1c2636]/30' : ''}`}>
                    <td className="px-4 py-3 font-medium text-foreground">{t.razaoSocial}</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground dark:bg-[#243040]">{t.slug}</code>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{t.cnpj}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatarData(t.createdAt)}</td>
                    <td className="px-4 py-3"><StatusBadge ativo={t.ativo} /></td>
                    <td className="px-4 py-3 text-right">
                      {t.ativo ? (
                        <button
                          onClick={() => desativar.mutate(t.id)}
                          disabled={desativar.isPending}
                          className="rounded-lg px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        >
                          Desativar
                        </button>
                      ) : (
                        <button
                          onClick={() => ativar.mutate(t.id)}
                          disabled={ativar.isPending}
                          className="rounded-lg px-3 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-50"
                        >
                          Ativar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <NovoTenantModal open={modalOpen} onClose={() => setModalOpen(false)} adminKey={adminKey} />
    </div>
  )
}
