/**
 * 인증 관련 유틸리티 함수
 */

import { signOut } from 'next-auth/react'

/**
 * 로그아웃 시 localStorage/sessionStorage 정리 및 로그아웃 처리
 *
 * @param options - signOut 옵션
 * @param options.callbackUrl - 로그아웃 후 이동할 URL (기본: '/login')
 * @param options.keepEmail - 이메일 저장 유지 여부 (기본: true)
 */
export async function handleLogout(options?: {
  callbackUrl?: string
  keepEmail?: boolean
}) {
  const { callbackUrl = '/login', keepEmail = true } = options || {}

  // localStorage 정리
  localStorage.removeItem('rememberMe')
  localStorage.removeItem('loginTime')

  // 이메일 저장을 유지하지 않는 경우에만 제거
  if (!keepEmail) {
    localStorage.removeItem('savedEmail')
  }

  // sessionStorage 정리
  sessionStorage.removeItem('sessionActive')

  // NextAuth 로그아웃
  await signOut({ callbackUrl })
}

/**
 * 로그인 상태 유지 옵션 저장
 *
 * @param rememberMe - 로그인 상태 유지 여부
 */
export function setRememberMe(rememberMe: boolean): void {
  localStorage.setItem('rememberMe', rememberMe.toString())

  if (rememberMe) {
    localStorage.setItem('loginTime', Date.now().toString())
  }

  // rememberMe 여부와 관계없이 현재 세션 활성화 표시
  // SessionManager가 즉시 로그아웃하지 않도록 함
  sessionStorage.setItem('sessionActive', 'true')
}

/**
 * 이메일 저장 처리
 *
 * @param email - 저장할 이메일 (null이면 삭제)
 */
export function setSavedEmail(email: string | null): void {
  if (email) {
    localStorage.setItem('savedEmail', email)
  } else {
    localStorage.removeItem('savedEmail')
  }
}

/**
 * 저장된 이메일 가져오기
 *
 * @returns 저장된 이메일 또는 null
 */
export function getSavedEmail(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('savedEmail')
}

/**
 * 로그인 상태 유지 옵션 확인
 *
 * @returns 로그인 상태 유지 여부
 */
export function getRememberMe(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('rememberMe') === 'true'
}
