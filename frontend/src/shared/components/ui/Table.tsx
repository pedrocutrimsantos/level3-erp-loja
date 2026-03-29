import React from 'react'
import { cn } from '@/shared/utils/cn'

export function Table({ className, children, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto rounded-lg border border-border bg-card dark:bg-[#161d27] dark:border-[#243040]">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('border-b border-border bg-muted/60 [&_tr]:border-0 dark:bg-[#1c2636] dark:border-[#243040]', className)} {...props}>
      {children}
    </thead>
  )
}

export function TableBody({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-b border-border transition-colors',
        'hover:bg-muted/40 dark:hover:bg-[#1c2636]',
        'even:bg-muted/20 dark:even:bg-[#0d1117]/40',
        'dark:border-[#243040]',
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
      className={cn('h-10 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-[#94a3b8]', className)}
      {...props}
    >
      {children}
    </th>
  )
}

export function TableCell({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-3 align-middle text-foreground dark:text-[#e2e8f0]', className)} {...props}>
      {children}
    </td>
  )
}
