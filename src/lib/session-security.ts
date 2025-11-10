/**
 * 세션 보안 유틸리티
 *
 * 보안 개선 사항:
 * 1. 세션 지문(Fingerprint) 생성
 * 2. IP 주소 검증
 * 3. User-Agent 검증
 * 4. 세션 블랙리스트 관리 (강제 로그아웃)
 */

import { headers } from 'next/headers'
import crypto from 'crypto'

/**
 * 브라우저 지문 생성
 * User-Agent와 Accept-Language를 조합하여 고유 해시 생성
 */
export async function generateSessionFingerprint(): Promise<string> {
  const headersList = await headers()
  const userAgent = headersList.get('user-agent') || ''
  const acceptLanguage = headersList.get('accept-language') || ''

  const fingerprint = crypto
    .createHash('sha256')
    .update(userAgent + acceptLanguage)
    .digest('hex')

  return fingerprint
}

/**
 * IP 주소 추출
 */
export async function getClientIp(): Promise<string> {
  const headersList = await headers()

  // Proxy 환경 고려
  const forwarded = headersList.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  return headersList.get('x-real-ip') ||
         headersList.get('cf-connecting-ip') ||
         'unknown'
}

/**
 * 세션 검증 데이터 생성
 * JWT payload에 포함시킬 데이터
 */
export async function createSessionMetadata() {
  return {
    fingerprint: await generateSessionFingerprint(),
    ip: await getClientIp(),
    createdAt: Date.now(),
  }
}

/**
 * 세션 검증
 * JWT에 저장된 fingerprint와 현재 요청의 fingerprint 비교
 */
export async function validateSessionSecurity(
  storedFingerprint: string,
  storedIp?: string
): Promise<{ valid: boolean; reason?: string }> {
  const currentFingerprint = await generateSessionFingerprint()
  const currentIp = await getClientIp()

  // Fingerprint 검증
  if (storedFingerprint !== currentFingerprint) {
    return {
      valid: false,
      reason: 'Browser fingerprint mismatch (possible session hijacking)',
    }
  }

  // IP 변경 감지 (경고만, 차단은 안 함 - 모바일 환경 고려)
  if (storedIp && storedIp !== currentIp && storedIp !== 'unknown') {
    // 개발 환경에서만 로깅
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Security] IP changed: ${storedIp} -> ${currentIp}`)
    }
    // 프로덕션에서는 모니터링 시스템으로 전송 (예: Sentry, DataDog 등)
    // TODO: 실제 환경에서는 이메일 알림 등 추가 조치 가능
  }

  return { valid: true }
}

/**
 * 세션 블랙리스트 관리를 위한 인터페이스
 * 실제 구현 시 Redis 등 인메모리 DB 사용 권장
 */
export class SessionBlacklist {
  private static blacklist = new Set<string>()

  /**
   * 세션 무효화 (강제 로그아웃)
   * @param userId 사용자 ID
   */
  static add(userId: string): void {
    this.blacklist.add(userId)
  }

  /**
   * 세션 유효성 확인
   */
  static isBlacklisted(userId: string): boolean {
    return this.blacklist.has(userId)
  }

  /**
   * 블랙리스트에서 제거 (재로그인 허용)
   */
  static remove(userId: string): void {
    this.blacklist.delete(userId)
  }

  /**
   * 전체 블랙리스트 초기화
   */
  static clear(): void {
    this.blacklist.clear()
  }
}
