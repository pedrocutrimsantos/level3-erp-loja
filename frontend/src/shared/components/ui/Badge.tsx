import React from 'react'
import { cn } from '@/shared/utils/cn'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'info'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  children: React.ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  default:
    'bg-primary/10 text-primary border border-primary/20 ' +
    'dark:bg-[#1B4332]/40 dark:text-[#4ade80] dark:border-[#4ade80]/20',
  info:
    'bg-blue-50 text-blue-700 border border-blue-200/60 ' +
    'dark:bg-blue-900/25 dark:text-blue-300 dark:border-blue-700/30',
  success:
    'bg-emerald-50 text-emerald-700 border border-emerald-200/60 ' +
    'dark:bg-emerald-900/25 dark:text-[#4ade80] dark:border-emerald-700/30',
  warning:
    'bg-amber-50 text-amber-700 border border-amber-200/60 ' +
    'dark:bg-amber-900/25 dark:text-[#fbbf24] dark:border-amber-700/30',
  destructive:
    'bg-red-50 text-red-700 border border-red-200/60 ' +
    'dark:bg-red-900/25 dark:text-[#f87171] dark:border-red-700/30',
  outline:
    'bg-transparent border border-border text-foreground/80 ' +
    'dark:border-[#243040] dark:text-[#94a3b8]',
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-none',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
