# 보안 분석 및 개선 방안

## 현재 구현의 보안 취약점

### 1. 클라이언트 측 검증의 한계 (위험도: 중)

**취약점:**
- localStorage의 `rememberMe` 값을 JavaScript로 조작 가능
- 개발자 도구에서 `localStorage.setItem('rememberMe', 'true')` 실행 시 자동 로그아웃 우회

**실제 영향:**
- ✅ JWT 토큰은 HttpOnly 쿠키에 있어 조작 불가능
- ✅ 서버 API는 JWT 검증으로 보호됨
- ⚠️ 단순히 클라이언트 측 로그아웃 로직만 우회 (불편함 회피)

**개선 방안:**
```typescript
// JWT payload에 rememberMe 정보 포함
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id
      token.rememberMe = user.rememberMe  // 서버에서 검증 가능
    }
    return token
  }
}
```

---

### 2. XSS (Cross-Site Scripting) 취약점 (위험도: 중)

**취약점:**
- localStorage에 저장된 이메일 주소 탈취 가능
- XSS 공격 성공 시 `localStorage.getItem('savedEmail')` 실행 가능

**현재 노출 데이터:**
```javascript
localStorage = {
  "savedEmail": "user@example.com",  // ⚠️ 탈취 가능
  "rememberMe": "true",              // ✅ 민감하지 않음
  "loginTime": "1699876543210"       // ✅ 민감하지 않음
}
```

**JWT 토큰 보안:**
```
✅ HttpOnly 쿠키 → JavaScript 접근 불가
✅ XSS로도 직접 탈취 불가능
⚠️ XSS로 API 요청은 전송 가능 (CSRF 토큰 필요)
```

**개선 방안:**
1. **Content Security Policy (CSP) 설정**
```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}
```

2. **입력값 검증 및 Sanitization**
   - React는 기본적으로 XSS 방어
   - `dangerouslySetInnerHTML` 사용 시 주의
   - 사용자 입력값은 항상 서버에서 검증

---

### 3. 세션 고정 공격 (Session Hijacking) (위험도: 중-높음)

**취약점:**
- JWT 토큰 탈취 시 30일간 사용 가능
- 서버에서 강제 로그아웃 불가능 (JWT의 근본적 한계)

**공격 시나리오:**
```
1. 공격자가 XSS로 사용자의 API 요청 가로채기
2. 또는 네트워크 스니핑으로 쿠키 탈취 (HTTPS 미사용 시)
3. 탈취한 쿠키를 자신의 브라우저에 설정
4. 피해자 계정으로 30일간 접근 가능
```

**개선 방안:**

#### 방법 1: 세션 블랙리스트 (권장)
```typescript
// src/lib/auth.ts
callbacks: {
  async jwt({ token }) {
    // 블랙리스트 확인
    if (SessionBlacklist.isBlacklisted(token.id as string)) {
      return null  // 토큰 무효화
    }
    return token
  }
}

// 관리자가 사용자 강제 로그아웃
SessionBlacklist.add(userId)
```

#### 방법 2: 세션 Fingerprinting
```typescript
// src/lib/auth.ts
import { generateSessionFingerprint } from './session-security'

callbacks: {
  async jwt({ token, trigger }) {
    if (trigger === 'signIn') {
      // 로그인 시 fingerprint 저장
      token.fingerprint = await generateSessionFingerprint()
    }
    return token
  },

  async session({ session, token }) {
    // 매 요청마다 fingerprint 검증
    const validation = await validateSessionSecurity(
      token.fingerprint as string
    )

    if (!validation.valid) {
      throw new Error('Session security validation failed')
    }

    return session
  }
}
```

#### 방법 3: 짧은 토큰 만료 시간 + Refresh Token
```typescript
session: {
  strategy: 'jwt',
  maxAge: 15 * 60, // 15분 (짧게 설정)
  updateAge: 5 * 60, // 5분마다 갱신
}
```

**장단점:**
- ✅ 토큰 탈취 시 피해 최소화
- ❌ 사용자 경험 저하 (자주 재로그인)

---

### 4. 공용 PC 보안 (위험도: 높음)

