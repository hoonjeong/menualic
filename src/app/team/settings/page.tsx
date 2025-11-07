'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface TeamMember {
  id: string
  role: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface Team {
  id: string
  name: string
  description?: string
  members: TeamMember[]
}

export default function TeamSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [team, setTeam] = useState<Team | null>(null)
  const [role, setRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Edit states
  const [isEditingInfo, setIsEditingInfo] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Invite member
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'EDITOR' | 'VIEWER'>('VIEWER')

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
        setTeamName(data.team.name)
        setTeamDescription(data.team.description || '')

        // Check if user is owner
        if (data.role !== 'OWNER') {
          router.push('/dashboard')
        }
      } else {
        router.push('/team/create')
      }
    } catch (error) {
      console.error('Failed to fetch team:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTeamInfo = async () => {
    if (!teamName || teamName.trim() === '') {
      alert('팀 이름을 입력해주세요')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/team', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: teamName.trim(),
          description: teamDescription.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '팀 정보 업데이트에 실패했습니다')
      }

      setTeam(data.team)
      setIsEditingInfo(false)
      alert('팀 정보가 업데이트되었습니다')
    } catch (error) {
      alert(error instanceof Error ? error.message : '팀 정보 업데이트에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleInviteMember = async () => {
    if (!inviteEmail || inviteEmail.trim() === '') {
      alert('이메일을 입력해주세요')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/team/member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '멤버 초대에 실패했습니다')
      }

      await fetchTeam()
      setShowInviteModal(false)
      setInviteEmail('')
      setInviteRole('VIEWER')

      // Show invitation link in development mode
      if (data.invitationLink) {
        const message = `초대 이메일이 발송되었습니다!\n\n개발 모드에서는 아래 링크를 직접 사용하세요:\n${data.invitationLink}\n\n※ 콘솔에서도 확인할 수 있습니다.`
        alert(message)
      } else {
        alert('초대 이메일이 발송되었습니다!')
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '멤버 초대에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleChangeRole = async (memberId: string, newRole: string) => {
    if (!confirm(`이 멤버의 역할을 ${newRole === 'OWNER' ? '소유자' : newRole === 'EDITOR' ? '편집자' : '뷰어'}로 변경하시겠습니까?`)) {
      return
    }

    try {
      const response = await fetch(`/api/team/member/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: newRole,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '역할 변경에 실패했습니다')
      }

      await fetchTeam()
      alert('역할이 변경되었습니다')
    } catch (error) {
      alert(error instanceof Error ? error.message : '역할 변경에 실패했습니다')
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`${memberName}님을 팀에서 제거하시겠습니까?`)) {
      return
    }

    try {
      const response = await fetch(`/api/team/member/${memberId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '멤버 제거에 실패했습니다')
      }

      await fetchTeam()
      alert('멤버가 제거되었습니다')
    } catch (error) {
      alert(error instanceof Error ? error.message : '멤버 제거에 실패했습니다')
    }
  }

  const handleDeleteTeam = async () => {
    if (!team) return

    const userInput = prompt(
      `팀을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 모든 메뉴얼과 데이터가 함께 삭제됩니다.\n\n계속하려면 팀 이름을 입력하세요:\n"${team.name}"`
    )

    if (userInput === null) return
    if (userInput !== team.name) {
      alert('팀 이름이 일치하지 않습니다.')
      return
    }

    try {
      const response = await fetch('/api/team', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '팀 삭제에 실패했습니다')
      }

      alert('팀이 삭제되었습니다')
      router.push('/team/create')
    } catch (error) {
      alert(error instanceof Error ? error.message : '팀 삭제에 실패했습니다')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!team || role !== 'OWNER') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-primary-600 rounded-lg"></div>
              <h1 className="text-xl font-bold text-gray-900">Menualic</h1>
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg p-2 transition-colors"
              >
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {session?.user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700">{session?.user?.name}</span>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      router.push('/profile')
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    내 정보 보기
                  </button>
                  <div className="border-t border-gray-200 my-1" />
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      signOut({ callbackUrl: '/login' })
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">팀 설정</h1>
          <p className="text-gray-600 mt-2">팀 정보와 멤버를 관리할 수 있습니다</p>
        </div>

        <div className="space-y-6">
          {/* Team Info Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">팀 정보</h2>

            {isEditingInfo ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    팀 이름
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="팀 이름을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    팀 설명
                  </label>
                  <textarea
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="팀 설명을 입력하세요 (선택사항)"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleUpdateTeamInfo} disabled={saving}>
                    {saving ? '저장 중...' : '저장'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTeamName(team.name)
                      setTeamDescription(team.description || '')
                      setIsEditingInfo(false)
                    }}
                    disabled={saving}
                  >
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    팀 이름
                  </label>
                  <p className="text-gray-900">{team.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    팀 설명
                  </label>
                  <p className="text-gray-900">{team.description || '설명이 없습니다'}</p>
                </div>

                <div className="pt-2">
                  <Button variant="outline" onClick={() => setIsEditingInfo(true)}>
                    팀 정보 수정
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Team Members Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">팀 멤버</h2>
              <Button size="sm" onClick={() => setShowInviteModal(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                멤버 초대
              </Button>
            </div>

            <div className="space-y-3">
              {team.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {member.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{member.user.name}</div>
                      <div className="text-sm text-gray-500">{member.user.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.id, e.target.value)}
                      disabled={member.user.id === session?.user?.id}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="OWNER">소유자</option>
                      <option value="EDITOR">편집자</option>
                      <option value="VIEWER">뷰어</option>
                    </select>

                    {member.user.id !== session?.user?.id && (
                      <button
                        onClick={() => handleRemoveMember(member.id, member.user.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="멤버 제거"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-red-200">
            <h2 className="text-lg font-bold text-red-600 mb-2">위험 구역</h2>
            <p className="text-sm text-gray-600 mb-4">
              팀을 삭제하면 모든 메뉴얼과 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <Button variant="outline" className="text-red-600 hover:bg-red-50 border-red-300" onClick={handleDeleteTeam}>
              팀 삭제
            </Button>
          </div>

          {/* Back to Dashboard */}
          <div className="flex justify-center pt-4">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              대시보드로 돌아가기
            </Button>
          </div>
        </div>
      </main>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-bold text-gray-900 mb-4">멤버 초대</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  역할
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'EDITOR' | 'VIEWER')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="VIEWER">뷰어 (읽기 전용)</option>
                  <option value="EDITOR">편집자 (편집 가능)</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteEmail('')
                  setInviteRole('VIEWER')
                }}
                disabled={saving}
              >
                취소
              </Button>
              <Button onClick={handleInviteMember} disabled={saving}>
                {saving ? '초대 중...' : '초대'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
