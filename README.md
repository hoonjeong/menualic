# Menualic - 팀 협업 메뉴얼 작성 플랫폼

드래그앤드롭으로 쉽게 작성하고, 계층 구조로 체계적으로 관리하며, 안전하게 공유하는 메뉴얼 서비스

## 기술 스택

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Authentication**: NextAuth.js
- **Rich Text Editor**: Tiptap (예정)
- **Drag & Drop**: @dnd-kit (예정)

### Backend
- **Runtime**: Node.js
- **API**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT via NextAuth.js

### 개발 도구
- **Package Manager**: npm
- **Code Quality**: ESLint, TypeScript
- **Version Control**: Git

## 주요 기능

### ✅ 구현 완료
1. **회원 관리**
   - 회원가입/로그인
   - JWT 기반 인증
   - 초대 링크를 통한 회원가입

2. **팀 관리**
   - 팀 생성 (1인 1팀 제약)
   - 팀 정보 조회

### 🚧 구현 예정
1. **팀 관리 (추가)**
   - 팀원 초대 (이메일/링크)
   - 권한 관리 (소유자/편집자/뷰어)
   - 팀원 내보내기
   - 팀 삭제

2. **메뉴얼 작성**
   - 3단계 계층 구조 (대제목/소제목/하위 섹션)
   - 드래그앤드롭 블록 편집
   - 텍스트 블록 (리치 텍스트 에디터)
   - 이미지 블록 (업로드 및 설정)
   - 5초 자동 저장

3. **공유 기능**
   - 팀 내부 공유 (권한 설정)
   - 외부 공유 링크 (제목만/전체 공개)

4. **버전 관리**
   - 자동 버전 이력 생성
   - 버전 비교
   - 이전 버전으로 되돌리기

5. **알림**
   - 메뉴얼 공유 알림
   - 팀 초대 알림
   - 권한 변경 알림

## 데이터베이스 스키마

### 주요 엔티티
- **User**: 사용자 정보
- **Team**: 팀 정보
- **TeamMember**: 팀원 관계 (권한 포함)
- **Manual**: 메뉴얼
- **ManualSection**: 메뉴얼 섹션 (계층 구조)
- **ContentBlock**: 콘텐츠 블록
- **ManualShare**: 메뉴얼 공유 (팀 내부)
- **ExternalShareLink**: 외부 공유 링크
- **ManualVersion**: 버전 이력
- **Invitation**: 팀 초대
- **Notification**: 알림

## 설치 및 실행

### 1. 환경 설정

```bash
# 1. 저장소 클론 (또는 현재 디렉토리 사용)
cd menualic

# 2. 의존성 패키지 설치
npm install

# 3. 환경 변수 설정
# .env 파일 수정 (데이터베이스 URL, 시크릿 키 등)
```

### 2. 데이터베이스 설정

```bash
# PostgreSQL 데이터베이스 생성
createdb menualic

# Prisma 마이그레이션 실행
npx prisma migrate dev --name init

# Prisma Studio 실행 (선택사항)
npx prisma studio
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 프로젝트 구조

```
menualic/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # 인증 관련 페이지
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── api/               # API Routes
│   │   │   ├── auth/          # 인증 API
│   │   │   └── team/          # 팀 관리 API
│   │   ├── team/              # 팀 관련 페이지
│   │   │   └── create/
│   │   ├── layout.tsx         # 루트 레이아웃
│   │   ├── page.tsx           # 홈 페이지
│   │   └── globals.css        # 전역 스타일
│   ├── components/            # 리액트 컴포넌트
│   │   └── ui/                # UI 컴포넌트
│   ├── lib/                   # 유틸리티 라이브러리
│   │   ├── prisma.ts          # Prisma 클라이언트
│   │   ├── auth.ts            # NextAuth 설정
│   │   └── utils.ts           # 유틸리티 함수
│   ├── types/                 # TypeScript 타입 정의
│   └── store/                 # 상태 관리 (Zustand)
├── prisma/
│   └── schema.prisma          # Prisma 스키마
├── public/                    # 정적 파일
├── 기획문서/                   # 서비스 기획 문서
├── .env                       # 환경 변수
├── .env.example              # 환경 변수 예시
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

## 주요 페이지

### 현재 구현된 페이지
- `/` - 홈 페이지 (랜딩)
- `/signup` - 회원가입
- `/login` - 로그인
- `/team/create` - 팀 생성

### 구현 예정 페이지
- `/dashboard` - 대시보드 (메뉴얼 목록)
- `/team/settings` - 팀 관리
- `/manual/[id]` - 메뉴얼 편집
- `/manual/[id]/view` - 메뉴얼 보기
- `/share/[token]` - 외부 공유 메뉴얼

## API 엔드포인트

### 구현 완료
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/[...nextauth]` - NextAuth 인증
- `GET /api/team` - 사용자 팀 조회
- `POST /api/team` - 팀 생성
- `DELETE /api/team` - 팀 삭제

### 구현 예정
- Team Management
  - `PUT /api/team` - 팀 정보 수정
  - `POST /api/team/invite` - 팀원 초대
  - `PUT /api/team/member/[id]` - 팀원 권한 변경
  - `DELETE /api/team/member/[id]` - 팀원 내보내기

- Manual Management
  - `GET /api/manual` - 메뉴얼 목록 조회
  - `POST /api/manual` - 메뉴얼 생성
  - `GET /api/manual/[id]` - 메뉴얼 조회
  - `PUT /api/manual/[id]` - 메뉴얼 수정
  - `DELETE /api/manual/[id]` - 메뉴얼 삭제

- Share & Version
  - `POST /api/manual/[id]/share` - 공유 설정
  - `POST /api/manual/[id]/link` - 외부 공유 링크 생성
  - `GET /api/manual/[id]/versions` - 버전 이력 조회
  - `POST /api/manual/[id]/restore` - 버전 되돌리기

## 비즈니스 규칙

### 팀 관리
- 한 사용자는 하나의 팀에만 소속 가능
- 팀에는 항상 1명의 소유자만 존재
- 소유자만 팀 관리, 팀원 초대/제거, 권한 변경 가능

### 권한 체계
- **소유자 (OWNER)**: 모든 권한
- **편집자 (EDITOR)**: 메뉴얼 생성/편집
- **뷰어 (VIEWER)**: 메뉴얼 읽기만 가능

### 메뉴얼
- 계층 구조 최대 3단계
- 5초마다 자동 저장
- 최대 500개 블록
- 이미지 최대 10MB, 최대 50개

## 개발 가이드

### 코드 스타일
- TypeScript strict 모드 사용
- ESLint 규칙 준수
- Tailwind CSS 유틸리티 클래스 사용
- React Server Components 우선 사용

### 커밋 메시지
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 코드
chore: 빌드, 패키지 등
```

## 라이선스

MIT License

## 참고 문서

프로젝트 기획 문서는 `기획문서/` 폴더를 참조하세요:
- 전체 서비스 흐름도
- 메뉴얼 작성 상세 흐름도
- 팀 관리 및 권한 설정 흐름도
- 화면별 상세 정의서
- 비즈니스 규칙
- 상세 사용자 시나리오
- 프로젝트 요약
