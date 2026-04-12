import React from 'react'
import { cn } from '@/shared/utils/cn'
import { Card, CardContent } from '@/shared/components/ui/Card'

// ── FormGrid ──────────────────────────────────────────────────────────────────
/**
 * Grid responsivo para campos de formulário.
 *
 * cols=2  →  1 col mobile  |  2 cols sm+
 * cols=3  →  1 col mobile  |  2 cols sm  |  3 cols lg+
 * cols=4  →  1 col mobile  |  2 cols sm  |  4 cols lg+
 *
 * Use `col-span-2 / col-span-3` nos filhos para campos que ocupam mais espaço.
 */
export type ColCount = 2 | 3 | 4

const GRID_COLS: Record<ColCount, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}

interface FormGridProps {
  cols?: ColCount
  className?: string
  children: React.ReactNode
}

export function FormGrid({ cols = 2, className, children }: FormGridProps) {
  return (
    <div className={cn('grid gap-4', GRID_COLS[cols], className)}>
      {children}
    </div>
  )
}

// ── FormSection ───────────────────────────────────────────────────────────────
/**
 * Card com título de seção e badge opcional.
 * Substitui o padrão repetido:
 *   <Card><CardContent><p className="mb-4 text-sm font-semibold">...</p>...</CardContent></Card>
 */
interface FormSectionProps {
  title: string
  description?: string
  badge?: React.ReactNode
  /** Padding do CardContent — default "p-5" */
  padding?: string
  className?: string
  children: React.ReactNode
}

export function FormSection({
  title,
  description,
  badge,
  padding = 'p-5',
  className,
  children,
}: FormSectionProps) {
  return (
    <Card className={className}>
      <CardContent className={padding}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground dark:text-[#e2e8f0]">{title}</p>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

// ── FilterBar ─────────────────────────────────────────────────────────────────
/**
 * Barra de filtros padronizada para páginas de listagem.
 * Agrupa campos de busca, selects, date pickers e botões de ação.
 */
interface FilterBarProps {
  className?: string
  children: React.ReactNode
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-3',
        'rounded-xl border border-border bg-muted/30',
        'dark:bg-[#161d27]/50 dark:border-[#243040]',
        'px-4 py-3',
        className
      )}
    >
      {children}
    </div>
  )
}

// ── FilterField ───────────────────────────────────────────────────────────────
/**
 * Campo de filtro com label. Wrapper leve para padronizar o label acima dos inputs.
 */
interface FilterFieldProps {
  label: string
  className?: string
  children: React.ReactNode
}

export function FilterField({ label, className, children }: FilterFieldProps) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

// ── TwoColLayout ──────────────────────────────────────────────────────────────
/**
 * Layout de duas colunas em telas xl+: conteúdo principal (fluido) + sidebar (400px).
 * Em telas menores, empilha as colunas verticalmente.
 *
 * Uso:
 *   <TwoColLayout>
 *     <div>conteúdo principal</div>
 *     <div>sidebar / configuração</div>
 *   </TwoColLayout>
 *
 * stickyRight=true → sidebar fica sticky ao scrollar a coluna esquerda.
 */
interface TwoColLayoutProps {
  /** Largura fixa da coluna direita (padrão 400px) */
  sidebarWidth?: string
  /** Torna a coluna direita sticky no scroll (padrão true) */
  stickyRight?: boolean
  className?: string
  children: [React.ReactNode, React.ReactNode]
}

export function TwoColLayout({
  sidebarWidth = '400px',
  stickyRight = true,
  className,
  children,
}: TwoColLayoutProps) {
  const [main, sidebar] = children
  return (
    <div
      className={cn(
        'xl:grid xl:gap-6 xl:items-start',
        'space-y-4 xl:space-y-0',
        className
      )}
      style={
        {
          '--sidebar-w': sidebarWidth,
          gridTemplateColumns: `1fr var(--sidebar-w)`,
        } as React.CSSProperties
      }
    >
      <div className="min-w-0 space-y-4">{main}</div>
      <div className={stickyRight ? 'xl:sticky xl:top-6' : undefined}>{sidebar}</div>
    </div>
  )
}

// ── DetailGrid ────────────────────────────────────────────────────────────────
/**
 * Grid assimétrico para páginas de detalhe de entidade.
 * Coluna principal (3fr ≈ 60%) para dados, dimensões, precificação.
 * Coluna lateral (2fr ≈ 40%) para saldo, status e histórico.
 *
 * Em mobile e tablet empilha verticalmente (coluna principal primeiro).
 */
interface DetailGridProps {
  className?: string
  children: [React.ReactNode, React.ReactNode]
}

export function DetailGrid({ children, className }: DetailGridProps) {
  const [main, aside] = children
  return (
    <div
      className={cn('grid gap-6 lg:grid-cols-[3fr_2fr] items-start', className)}
    >
      <div className="min-w-0 flex flex-col gap-6">{main}</div>
      <div className="flex flex-col gap-6">{aside}</div>
    </div>
  )
}

// ── SectionDivider ────────────────────────────────────────────────────────────
/**
 * Separador visual entre seções de uma página.
 * Útil para páginas longas que não usam cards, mas precisam de hierarquia.
 */
interface SectionDividerProps {
  title: string
  className?: string
}

export function SectionDivider({ title, className }: SectionDividerProps) {
  return (
    <div className={cn('flex items-center gap-3 py-1', className)}>
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </span>
      <div className="flex-1 h-px bg-border dark:bg-[#243040]" />
    </div>
  )
}
