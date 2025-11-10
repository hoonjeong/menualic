import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { Suspense } from 'react'
import SessionProvider from '@/components/providers/SessionProvider'
import SessionManager from '@/components/SessionManager'
import InactivityLogout from '@/components/InactivityLogout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Menualic - 팀 협업 메뉴얼 작성 플랫폼',
  description: '드래그앤드롭으로 쉽게 작성하고, 계층 구조로 체계적으로 관리하는 메뉴얼 서비스',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <SessionProvider>
          <Suspense fallback={null}>
            <SessionManager />
            <InactivityLogout />
          </Suspense>
          {children}
        </SessionProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
