'use client'

import { cn } from '@/lib/utils/cn'
import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, placeholder, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-foreground/80">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            className={cn(
              'h-11 w-full appearance-none rounded-xl border-2 border-border bg-surface px-4 pr-10 text-sm',
              'transition-all duration-200',
              'hover:border-border-hover',
              'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
              error && 'border-error focus:border-error focus:ring-error/20',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="">{placeholder}</option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
        {error && (
          <p className="text-xs text-error">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export { Select }
