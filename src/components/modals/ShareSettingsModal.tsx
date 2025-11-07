'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
}

interface ShareUser {
  id: string
  userId: string
  userName: string
  userEmail: string
  permission: 'EDITOR' | 'VIEWER'
}

interface ExternalLink {
  id: string
  token: string
  accessType: 'TITLE_ONLY' | 'FULL_ACCESS'
  isActive: boolean
  createdAt: string
}

interface ShareSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  manualId: string
  manualTitle: string
}

export default function ShareSettingsModal({
  isOpen,
  onClose,
  manualId,
  manualTitle,
}: ShareSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'team' | 'external'>('team')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [sharedUsers, setSharedUsers] = useState<ShareUser[]>([])
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [selectedPermission, setSelectedPermission] = useState<'EDITOR' | 'VIEWER'>('VIEWER')
  const [selectedAccessType, setSelectedAccessType] = useState<'TITLE_ONLY' | 'FULL_ACCESS'>('TITLE_ONLY')

  useEffect(() => {
    if (isOpen) {
      fetchShareSettings()
    }
  }, [isOpen, manualId])

  const fetchShareSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/manual/${manualId}/share`)
      const data = await response.json()

      if (response.ok) {
        setTeamMembers(data.teamMembers || [])
        setSharedUsers(data.sharedUsers || [])
        setExternalLinks(data.externalLinks || [])
      }
    } catch (error) {
      console.error('Failed to fetch share settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTeamMember = async () => {
    if (!selectedMember) {
      alert('팀원을 선택해주세요')
      return
    }

    try {
      const response = await fetch(`/api/manual/${manualId}/share/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedMember,
          permission: selectedPermission,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '공유에 실패했습니다')
      }

      setSelectedMember('')
      await fetchShareSettings()
      alert('공유되었습니다')
    } catch (error) {
      alert(error instanceof Error ? error.message : '공유에 실패했습니다')
    }
  }

  const handleRemoveTeamMember = async (shareId: string) => {
    if (!confirm('공유를 해제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/manual/${manualId}/share/team/${shareId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '공유 해제에 실패했습니다')
      }

      await fetchShareSettings()
    } catch (error) {
      alert(error instanceof Error ? error.message : '공유 해제에 실패했습니다')
    }
  }

  const handleUpdatePermission = async (shareId: string, newPermission: 'EDITOR' | 'VIEWER') => {
    try {
      const response = await fetch(`/api/manual/${manualId}/share/team/${shareId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission: newPermission }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '권한 변경에 실패했습니다')
      }

      await fetchShareSettings()
    } catch (error) {
      alert(error instanceof Error ? error.message : '권한 변경에 실패했습니다')
    }
  }

  const handleCreateExternalLink = async () => {
    try {
      const response = await fetch(`/api/manual/${manualId}/share/external`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessType: selectedAccessType }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '링크 생성에 실패했습니다')
      }

      await fetchShareSettings()
      alert('공유 링크가 생성되었습니다')
    } catch (error) {
      alert(error instanceof Error ? error.message : '링크 생성에 실패했습니다')
    }
  }

  const handleToggleLinkActive = async (linkId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/manual/${manualId}/share/external/${linkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '링크 상태 변경에 실패했습니다')
      }

      await fetchShareSettings()
    } catch (error) {
      alert(error instanceof Error ? error.message : '링크 상태 변경에 실패했습니다')
    }
  }

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`
    navigator.clipboard.writeText(url)
    alert('링크가 복사되었습니다')
  }

  const availableMembers = teamMembers.filter(
    (member) => !sharedUsers.some((share) => share.userId === member.id)
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">공유 설정</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">{manualTitle}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('team')}
            className={`flex-1 px-6 py-3 text-sm font-medium ${
              activeTab === 'team'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            팀 내부 공유
          </button>
          <button
            onClick={() => setActiveTab('external')}
            className={`flex-1 px-6 py-3 text-sm font-medium ${
              activeTab === 'external'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            외부 공유 링크
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(80vh-180px)]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : activeTab === 'team' ? (
            <div className="space-y-4">
              {/* Add team member */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">팀원 추가</h3>
                <div className="flex gap-2">
                  <select
                    value={selectedMember}
                    onChange={(e) => setSelectedMember(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">팀원 선택...</option>
                    {availableMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedPermission}
                    onChange={(e) => setSelectedPermission(e.target.value as 'EDITOR' | 'VIEWER')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="VIEWER">뷰어</option>
                    <option value="EDITOR">편집자</option>
                  </select>
                  <Button size="sm" onClick={handleAddTeamMember}>
                    추가
                  </Button>
                </div>
              </div>

              {/* Shared users list */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  공유 중인 팀원 ({sharedUsers.length})
                </h3>
                {sharedUsers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    아직 공유된 팀원이 없습니다
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sharedUsers.map((share) => (
                      <div
                        key={share.id}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{share.userName}</p>
                          <p className="text-xs text-gray-500">{share.userEmail}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={share.permission}
                            onChange={(e) =>
                              handleUpdatePermission(share.id, e.target.value as 'EDITOR' | 'VIEWER')
                            }
                            className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="VIEWER">뷰어</option>
                            <option value="EDITOR">편집자</option>
                          </select>
                          <button
                            onClick={() => handleRemoveTeamMember(share.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="공유 해제"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Create external link */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">새 공유 링크 생성</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      공개 범위
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="TITLE_ONLY"
                          checked={selectedAccessType === 'TITLE_ONLY'}
                          onChange={(e) => setSelectedAccessType(e.target.value as 'TITLE_ONLY' | 'FULL_ACCESS')}
                          className="mr-2"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-900">제목만 공개</span>
                          <p className="text-xs text-gray-500">비회원은 제목 목록만 볼 수 있습니다</p>
                        </div>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="FULL_ACCESS"
                          checked={selectedAccessType === 'FULL_ACCESS'}
                          onChange={(e) => setSelectedAccessType(e.target.value as 'TITLE_ONLY' | 'FULL_ACCESS')}
                          className="mr-2"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-900">전체 공개</span>
                          <p className="text-xs text-gray-500">비회원도 전체 내용을 볼 수 있습니다</p>
                        </div>
                      </label>
                    </div>
                  </div>
                  <Button onClick={handleCreateExternalLink} className="w-full">
                    링크 생성
                  </Button>
                </div>
              </div>

              {/* External links list */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  생성된 링크 ({externalLinks.length})
                </h3>
                {externalLinks.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    아직 생성된 링크가 없습니다
                  </p>
                ) : (
                  <div className="space-y-2">
                    {externalLinks.map((link) => (
                      <div
                        key={link.id}
                        className="p-3 bg-white border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 text-xs rounded ${
                                link.isActive
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {link.isActive ? '활성' : '비활성'}
                              </span>
                              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                {link.accessType === 'TITLE_ONLY' ? '제목만' : '전체 공개'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {window.location.origin}/share/{link.token}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              생성일: {new Date(link.createdAt).toLocaleString('ko-KR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyLink(link.token)}
                            className="flex-1"
                          >
                            링크 복사
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleLinkActive(link.id, link.isActive)}
                          >
                            {link.isActive ? '비활성화' : '활성화'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  )
}
