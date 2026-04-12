import React from 'react'
import { cn } from '@/shared/utils/cn'

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl bg-card text-card-foreground',
        'shadow-card transition-shadow duration-200',
        'dark:bg-[#161d27] dark:text-[#e2e8f0]',
        'dark:shadow-none dark:border dark:border-[#243040]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-1 p-5 pb-0', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-sm font-semibold text-foreground/90 dark:text-[#e2e8f0]/90 tracking-tight',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-5 py-4',
        'border-t border-border/60 dark:border-[#243040]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
