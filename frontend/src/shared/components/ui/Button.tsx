import React from 'react'
import { cn } from '@/shared/utils/cn'

export type ButtonVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    'bg-primary text-primary-foreground shadow-sm ' +
    'hover:bg-primary-800 hover:shadow-md active:shadow-sm ' +
    'focus-visible:ring-primary',

  secondary:
    'bg-secondary text-secondary-foreground shadow-sm ' +
    'hover:bg-secondary-600 hover:shadow-md active:shadow-sm ' +
    'focus-visible:ring-secondary',

  destructive:
    'bg-destructive text-destructive-foreground shadow-sm ' +
    'hover:bg-destructive/90 hover:shadow-md active:shadow-sm ' +
    'focus-visible:ring-destructive',

  outline:
    'border border-border bg-card text-foreground shadow-sm ' +
    'hover:bg-muted hover:shadow-md active:shadow-sm ' +
    'dark:bg-transparent dark:border-[#243040] dark:text-[#e2e8f0] dark:hover:bg-[#243040] ' +
    'focus-visible:ring-ring',

  ghost:
    'bg-transparent text-foreground ' +
    'hover:bg-muted active:bg-muted/80 ' +
    'dark:text-[#94a3b8] dark:hover:bg-[#243040] dark:hover:text-[#e2e8f0] ' +
    'focus-visible:ring-ring',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-10 px-5 text-sm gap-2',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', loading = false, disabled, className, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-3.5 w-3.5 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
