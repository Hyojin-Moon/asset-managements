'use client'

import { useState } from 'react'
import { login } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function LoginPage() {
  const [pending, setPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    setPending(true)
    const result = await login(formData)
    if (result?.error) {
      toast.error(result.error)
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Decorative blobs */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-primary-light/30 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-64 h-64 bg-secondary-light/30 rounded-full blur-3xl" />
      <div className="absolute top-40 right-40 w-48 h-48 bg-accent-light/30 rounded-full blur-3xl" />

      <div className="relative w-full max-w-sm">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary-bg border-2 border-primary-light mb-4">
            <span className="text-4xl">🐷</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">우리 가계부</h1>
          <p className="text-sm text-muted-foreground mt-1">가족 자산관리를 쉽고 귀엽게</p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border-2 border-border bg-surface p-6 shadow-card">
          <form action={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="email"
              name="email"
              type="email"
              label="이메일"
              placeholder="email@example.com"
              required
              autoComplete="email"
            />
            <Input
              id="password"
              name="password"
              type="password"
              label="비밀번호"
              placeholder="비밀번호를 입력하세요"
              required
              autoComplete="current-password"
            />
            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              disabled={pending}
            >
              {pending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  로그인 중...
                </span>
              ) : (
                '로그인'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          가족 전용 서비스입니다
        </p>
      </div>
    </div>
  )
}
