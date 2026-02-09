'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import {
  TrendingUp, TrendingDown, Upload, Calendar, PiggyBank,
  Settings, LogOut, ChevronRight, Loader2
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PERSON_BG_CLASSES } from '@/lib/utils/constants'
import { logout } from '@/lib/actions/auth'
import type { PersonType } from '@/types'

const MORE_ITEMS = [
  { label: '수입 관리', href: '/income', icon: TrendingUp, color: 'text-income' },
  { label: '지출 관리', href: '/expenses', icon: TrendingDown, color: 'text-expense' },
  { label: '카드 업로드', href: '/card-upload', icon: Upload, color: 'text-secondary' },
  { label: '캘린더', href: '/calendar', icon: Calendar, color: 'text-info' },
  { label: '저축', href: '/savings', icon: PiggyBank, color: 'text-savings' },
  { label: '설정', href: '/settings', icon: Settings, color: 'text-muted-foreground' },
] as const

interface Props {
  displayName: string
  personType: PersonType
  personEmoji: string
}

export function MoreClient({ displayName, personType, personEmoji }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      await logout()
    })
  }

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary-bg flex items-center justify-center text-xl">
            {personEmoji}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">{displayName}</p>
            <Badge className={PERSON_BG_CLASSES[personType]}>{personType}</Badge>
          </div>
        </div>
      </Card>

      {/* Menu items */}
      <Card className="p-0 overflow-hidden">
        {MORE_ITEMS.map((item, idx) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors active:bg-muted ${
              idx !== MORE_ITEMS.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            <item.icon className={`h-5 w-5 ${item.color}`} />
            <span className="flex-1 text-sm font-medium">{item.label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </Card>

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-border text-error hover:bg-error/5 transition-colors text-sm font-medium"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        로그아웃
      </button>
    </div>
  )
}
