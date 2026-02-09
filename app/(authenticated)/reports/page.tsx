import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { BarChart3, TrendingUp, CalendarDays } from 'lucide-react'

const reportLinks = [
  {
    title: '월간 리포트',
    description: '이번 달 수입/지출 현황, 예산 대비 실적, 카테고리별 분석',
    href: '/reports/monthly',
    icon: BarChart3,
    color: 'bg-primary-bg text-primary-dark',
    iconBg: 'bg-primary/10',
  },
  {
    title: '분기 리포트',
    description: '3개월간 수입/지출 추이, 월별 비교, 카테고리 트렌드',
    href: '/reports/quarterly',
    icon: TrendingUp,
    color: 'bg-accent-bg text-accent-dark',
    iconBg: 'bg-accent/10',
  },
  {
    title: '연간 리포트',
    description: '12개월 추이, 연간 저축률, 카테고리/개인별 합계',
    href: '/reports/yearly',
    icon: CalendarDays,
    color: 'bg-secondary-bg text-secondary-dark',
    iconBg: 'bg-secondary/10',
  },
]

export default function ReportsPage() {
  return (
    <div>
      <Header title="리포트" description="기간별 자산 현황을 분석해보세요" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {reportLinks.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card hover className="h-full">
              <CardContent>
                <div className={`h-12 w-12 rounded-2xl ${item.iconBg} flex items-center justify-center mb-4`}>
                  <item.icon className={`h-6 w-6 ${item.color.split(' ')[1]}`} />
                </div>
                <h2 className="text-base font-bold text-foreground mb-1">{item.title}</h2>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
