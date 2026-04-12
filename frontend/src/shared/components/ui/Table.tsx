import React from 'react'
import { cn } from '@/shared/utils/cn'

export function Table({ className, children, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto rounded-xl border border-border bg-card dark:bg-[#161d27] dark:border-[#243040]">
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
        className
      )}
      {...props}
    >
      {children}
    </thead>
  )
}

export function TableBody({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('[&_tr:last-child]:border-0 divide-y divide-border/50 dark:divide-[#243040]/70', className)} {...props}>
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
        className
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
        'h-11 px-4 text-left align-middle',
        'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80',
        'dark:text-[#94a3b8]/90',
        className
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
        className
      )}
      {...props}
    >
      {children}
    </td>
  )
}
