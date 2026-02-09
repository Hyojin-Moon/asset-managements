'use client'

import { cn } from '@/lib/utils/cn'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      window.addEventListener('keydown', handleEsc)
      return () => window.removeEventListener('keydown', handleEsc)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        className={cn(
          'relative z-10 w-full max-w-md rounded-2xl border-2 border-border bg-surface p-6 shadow-float',
          'animate-in zoom-in-95 fade-in duration-200',
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  )
}
