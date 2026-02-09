import type { PersonType } from '@/types'

export const PERSON_TYPES: PersonType[] = ['공통', '효진', '호영', '정우']

export const PERSON_COLORS: Record<PersonType, string> = {
  '효진': 'var(--color-hyojin)',
  '호영': 'var(--color-hoyoung)',
  '정우': 'var(--color-jungwoo)',
  '공통': 'var(--color-common)',
}

export const PERSON_EMOJI: Record<PersonType, string> = {
  '효진': '🐻',
  '호영': '🌸',
  '정우': '🧸',
  '공통': '🏠',
}

export const PERSON_BG_CLASSES: Record<PersonType, string> = {
  '효진': 'bg-primary-bg text-primary-dark',
  '호영': 'bg-info/10 text-info',
  '정우': 'bg-warm-bg text-warm-dark',
  '공통': 'bg-accent-bg text-accent-dark',
}

export const CHART_COLORS = [
  '#FF85A2', '#7EB8E4', '#FFB07A', '#7ED4BC',
  '#B8A9E8', '#FFD07A', '#EC4899', '#6366F1',
]

export const DEFAULT_PAGE_SIZE = 20

export const NAV_ITEMS = [
  { label: '대시보드', href: '/dashboard', icon: 'LayoutDashboard' as const },
  { label: '수입 관리', href: '/income', icon: 'TrendingUp' as const },
  { label: '지출 관리', href: '/expenses', icon: 'TrendingDown' as const },
  { label: '거래 내역', href: '/transactions', icon: 'Receipt' as const },
  { label: '카드 업로드', href: '/card-upload', icon: 'Upload' as const },
  { label: '캘린더', href: '/calendar', icon: 'Calendar' as const },
  { label: '저축', href: '/savings', icon: 'PiggyBank' as const },
  { label: '리포트', href: '/reports', icon: 'BarChart3' as const },
  { label: '설정', href: '/settings', icon: 'Settings' as const },
] as const

export const MOBILE_NAV_ITEMS = [
  { label: '홈', href: '/dashboard', icon: 'Home' as const },
  { label: '거래', href: '/transactions', icon: 'Receipt' as const },
  { label: '추가', href: '/transactions/new', icon: 'Plus' as const },
  { label: '리포트', href: '/reports', icon: 'BarChart3' as const },
  { label: '더보기', href: '/more', icon: 'Menu' as const },
] as const
