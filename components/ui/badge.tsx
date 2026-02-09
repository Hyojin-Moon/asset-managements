import { cn } from '@/lib/utils/cn'
import type { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'income' | 'expense' | 'person'
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-muted text-muted-foreground',
        variant === 'income' && 'bg-accent-bg text-accent-dark',
        variant === 'expense' && 'bg-primary-bg text-primary-dark',
        variant === 'person' && 'bg-secondary-bg text-secondary-dark',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
