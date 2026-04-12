import React from 'react'
import { cn } from '@/shared/utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 dark:text-[#94a3b8]/80"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-lg border bg-card px-3 py-2',
              'text-sm text-foreground placeholder:text-muted-foreground/50',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40',
              'hover:border-border/80',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/40',
              'dark:bg-[#0d1117] dark:text-[#e2e8f0] dark:placeholder:text-[#94a3b8]/60',
              'dark:border-[#243040] dark:hover:border-[#2d3f54]',
              'dark:focus:ring-[#4ade80]/15 dark:focus:border-[#4ade80]/35',
              leftIcon && 'pl-9',
              error
                ? 'border-destructive/60 focus:ring-destructive/20 focus:border-destructive/60'
                : 'border-border',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="flex items-center gap-1 text-xs text-destructive dark:text-[#f87171]">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
