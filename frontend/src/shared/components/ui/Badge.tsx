import React from 'react'
import { cn } from '@/shared/utils/cn'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'info'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  children: React.ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  default:
    'bg-primary/10 text-primary dark:bg-[#1B4332]/40 dark:text-[#4ade80]',
  info:
    'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  success:
    'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-[#4ade80]',
  warning:
    'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-[#fbbf24]',
  destructive:
    'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-[#f87171]',
  outline:
    'bg-transparent border border-border text-foreground dark:border-[#243040] dark:text-[#e2e8f0]',
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
