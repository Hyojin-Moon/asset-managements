'use client'

import { cn } from '@/lib/utils/cn'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'accent'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'active:scale-[0.97]',
          // Variants
          variant === 'default' && 'bg-primary text-white hover:bg-primary-dark shadow-soft rounded-xl',
          variant === 'outline' && 'border-2 border-border text-foreground hover:border-primary hover:bg-primary-bg rounded-xl',
          variant === 'ghost' && 'text-foreground hover:bg-muted rounded-xl',
          variant === 'destructive' && 'bg-error text-white hover:bg-error/90 shadow-soft rounded-xl',
          variant === 'secondary' && 'bg-secondary text-white hover:bg-secondary-dark shadow-soft rounded-xl',
          variant === 'accent' && 'bg-accent text-white hover:bg-accent-dark shadow-soft rounded-xl',
          // Sizes
          size === 'sm' && 'h-8 px-3 text-sm gap-1.5 rounded-lg',
          size === 'md' && 'h-10 px-5 text-sm gap-2',
          size === 'lg' && 'h-12 px-6 text-base gap-2',
          size === 'icon' && 'h-10 w-10 rounded-xl',
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export { Button }
