'use client'

import { cn } from '@/lib/utils/cn'
import { forwardRef, type InputHTMLAttributes } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-foreground/80">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'h-11 w-full rounded-xl border-2 border-border bg-surface px-4 text-sm',
            'placeholder:text-muted-foreground',
            'transition-all duration-200',
            'hover:border-border-hover',
            'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
            error && 'border-error focus:border-error focus:ring-error/20',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-error">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
