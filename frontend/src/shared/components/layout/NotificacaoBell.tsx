import React, { useRef, useEffect, useState } from 'react'
import { Bell, AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/shared/utils/cn'
import { notificacoesApi, type NotificacaoItem } from '@/shared/api/notificacoes'

// ── Helpers ───────────────────────────────────────────────────────────────────

function iconeSeveridade(s: NotificacaoItem['severidade']) {
  if (s === 'CRITICA') return <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
  if (s === 'ALERTA')  return <AlertCircle   className="h-4 w-4 text-yellow-500 shrink-0" />
  return                      <Info          className="h-4 w-4 text-blue-400 shrink-0" />
}

function corBorda(s: NotificacaoItem['severidade']) {
  if (s === 'CRITICA') return 'border-l-red-400'
  if (s === 'ALERTA')  return 'border-l-yellow-400'
  return                      'border-l-blue-300'
}

// ── Componente principal ──────────────────────────────────────────────────────

export function NotificacaoBell() {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)
  const navigate        = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['notificacoes'],
    queryFn:  notificacoesApi.listar,
    refetchInterval: 5 * 60 * 1000,   // recarrega a cada 5 min
    staleTime:       60 * 1000,
  })

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const total    = data?.total    ?? 0
  const criticas = data?.criticas ?? 0
  const badgeNum = total > 9 ? '9+' : String(total)

  function handleClickItem(link: string) {
    setOpen(false)
    navigate(link)
  }

  return (
    <div className="relative" ref={ref}>
      {/* ── Botão sino ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative rounded-lg p-2 transition-colors',
          open
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
        aria-label={`Notificações${total > 0 ? ` (${total})` : ''}`}
      >
        <Bell className="h-4 w-4" />
        {total > 0 && (
          <span className={cn(
            'absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center',
            'rounded-full px-1 text-[9px] font-bold text-white leading-none',
            criticas > 0 ? 'bg-red-500' : 'bg-yellow-500',
          )}>
            {badgeNum}
          </span>
        )}
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className={cn(
          'absolute right-0 top-full mt-2 z-50',
          'w-80 rounded-xl border border-border bg-card shadow-xl',
          'dark:bg-[#161d27] dark:border-[#243040]',
          'overflow-hidden',
        )}>
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 dark:border-[#243040]">
            <h3 className="text-sm font-semibold text-foreground">Alertas</h3>
            {total > 0 && (
              <span className="text-xs text-muted-foreground">{total} pendente{total !== 1 ? 's' : ''}</span>
            )}
          </div>

          {/* Conteúdo */}
          <div className="max-h-[420px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : !data || data.itens.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">Tudo em dia!</p>
                <p className="text-xs text-muted-foreground/60">Nenhum alerta pendente no momento.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border dark:divide-[#243040]">
                {data.itens.map((item, i) => (
                  <li key={i}>
                    <button
                      onClick={() => handleClickItem(item.link)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3 text-left',
                        'border-l-2',
                        corBorda(item.severidade),
                        'hover:bg-muted/60 dark:hover:bg-[#1c2636] transition-colors',
                      )}
                    >
                      <div className="mt-0.5">{iconeSeveridade(item.severidade)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-tight">
                          {item.titulo}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          {item.descricao}
                        </p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Rodapé */}
          {data && data.itens.length > 0 && (
            <div className="border-t border-border px-4 py-2.5 dark:border-[#243040]">
              <p className="text-[10px] text-muted-foreground/50 text-center">
                Atualiza automaticamente a cada 5 minutos
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
