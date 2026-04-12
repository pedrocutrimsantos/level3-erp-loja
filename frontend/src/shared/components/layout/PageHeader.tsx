import React from 'react'
import { cn } from '@/shared/utils/cn'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Badge(s) exibidos ao lado do título — ideal para status, tipo, etc. */
  badge?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, badge, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-wrap items-start justify-between gap-4',
        'pb-5 border-b border-border/70 dark:border-[#243040]/80',
        className,
      )}
    >
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[1.375rem] font-bold text-foreground dark:text-[#e2e8f0] tracking-tight leading-none">
            {title}
          </h1>
          {badge && <div className="flex items-center gap-1.5">{badge}</div>}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground dark:text-[#94a3b8] leading-snug">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  )
}
