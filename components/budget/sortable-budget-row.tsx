'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

interface SortableTableRowProps {
  id: string
  children: ReactNode
}

export function SortableTableRow({ id, children }: SortableTableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <tr ref={setNodeRef} style={style} {...attributes}>
      <td className="py-3 px-1 w-8">
        <button
          {...listeners}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted cursor-grab active:cursor-grabbing transition-colors touch-none"
          aria-label="드래그하여 순서 변경"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      {children}
    </tr>
  )
}

interface SortableMobileCardProps {
  id: string
  children: ReactNode
  className?: string
}

export function SortableMobileCard({ id, children, className }: SortableMobileCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} className={className}>
      <button
        {...listeners}
        className="shrink-0 h-8 w-6 flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing transition-colors touch-none"
        aria-label="드래그하여 순서 변경"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  )
}
