'use client'

import { useEffect } from 'react'

export function ServiceWorkerCleanup() {
  useEffect(() => {
    async function cleanup() {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(
          registrations.map((registration) => registration.unregister())
        )
      }

      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames
            .filter((name) => name.startsWith('gaegyebu'))
            .map((name) => caches.delete(name))
        )
      }
    }

    void cleanup().catch(() => {
      // 기존 PWA 정리 실패는 일반 웹 사용에 영향을 주지 않으므로 무시합니다.
    })
  }, [])

  return null
}
