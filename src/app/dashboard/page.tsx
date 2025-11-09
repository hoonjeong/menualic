'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import SearchBar from '@/components/ui/SearchBar'

interface Team {
  id: string
  name: string
  description?: string
  members: Array<{
    id: string
    role: string
    user: {
      id: string
      name: string
      email: string
    }
  }>
  manuals: Array<{
    id: string
    title: string
    updatedAt: string
  }>
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [team, setTeam] = useState<Team | null>(null)
  const [role, setRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchTeam()
    }
  }, [status, router])

  const fetchTeam = async () => {
    try {
      const response = await fetch('/api/team')
      const data = await response.json()

      if (data.team) {
        setTeam(data.team)
        setRole(data.role)
      } else {
        // No team found, redirect to create team
        router.push('/team/create')
      }
    } catch (error) {
      console.error('Failed to fetch team:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateManual = async () => {
    const title = prompt('새 메뉴얼 제목을 입력하세요')

    if (!title || title.trim() === '') {
      return
    }

    try {
      const response = await fetch('/api/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '메뉴얼 생성에 실패했습니다')
      }

      // Refresh team data to show new manual
      await fetchTeam()

      alert('메뉴얼이 생성되었습니다!')
    } catch (error) {
      alert(error instanceof Error ? error.message : '메뉴얼 생성에 실패했습니다')
    }
  }

  const handleEditManual = async (manualId: string, currentTitle: string) => {
    const newTitle = prompt('메뉴얼 제목을 입력하세요', currentTitle)

    if (!newTitle || newTitle.trim() === '' || newTitle === currentTitle) {
      return
    }

    try {
      const response = await fetch(`/api/manual/${manualId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTitle.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '메뉴얼 수정에 실패했습니다')
      }

      // Refresh team data to show updated manual
      await fetchTeam()

      alert('메뉴얼 제목이 수정되었습니다!')
    } catch (error) {
      alert(error instanceof Error ? error.message : '메뉴얼 수정에 실패했습니다')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-purple mx-auto"></div>
          <p className="mt-4 text-dark-300">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!team) {
    return null
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="glass border-b border-dark-700 sticky top-0 z-40 backdrop-blur-xl bg-dark-900/80">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-accent-purple to-accent-blue rounded-lg shadow-glow-sm"></div>
              <h1 className="text-xl font-bold text-gradient">Menualic</h1>
            </div>
            <div className="hidden md:block w-96">
              <SearchBar />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button className="p-2 hover:bg-white/5 rounded-xl transition-colors">
              <svg className="w-6 h-6 text-dark-300 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 hover:bg-white/5 rounded-xl px-3 py-2 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-accent-purple to-accent-blue rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">
                    {session?.user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-white">{session?.user?.name}</span>
                <svg className="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-52 glass rounded-xl border border-dark-700 py-2 z-50 shadow-glass">
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      router.push('/profile')
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-dark-200 hover:bg-white/5 hover:text-white flex items-center transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    내 정보 보기
                  </button>
                  <div className="border-t border-dark-700 my-2" />
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      signOut({ callbackUrl: '/login' })
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <aside className="w-72 bg-dark-800/30 border-r border-dark-700 overflow-y-auto backdrop-blur-sm">
          <div className="p-5">
            {/* Team Info */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-dark-400 uppercase tracking-wider">팀</h2>
                {role === 'OWNER' && (
                  <button
                    onClick={() => router.push('/team/settings')}
                    className="text-dark-400 hover:text-accent-purple transition-colors"
                    title="팀 설정"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="glass rounded-xl p-4 border border-dark-700">
                <h3 className="font-semibold text-white">{team.name}</h3>
                {team.description && (
                  <p className="text-sm text-dark-300 mt-1">{team.description}</p>
                )}
                <div className="mt-3 flex items-center text-xs text-dark-400">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  {team.members.length}명
                </div>
              </div>
            </div>

            {/* Manual List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-dark-400 uppercase tracking-wider">메뉴얼</h2>
                {(role === 'OWNER' || role === 'EDITOR') && (
                  <button
                    onClick={handleCreateManual}
                    className="text-accent-purple hover:text-accent-purple-light transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>

              {team.manuals.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-dark-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-dark-400 mb-3">메뉴얼이 없습니다</p>
                  {(role === 'OWNER' || role === 'EDITOR') && (
                    <button
                      onClick={handleCreateManual}
                      className="text-sm text-accent-purple hover:text-accent-purple-light transition-colors font-medium"
                    >
                      첫 메뉴얼 만들기
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {team.manuals.map((manual) => (
                    <div
                      key={manual.id}
                      className="group relative flex items-center rounded-xl hover:bg-white/5 transition-all duration-200"
                    >
                      <button
                        onClick={() => router.push(`/manual/${manual.id}`)}
                        className="flex-1 text-left px-3 py-3"
                      >
                        <div className="text-sm font-medium text-white group-hover:text-accent-purple-light transition-colors">{manual.title}</div>
                        <div className="text-xs text-dark-400 mt-0.5">
                          {new Date(manual.updatedAt).toLocaleDateString('ko-KR')}
                        </div>
                      </button>
                      {(role === 'OWNER' || role === 'EDITOR') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditManual(manual.id, manual.title)
                          }}
                          className="absolute right-2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-lg transition-all"
                          title="제목 수정"
                        >
                          <svg className="w-4 h-4 text-dark-400 hover:text-accent-purple transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-dark-900">
          <div className="max-w-4xl mx-auto p-12">
            <div className="card-glow p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-accent-purple/20 to-accent-blue/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow-md">
                <svg className="w-10 h-10 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">
                <span className="text-gradient">{team.name}</span>에 오신 것을 환영합니다!
              </h2>
              <p className="text-dark-300 mb-8 text-lg">
                {role === 'OWNER' || role === 'EDITOR'
                  ? '새로운 메뉴얼을 만들어 팀과 지식을 공유해보세요.'
                  : '공유된 메뉴얼을 확인하고 학습해보세요.'}
              </p>

              {(role === 'OWNER' || role === 'EDITOR') && (
                <Button variant="gradient" size="lg" onClick={handleCreateManual}>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  새 메뉴얼 만들기
                </Button>
              )}

              <div className="mt-10 pt-10 border-t border-dark-700">
                <h3 className="text-sm font-semibold text-dark-400 mb-5 uppercase tracking-wider">팀 멤버 ({team.members.length})</h3>
                <div className="flex flex-wrap gap-3 justify-center">
                  {team.members.map((member) => (
                    <div
                      key={member.id}
                      className="glass flex items-center space-x-3 px-4 py-3 rounded-xl border border-dark-700 hover:border-accent-purple/30 transition-all"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-accent-purple to-accent-blue rounded-full flex items-center justify-center shadow-glow-sm">
                        <span className="text-sm font-semibold text-white">
                          {member.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-white">{member.user.name}</div>
                        <div className="text-xs text-dark-400">
                          {member.role === 'OWNER' ? '소유자' : member.role === 'EDITOR' ? '편집자' : '뷰어'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
