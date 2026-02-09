import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-secondary-bg flex items-center justify-center">
          <SearchX className="h-10 w-10 text-secondary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          페이지를 찾을 수 없어요
        </h1>
        <p className="text-muted-foreground mb-6">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <Link href="/dashboard">
          <Button>홈으로 이동</Button>
        </Link>
      </div>
    </div>
  )
}
