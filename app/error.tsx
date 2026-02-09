'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-error/10 flex items-center justify-center">
          <AlertTriangle className="h-10 w-10 text-error" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          문제가 발생했어요
        </h1>
        <p className="text-muted-foreground mb-6">
          예상치 못한 오류가 발생했습니다. 다시 시도해 주세요.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
            홈으로 이동
          </Button>
          <Button onClick={reset}>
            다시 시도
          </Button>
        </div>
      </div>
    </div>
  )
}
