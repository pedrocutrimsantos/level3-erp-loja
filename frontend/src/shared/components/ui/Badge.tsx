import React from 'react'
import { cn } from '@/shared/utils/cn'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  children: React.ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  default:
    'bg-primary/10 text-primary border-transparent dark:bg-[#243040] dark:text-[#4ade80] dark:border-[#243040]',
  success:
    'bg-success/10 text-success border-transparent dark:bg-[#4ade80]/15 dark:text-[#4ade80]',
  warning:
    'bg-warning/10 text-warning border-transparent dark:bg-[#fbbf24]/15 dark:text-[#fbbf24]',
  destructive:
    'bg-destructive/10 text-destructive border-transparent dark:bg-[#f87171]/15 dark:text-[#f87171]',
  outline:
    'bg-transparent text-foreground border-border dark:text-[#e2e8f0] dark:border-[#243040]',
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