**취약점:**
- "로그인 상태 유지" 선택 시 30일간 자동 로그인
- 공용 PC에서 로그아웃 잊으면 심각한 보안 문제

**개선 방안:**

#### 방법 1: 비활동 시 자동 로그아웃
```typescript
// src/components/InactivityLogout.tsx
'use client'

import { useEffect } from 'react'
import { signOut } from 'next-auth/react'

export default function InactivityLogout() {
  useEffect(() => {
    let timeout: NodeJS.Timeout

    const resetTimer = () => {
      clearTimeout(timeout)
      // 30분 비활동 시 자동 로그아웃
      timeout = setTimeout(() => {
        const rememberMe = localStorage.getItem('rememberMe') === 'true'
        if (!rememberMe) {
          signOut({ callbackUrl: '/login?timeout=true' })
        }
      }, 30 * 60 * 1000)
    }

    // 사용자 활동 감지
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      window.addEventListener(event, resetTimer)
    })

    resetTimer()

    return () => {
      clearTimeout(timeout)
      events.forEach(event => {
        window.removeEventListener(event, resetTimer)
      })
    }
  }, [])

  return null
}
```

#### 방법 2: 민감한 작업 시 재인증
```typescript
// 비밀번호 변경, 결제 등 중요한 작업 전
async function handleSensitiveAction() {
  const lastAuth = localStorage.getItem('lastAuthTime')
  const now = Date.now()

  // 최근 5분 내 인증하지 않았으면 비밀번호 재입력 요구
  if (!lastAuth || now - parseInt(lastAuth) > 5 * 60 * 1000) {
    // 비밀번호 확인 모달 표시
    await showPasswordConfirmModal()
  }

  // 작업 진행
}
```

---

### 5. HTTPS 미사용 시 쿠키 탈취 (위험도: 극상)

**문제:**
- 개발 환경(localhost)에서는 HTTP 사용
- 프로덕션에서 HTTPS 필수

**확인:**
```typescript
// src/lib/auth.ts
cookies: {
  sessionToken: {
    options: {
      secure: process.env.NODE_ENV === 'production',  // ✅ 설정됨
    }
  }
}
```

**프로덕션 체크리스트:**
```
✅ HTTPS 인증서 설정
✅ Secure 쿠키 활성화
✅ HSTS 헤더 설정
✅ Mixed Content 차단
```

---

## 보안 개선 우선순위

### 🔴 즉시 적용 (Critical)

1. **CSP 헤더 설정** - XSS 방어
2. **HTTPS 강제 (프로덕션)** - 중간자 공격 방어
3. **비활동 자동 로그아웃** - 공용 PC 보안

### 🟡 권장 (High)

4. **세션 Fingerprinting** - 세션 하이재킹 탐지
5. **IP 변경 감지 및 알림** - 계정 탈취 조기 발견
6. **비밀번호 정책 강화** - 최소 12자, 복잡도 요구

### 🟢 선택 (Medium)

7. **세션 블랙리스트** - 강제 로그아웃 기능
8. **2FA (이중 인증)** - 로그인 보안 강화
9. **로그인 기록 및 알림** - 이상 활동 감지

---

## 구현 가이드

### 1단계: CSP 헤더 적용

```bash
# next.config.ts 수정
```

### 2단계: 비활동 자동 로그아웃

```bash
# src/components/InactivityLogout.tsx 생성
# src/app/layout.tsx에 추가
```

### 3단계: 세션 보안 강화

```bash
# src/lib/session-security.ts 사용
# src/lib/auth.ts callbacks 수정
```

---

## 모니터링

### 보안 로그 수집
```typescript
// 의심스러운 활동 로깅
logger.warn('Security Alert', {
  event: 'fingerprint_mismatch',
  userId: session.user.id,
  ip: currentIp,
  timestamp: new Date(),
})
```

### 알림 설정
- 동일 계정 다수 로그인
- 짧은 시간 내 여러 IP에서 접속
- 비밀번호 변경 시 이메일 알림

---

## 참고 자료

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NextAuth.js Security](https://next-auth.js.org/configuration/options#security)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
