import type { Metadata, Viewport } from 'next'
import { Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { PWARegister } from '@/components/pwa-register'
import './globals.css'

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: '우리 가계부',
  description: '우리 가족 자산관리 앱',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '우리 가계부',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF85A2" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${geistMono.variable} antialiased`}>
        {children}
        <PWARegister />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              borderRadius: '1rem',
              border: '2px solid var(--color-border)',
              boxShadow: 'var(--shadow-card)',
            },
          }}
        />
      </body>
    </html>
  )
}
