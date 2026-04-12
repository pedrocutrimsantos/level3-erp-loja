import React from 'react'
import { cn } from '@/shared/utils/cn'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-16 text-center',
        className
      )}
    >
      {icon && (
        <div className="relative">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-2xl bg-primary/5 dark:bg-primary/10 blur-lg scale-150" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-muted border border-border/60 text-muted-foreground dark:bg-[#1c2636] dark:border-[#243040]">
            {icon}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-1.5 max-w-xs">
        <p className="text-sm font-semibold text-foreground dark:text-[#e2e8f0]">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
