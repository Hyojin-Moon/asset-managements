'use client'

import type { ReactNode } from 'react'

interface HeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function Header({ title, description, action }: HeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
