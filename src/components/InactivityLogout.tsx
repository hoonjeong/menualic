'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { handleLogout, getRememberMe } from '@/lib/auth-utils'

/**
 * 비활동 시 자동 로그아웃 컴포넌트
 *
 * 보안 기능:
 * - 30분 비활동 시 자동 로그아웃 (공용 PC 보안)
 * - 로그인 상태 유지 옵션 비활성화 시에만 작동
 * - 사용자 활동 감지: 마우스, 키보드, 스크롤, 터치
 *
 * @see SECURITY.md 섹션 4: 공용 PC 보안
 */
export default function InactivityLogout() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // 로그인되지 않은 상태면 실행 안 함
    if (status !== 'authenticated') {
      return
    }

    // 로그인 상태 유지가 활성화된 경우 자동 로그아웃 안 함
    if (getRememberMe()) {
      return
    }

    let inactivityTimeout: NodeJS.Timeout
    let warningTimeout: NodeJS.Timeout
    let warningShown = false

    const INACTIVITY_TIME = 30 * 60 * 1000 // 30분
    const WARNING_TIME = 25 * 60 * 1000 // 25분 (5분 전 경고)

    const handleInactivityLogout = async () => {
      toast.error('비활동으로 인해 자동 로그아웃되었습니다')
      await handleLogout({ callbackUrl: '/login?timeout=true' })
    }

    const showWarning = () => {
      if (!warningShown) {
        warningShown = true
        toast('5분 후 자동 로그아웃됩니다', {
          icon: '⏰',
          duration: 5000,
        })
      }
    }

    const resetTimers = () => {
      // 기존 타이머 클리어
      clearTimeout(inactivityTimeout)
      clearTimeout(warningTimeout)
      warningShown = false

      // 새 타이머 설정
      warningTimeout = setTimeout(showWarning, WARNING_TIME)
      inactivityTimeout = setTimeout(handleInactivityLogout, INACTIVITY_TIME)
    }

    // 사용자 활동 감지 이벤트
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ]

    // 이벤트 리스너 등록
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimers, { passive: true })
    })

    // 초기 타이머 시작
    resetTimers()

    // 클린업
    return () => {
      clearTimeout(inactivityTimeout)
      clearTimeout(warningTimeout)

      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimers)
      })
    }
  }, [status, router])

  // UI를 렌더링하지 않음 (백그라운드 동작)
  return null
}
