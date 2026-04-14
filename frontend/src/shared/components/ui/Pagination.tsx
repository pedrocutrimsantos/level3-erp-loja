import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Gera a sequência de páginas visíveis com reticências representadas por -1 */
function gerarSequencia(page: number, totalPages: number): (number | -1)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const delta = 1 // vizinhos ao redor da página atual
  const left  = page - delta
  const right = page + delta

  const pages: (number | -1)[] = [1]

  if (left > 2) pages.push(-1)
  for (let i = Math.max(2, left); i <= Math.min(totalPages - 1, right); i++) {
    pages.push(i)
  }
  if (right < totalPages - 1) pages.push(-1)

  pages.push(totalPages)
  return pages
}

// ── Componente ────────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number
  totalPages: number
  totalItems: number
  perPage: number
  onPageChange: (p: number) => void
  onPerPageChange?: (n: number) => void
  perPageOptions?: number[]
  className?: string
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 20, 50],
  className,
}: PaginationProps) {
  if (totalItems === 0) return null

  const inicio = (page - 1) * perPage + 1
  const fim    = Math.min(page * perPage, totalItems)

  const sequencia = gerarSequencia(page, totalPages)

  return (
    <div className={cn(
      'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
      'px-1 py-3 text-sm text-muted-foreground',
      className,
    )}>

      {/* ── Legenda de itens ── */}
      <p className="text-xs text-muted-foreground shrink-0">
        Mostrando <span className="font-medium text-foreground">{inicio}–{fim}</span> de{' '}
        <span className="font-medium text-foreground">{totalItems}</span> itens
      </p>

      {/* ── Controles ── */}
      <div className="flex items-center gap-3 flex-wrap">

        {/* Itens por página */}
        {onPerPageChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs whitespace-nowrap">Por página:</span>
            <select
              value={perPage}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className={cn(
                'h-7 rounded-md border border-border bg-background px-2 text-xs',
                'text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40',
                'dark:bg-[#0d1117] dark:border-[#243040]',
              )}
            >
              {perPageOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        )}

        {/* Navegação de páginas */}
        {totalPages > 1 && (
          <div className="flex items-center gap-0.5">
            {/* Anterior */}
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'hover:bg-muted dark:hover:bg-[#1c2636]',
              )}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {/* Páginas */}
            {sequencia.map((p, i) =>
              p === -1 ? (
                <span key={`ellipsis-${i}`} className="flex h-7 w-7 items-center justify-center text-xs text-muted-foreground/60">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={cn(
                    'flex h-7 min-w-[28px] items-center justify-center rounded-md px-1 text-xs font-medium transition-colors',
                    p === page
                      ? 'bg-primary text-primary-foreground dark:bg-[#4ade80] dark:text-[#0d1117]'
                      : 'hover:bg-muted dark:hover:bg-[#1c2636] text-foreground',
                  )}
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </button>
              )
            )}

            {/* Próxima */}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'hover:bg-muted dark:hover:bg-[#1c2636]',
              )}
              aria-label="Próxima página"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
