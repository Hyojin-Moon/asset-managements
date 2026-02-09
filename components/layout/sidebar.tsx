'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { NAV_ITEMS } from '@/lib/utils/constants'
import {
  LayoutDashboard, TrendingUp, TrendingDown, Receipt,
  Upload, Calendar, PiggyBank, BarChart3, Settings, LogOut,
} from 'lucide-react'
import { logout } from '@/lib/actions/auth'

const ICON_MAP = {
  LayoutDashboard, TrendingUp, TrendingDown, Receipt,
  Upload, Calendar, PiggyBank, BarChart3, Settings,
} as const

interface SidebarProps {
  displayName?: string
  personEmoji?: string
}

export function Sidebar({ displayName, personEmoji }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-60 h-screen fixed left-0 top-0 border-r-2 border-border bg-surface z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b-2 border-border">
        <div className="h-10 w-10 rounded-2xl bg-primary-bg border-2 border-primary-light flex items-center justify-center text-xl">
          🐷
        </div>
        <div>
          <h1 className="font-bold text-foreground text-base">우리 가계부</h1>
          <p className="text-xs text-muted-foreground">가족 자산관리</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon]
          const isActive = pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary-bg text-primary-dark border-2 border-primary-light shadow-soft'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground border-2 border-transparent'
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User / Logout */}
      <div className="px-3 py-4 border-t-2 border-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <span className="text-lg">{personEmoji || '🌸'}</span>
          <span className="text-sm font-medium text-foreground">{displayName || '사용자'}</span>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-error/10 hover:text-error transition-all duration-200 w-full border-2 border-transparent"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span>로그아웃</span>
          </button>
        </form>
      </div>
    </aside>
  )
}
