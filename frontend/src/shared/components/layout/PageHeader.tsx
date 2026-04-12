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
        'mb-5 pb-4 border-b border-border/70 dark:border-[#243040]/80',
        'md:mb-6 md:pb-5',
        className,
      )}
    >
      {/* Linha principal: título + ações (desktop inline / mobile empilhado) */}
      <div className="flex flex-wrap items-start justify-between gap-2 md:gap-4">
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[1.1rem] md:text-[1.375rem] font-bold text-foreground dark:text-[#e2e8f0] tracking-tight leading-tight">
              {title}
            </h1>
            {badge && <div className="flex items-center gap-1.5">{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-[13px] md:text-sm text-muted-foreground dark:text-[#94a3b8] leading-snug">
              {subtitle}
            </p>
          )}
        </div>

        {/* Ações — visíveis inline no desktop */}
        {actions && (
          <div className="hidden md:flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>

      {/* Ações — abaixo do título no mobile */}
      {actions && (
        <div className="flex md:hidden items-center gap-2 mt-3 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  )
}
