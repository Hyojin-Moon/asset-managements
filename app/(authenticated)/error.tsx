'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center p-8">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-error/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-error" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          오류가 발생했어요
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          데이터를 불러오는 중 문제가 발생했습니다.<br />
          잠시 후 다시 시도해 주세요.
        </p>
        <Button onClick={reset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          다시 시도
        </Button>
      </Card>
    </div>
  )
}
