import type { Metadata, Viewport } from 'next'
import { Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
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
      </head>
      <body className={`${geistMono.variable} antialiased`}>
        {children}
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
