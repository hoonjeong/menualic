'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { handleLogout, getRememberMe } from '@/lib/auth-utils'

// 세션 체크를 하지 않을 공개 경로 목록
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/share',
]

/**
 * 세션 관리 컴포넌트
 * - 로그인 상태 유지 옵션에 따라 세션을 관리
 * - rememberMe가 false면 브라우저 종료 시 로그아웃되도록 처리
 * - 공개 페이지에서는 세션 체크를 하지 않음
 */
export default function SessionManager() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // 인증되지 않은 상태면 체크 불필요
    if (status !== 'authenticated') {
      return
    }

    // 공개 경로인 경우 세션 체크를 하지 않음
    const isPublicRoute = PUBLIC_ROUTES.some(route => {
      if (route === '/') {
        return pathname === '/'
      }
      return pathname.startsWith(route)
    })

    if (isPublicRoute) {
      return
    }

    // rememberMe 상태 확인
    const rememberMe = getRememberMe()

    if (!rememberMe) {
      // 로그인 상태 유지가 비활성화된 경우
      // sessionStorage를 사용하여 브라우저 세션 동안만 유효하도록 설정
      const sessionActive = sessionStorage.getItem('sessionActive')

      if (!sessionActive) {
        // sessionStorage가 없으면 브라우저를 새로 열었다는 의미
        // 자동 로그아웃 처리
        handleLogout({ callbackUrl: '/login' })
      } else {
        // sessionStorage에 활성 표시
        sessionStorage.setItem('sessionActive', 'true')
      }
    } else {
      // rememberMe가 true인 경우 sessionStorage에 활성 표시
      sessionStorage.setItem('sessionActive', 'true')
    }

    // 브라우저 종료 감지를 위한 이벤트 리스너
    const handleBeforeUnload = () => {
      if (!getRememberMe()) {
        // 로그인 상태 유지가 비활성화된 경우 sessionStorage 삭제
        sessionStorage.removeItem('sessionActive')
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [status, router, pathname])

  // 이 컴포넌트는 UI를 렌더링하지 않음
  return null
}
