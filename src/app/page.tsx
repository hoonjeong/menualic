import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-dark-900 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-dark-mesh opacity-60"></div>

      {/* Gradient orbs for atmosphere */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-accent-purple/20 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-blue/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Header */}
        <header className="flex justify-between items-center mb-24">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-accent-purple to-accent-blue rounded-xl shadow-neon-purple flex items-center justify-center">
              <div className="w-6 h-6 bg-dark-900 rounded-md"></div>
            </div>
            <h1 className="text-2xl font-bold text-gradient">Menualic</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-dark-200 hover:text-white px-4 py-2 transition-colors"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="glass-hover px-6 py-2.5 rounded-lg font-medium text-white shadow-glow-sm"
            >
              시작하기
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <div className="text-center max-w-5xl mx-auto mb-32">
          <div className="inline-block mb-6">
            <span className="glass px-4 py-1.5 rounded-full text-sm text-accent-purple-light font-medium">
              ✨ 팀을 위한 차세대 메뉴얼 플랫폼
            </span>
          </div>

          <h2 className="text-6xl md:text-7xl font-bold mb-8 leading-tight">
            <span className="text-white">팀 협업을 위한</span>
            <br />
            <span className="text-gradient text-glow">메뉴얼 작성 플랫폼</span>
          </h2>

          <p className="text-xl text-dark-200 mb-12 max-w-3xl mx-auto leading-relaxed">
            드래그앤드롭으로 쉽게 작성하고, 계층 구조로 체계적으로 관리하며,
            <br />
            안전하게 공유하는 <span className="text-accent-purple-light">차세대 협업 플랫폼</span>
          </p>

          <div className="flex justify-center gap-4">
            <Link
              href="/signup"
              className="group relative px-8 py-4 bg-gradient-to-r from-accent-purple to-accent-blue rounded-xl text-lg font-semibold text-white shadow-neon-purple hover:shadow-neon-blue transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10">무료로 시작하기</span>
              <div className="absolute inset-0 bg-gradient-to-r from-accent-blue to-accent-purple opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>
            <Link
              href="#features"
              className="glass-hover px-8 py-4 rounded-xl text-lg font-semibold text-white"
            >
              더 알아보기
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-20">
            <div className="glass rounded-xl p-6">
              <div className="text-3xl font-bold text-gradient mb-2">100+</div>
              <div className="text-dark-300 text-sm">활성 팀</div>
            </div>
            <div className="glass rounded-xl p-6">
              <div className="text-3xl font-bold text-gradient mb-2">5,000+</div>
              <div className="text-dark-300 text-sm">생성된 메뉴얼</div>
            </div>
            <div className="glass rounded-xl p-6">
              <div className="text-3xl font-bold text-gradient mb-2">99.9%</div>
              <div className="text-dark-300 text-sm">가동 시간</div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-32">
          <div className="card-glow p-8 group">
            <div className="w-14 h-14 bg-gradient-to-br from-accent-purple/20 to-accent-purple/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">직관적인 편집</h3>
            <p className="text-dark-300 leading-relaxed">
              드래그앤드롭으로 텍스트와 이미지를 자유롭게 배치하고 구조화하세요.
            </p>
          </div>

          <div className="card-glow p-8 group">
            <div className="w-14 h-14 bg-gradient-to-br from-accent-blue/20 to-accent-blue/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">계층 구조</h3>
            <p className="text-dark-300 leading-relaxed">
              대제목/소제목/하위 섹션으로 메뉴얼을 체계적으로 관리하세요.
            </p>
          </div>

          <div className="card-glow p-8 group">
            <div className="w-14 h-14 bg-gradient-to-br from-accent-pink/20 to-accent-pink/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-accent-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">권한 기반 협업</h3>
            <p className="text-dark-300 leading-relaxed">
              소유자/편집자/뷰어 권한으로 안전하게 팀원과 협업하세요.
            </p>
          </div>

          <div className="card-glow p-8 group">
            <div className="w-14 h-14 bg-gradient-to-br from-accent-cyan/20 to-accent-cyan/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">자동 저장</h3>
            <p className="text-dark-300 leading-relaxed">
              5초마다 자동으로 저장되어 작업 내용을 잃어버릴 걱정이 없습니다.
            </p>
          </div>

          <div className="card-glow p-8 group">
            <div className="w-14 h-14 bg-gradient-to-br from-rose-500/20 to-rose-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">버전 관리</h3>
            <p className="text-dark-300 leading-relaxed">
              수정 이력이 자동으로 기록되고, 언제든지 이전 버전으로 되돌릴 수 있습니다.
            </p>
          </div>

          <div className="card-glow p-8 group">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/20 to-indigo-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">유연한 공유</h3>
            <p className="text-dark-300 leading-relaxed">
              팀 내부 공유는 물론, 외부 공유 링크로 비회원과도 공유할 수 있습니다.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-32">
          <div className="glass rounded-3xl p-16 max-w-4xl mx-auto relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-accent-purple/10 via-accent-blue/10 to-accent-pink/10 blur-2xl"></div>

            <div className="relative z-10">
              <h3 className="text-4xl md:text-5xl font-bold text-white mb-6">
                지금 바로 시작하세요
              </h3>
              <p className="text-xl text-dark-200 mb-10 max-w-2xl mx-auto">
                무료로 가입하고 팀과 함께 <span className="text-accent-purple-light">메뉴얼을 작성</span>해보세요
              </p>
              <Link
                href="/signup"
                className="inline-block px-10 py-4 bg-gradient-to-r from-accent-purple to-accent-blue rounded-xl text-lg font-semibold text-white shadow-neon-purple hover:shadow-neon-blue transition-all duration-300 hover:scale-105"
              >
                무료로 시작하기 →
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-32 pt-12 border-t border-dark-800 text-center text-dark-400 text-sm">
          <p>© 2025 Menualic. All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}
