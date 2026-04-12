import React from 'react'
import { cn } from '@/shared/utils/cn'

// ── Table (desktop) ───────────────────────────────────────────────────────────

export function Table({ className, children, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border bg-card dark:bg-[#161d27] dark:border-[#243040] -webkit-overflow-scrolling-touch">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        'border-b-2 border-border/70 bg-muted/40 [&_tr]:border-0',
        'dark:bg-[#161d27] dark:border-[#243040]',
        className,
      )}
      {...props}
    >
      {children}
    </thead>
  )
}

export function TableBody({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn(
        '[&_tr:last-child]:border-0 divide-y divide-border/50 dark:divide-[#243040]/70',
        className,
      )}
      {...props}
    >
      {children}
    </tbody>
  )
}

export function TableRow({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'transition-colors duration-100',
        'hover:bg-primary/[0.03] dark:hover:bg-[#1c2636]/70',
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

export function TableHead({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-11 px-4 text-left align-middle whitespace-nowrap',
        'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80',
        'dark:text-[#94a3b8]/90',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  )
}

export function TableCell({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        'px-4 py-3.5 align-middle text-foreground dark:text-[#e2e8f0]',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  )
}

// ── MobileCardList ────────────────────────────────────────────────────────────
// Padrão para listagens mobile: renderiza cards ao invés de tabela.
// Uso: coloque dentro do bloco de listagem, visível apenas em mobile.
//
// Exemplo:
//   <Table>...</Table>                    ← visível no desktop (md:block)
//   <MobileCardList>                      ← visível no mobile
//     {items.map(item => (
//       <MobileCard key={item.id} onClick={...}>
//         <MobileCardRow label="Nome" value={item.nome} primary />
//         <MobileCardRow label="Status" value={<Badge>...</Badge>} />
//         <MobileCardActions>
//           <Button size="sm">Ver</Button>
//         </MobileCardActions>
//       </MobileCard>
//     ))}
//   </MobileCardList>

export function MobileCardList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2 md:hidden', className)}>
      {children}
    </div>
  )
}

export function MobileCard({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'rounded-xl border border-border bg-card dark:bg-[#161d27] dark:border-[#243040]',
        'px-4 py-3.5',
        onClick && 'cursor-pointer active:bg-muted/60 dark:active:bg-[#1c2636]/80 transition-colors',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function MobileCardRow({
  label,
  value,
  primary,
  className,
}: {
  label: string
  value: React.ReactNode
  /** Se true, o valor é exibido em destaque (texto maior, bold) */
  primary?: boolean
  className?: string
}) {
  if (primary) {
    return (
      <div className={cn('mb-2', className)}>
        <p className="text-[13px] font-semibold text-foreground dark:text-[#e2e8f0] leading-snug">
          {value}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center justify-between gap-3 py-1 border-t border-border/40 dark:border-[#243040]/50', className)}>
      <span className="text-[11px] font-medium text-muted-foreground shrink-0">{label}</span>
      <span className="text-[12px] text-foreground dark:text-[#e2e8f0] text-right min-w-0">{value}</span>
    </div>
  )
}

export function MobileCardActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-border/40 dark:border-[#243040]/50', className)}>
      {children}
    </div>
  )
}
