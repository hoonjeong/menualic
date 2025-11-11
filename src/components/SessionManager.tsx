'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { handleLogout, getRememberMe } from '@/lib/auth-utils'

// 세션 체크를 하지 않을 공개 경로 목록
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/share',
]

/**
 * 현재 경로가 공개 경로인지 확인
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    if (route === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(route)
  })
}

/**
 * 세션 관리 컴포넌트
 * - 로그인 상태 유지 옵션에 따라 세션을 관리
 * - rememberMe가 false면 브라우저 종료 시 로그아웃되도록 처리
 * - 공개 페이지에서는 세션 체크를 하지 않음
 */
export default function SessionManager() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentPath, setCurrentPath] = useState<string>('')

  useEffect(() => {
    // 클라이언트에서만 pathname 설정
    setCurrentPath(window.location.pathname)
  }, [])

  useEffect(() => {
    // 인증되지 않은 상태면 체크 불필요
    if (status !== 'authenticated') {
      return
    }

    // pathname이 아직 설정되지 않았으면 대기
    if (!currentPath) {
      return
    }

    // 공개 경로인 경우 세션 체크를 하지 않음
    if (isPublicRoute(currentPath)) {
      return
    }

    // rememberMe 상태 확인
    const rememberMe = getRememberMe()

    // 먼저 sessionStorage에 활성 표시 (타이밍 문제 방지)
    sessionStorage.setItem('sessionActive', 'true')

    if (!rememberMe) {
      // 로그인 상태 유지가 비활성화된 경우
      // 새 탭에서 열었는지 확인하기 위해 localStorage 사용
      const wasLoggedIn = localStorage.getItem('wasLoggedIn')

      if (!wasLoggedIn) {
        // 첫 로그인 시 플래그 설정
        localStorage.setItem('wasLoggedIn', 'true')
      }
    }

    // 브라우저 종료 감지를 위한 이벤트 리스너
    // rememberMe가 false일 때만 브라우저 종료 시 로그아웃
    const handleBeforeUnload = () => {
      if (!getRememberMe()) {
        // 브라우저 종료 시 localStorage 플래그 삭제
        localStorage.removeItem('wasLoggedIn')
      }
    }

    // pagehide 이벤트도 함께 사용 (모바일 대응)
    const handlePageHide = () => {
      if (!getRememberMe()) {
        localStorage.removeItem('wasLoggedIn')
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [status, router, currentPath])

  // 이 컴포넌트는 UI를 렌더링하지 않음
  return null
}
