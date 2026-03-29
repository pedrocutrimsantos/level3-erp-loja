import React from 'react'
import { cn } from '@/shared/utils/cn'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6 flex items-start justify-between gap-4', className)}>
      <div className="flex flex-col gap-0.5">
        <h1 className="text-2xl font-bold text-foreground dark:text-[#e2e8f0]">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground dark:text-[#94a3b8]">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  )
}
