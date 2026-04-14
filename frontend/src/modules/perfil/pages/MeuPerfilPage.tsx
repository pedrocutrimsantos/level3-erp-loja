import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Mail, Phone, Shield, Clock, Pencil, Check, X } from 'lucide-react'
import { meApi } from '@/shared/api/usuarios'
import { useToast } from '@/shared/store/toastStore'
import { cn } from '@/shared/utils/cn'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
  } catch { return '—' }
}

// ── Campo editável ────────────────────────────────────────────────────────────

interface CampoEditavelProps {
  label: string
  value: string | null | undefined
  onSave: (val: string) => Promise<void>
  placeholder?: string
  tipo?: 'text' | 'tel'
}

function CampoEditavel({ label, value, onSave, placeholder, tipo = 'text' }: CampoEditavelProps) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value ?? '')
  const [loading, setLoading] = useState(false)

  // Sincroniza quando valor externo muda (após salvar)
  useEffect(() => { if (!editing) setDraft(value ?? '') }, [value, editing])

  async function handleSave() {
    const trimmed = draft.trim()
    if (trimmed === (value ?? '')) { setEditing(false); return }
    setLoading(true)
    try {
      await onSave(trimmed)
      setEditing(false)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter')  handleSave()
    if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false) }
  }

  return (
    <div className="flex items-start gap-3 py-4 border-b border-border/60 last:border-0 dark:border-[#243040]/60">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type={tipo}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={loading}
              className={cn(
                'flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-[#1c2636] dark:border-[#304060]',
                'disabled:opacity-50',
              )}
            />
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              aria-label="Salvar"
            >
              {loading
                ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                : <Check className="h-3.5 w-3.5" />
              }
            </button>
            <button
              onClick={() => { setDraft(value ?? ''); setEditing(false) }}
              disabled={loading}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              aria-label="Cancelar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <p className="text-sm text-foreground dark:text-[#e2e8f0]">
            {value || <span className="italic text-muted-foreground/60">{placeholder ?? '—'}</span>}
          </p>
        )}
      </div>
      {!editing && (
        <button
          onClick={() => { setDraft(value ?? ''); setEditing(true) }}
          className="mt-5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label={`Editar ${label}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

// ── Campo somente-leitura ─────────────────────────────────────────────────────

function CampoLeitura({ label, value, icon }: { label: string; value: string | null | undefined; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-4 border-b border-border/60 last:border-0 dark:border-[#243040]/60">
      {icon && <div className="mt-5 shrink-0 text-muted-foreground/50">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
        <p className="text-sm text-foreground dark:text-[#e2e8f0]">
          {value || <span className="italic text-muted-foreground/60">—</span>}
        </p>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function MeuPerfilPage() {
  const qc    = useQueryClient()
  const toast = useToast()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn:  meApi.buscar,
    staleTime: 60_000,
  })

  const mutation = useMutation({
    mutationFn: meApi.atualizar,
    onSuccess: (updated) => {
      qc.setQueryData(['me'], updated)
      toast.sucesso('Perfil atualizado com sucesso.')
    },
    onError: () => {
      toast.erro('Erro ao salvar. Tente novamente.')
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-destructive text-sm">
        Não foi possível carregar o perfil.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">

      {/* ── Cabeçalho ── */}
      <div>
        <h1 className="text-xl font-bold text-foreground dark:text-[#e2e8f0]">Meu Perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie suas informações pessoais. Nome e telefone podem ser editados.
        </p>
      </div>

      {/* ── Avatar + nome resumo ── */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 dark:bg-[#161d27] dark:border-[#243040]">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-800/30 ring-2 ring-primary/20">
          <User className="h-7 w-7 text-primary dark:text-primary-300" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold text-foreground dark:text-[#e2e8f0] truncate">{data.nome}</p>
          <p className="text-sm text-muted-foreground truncate">{data.email}</p>
          <span className={cn(
            'mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
            data.ativo
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          )}>
            {data.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      {/* ── Dados pessoais ── */}
      <div className="rounded-xl border border-border bg-card px-5 dark:bg-[#161d27] dark:border-[#243040]">
        <p className="pt-4 pb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
          Dados pessoais
        </p>

        <CampoEditavel
          label="Nome"
          value={data.nome}
          placeholder="Seu nome completo"
          onSave={(nome) => mutation.mutateAsync({ nome })}
        />

        <CampoLeitura
          label="E-mail"
          value={data.email}
          icon={<Mail className="h-4 w-4" />}
        />

        <CampoEditavel
          label="Telefone / WhatsApp"
          value={data.telefone}
          placeholder="(00) 00000-0000"
          tipo="tel"
          onSave={(telefone) => mutation.mutateAsync({ telefone })}
        />
      </div>

      {/* ── Conta ── */}
      <div className="rounded-xl border border-border bg-card px-5 dark:bg-[#161d27] dark:border-[#243040]">
        <p className="pt-4 pb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
          Conta
        </p>

        <CampoLeitura
          label="Perfil de acesso"
          value={`${data.perfilDescricao} (${data.perfilCodigo})`}
          icon={<Shield className="h-4 w-4" />}
        />

        <CampoLeitura
          label="Último acesso"
          value={formatarData(data.ultimoAcesso)}
          icon={<Clock className="h-4 w-4" />}
        />

        <CampoLeitura
          label="Membro desde"
          value={formatarData(data.createdAt)}
        />
      </div>
    </div>
  )
}
