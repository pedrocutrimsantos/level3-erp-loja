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
  // Fundo verde marca — legível em ambos os temas
  default:
    'bg-primary text-primary-foreground hover:bg-primary-800 focus-visible:ring-primary',

  // Fundo dourado — legível em ambos os temas
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary-600 focus-visible:ring-secondary',

  // Fundo vermelho — legível em ambos os temas
  destructive:
    'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive',

  // Borda visível; texto usa foreground (adapta ao tema)
  outline:
    'border border-border bg-transparent text-foreground ' +
    'hover:bg-accent hover:text-accent-foreground ' +
    'focus-visible:ring-ring',

  // Sem borda; texto usa foreground (adapta ao tema)
  ghost:
    'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground ' +
    'focus-visible:ring-ring',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-base gap-2',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', loading = false, disabled, className, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
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
          className="animate-spin h-4 w-4 shrink-0"
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
