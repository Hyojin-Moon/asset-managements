'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { MOBILE_NAV_ITEMS } from '@/lib/utils/constants'
import { Home, Receipt, Plus, BarChart3, Menu } from 'lucide-react'

const ICON_MAP = { Home, Receipt, Plus, BarChart3, Menu } as const

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t-2 border-border bg-surface/95 backdrop-blur-md safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon]
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : item.href === '/more'
                ? pathname === '/more' || ['/income', '/expenses', '/card-upload', '/calendar', '/savings', '/settings'].some(p => pathname.startsWith(p))
                : pathname.startsWith(item.href)
          const isAdd = item.icon === 'Plus'

          if (isAdd) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-center -mt-5"
              >
                <div className="h-14 w-14 rounded-2xl bg-primary text-white shadow-soft flex items-center justify-center transition-all duration-200 active:scale-95 hover:bg-primary-dark">
                  <Plus className="h-7 w-7" />
                </div>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
