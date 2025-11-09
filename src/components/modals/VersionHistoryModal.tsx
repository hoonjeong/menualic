'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

interface Version {
  id: string
  summary: string | null
  createdAt: string
  creatorName: string
  creatorEmail: string
}

interface VersionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  manualId: string
  manualTitle: string
  canEdit: boolean
  onRestore?: () => void | Promise<void>
}

export default function VersionHistoryModal({
  isOpen,
  onClose,
  manualId,
  manualTitle,
  canEdit,
  onRestore,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchVersions()
    }
  }, [isOpen, manualId])

  const fetchVersions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/manual/${manualId}/version`)
      const data = await response.json()

      if (response.ok) {
        setVersions(data.versions || [])
      } else {
        throw new Error(data.error || '버전 목록을 불러오는데 실패했습니다')
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error)
      alert(error instanceof Error ? error.message : '버전 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveVersion = async () => {
    const summary = prompt('이 버전에 대한 설명을 입력하세요 (선택사항)')

    try {
      const response = await fetch(`/api/manual/${manualId}/version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '버전 저장에 실패했습니다')
      }

      await fetchVersions()
      alert('현재 버전이 저장되었습니다')
    } catch (error) {
      alert(error instanceof Error ? error.message : '버전 저장에 실패했습니다')
    }
  }

  const handleRestoreVersion = async (versionId: string) => {
    if (!confirm('이 버전으로 되돌리시겠습니까?\n\n현재 내용은 새로운 버전으로 저장됩니다.')) {
      return
    }

    setIsRestoring(true)
    try {
      const response = await fetch(`/api/manual/${manualId}/version/${versionId}/restore`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '버전 복원에 실패했습니다')
      }

      alert('버전이 복원되었습니다.')
      await fetchVersions()
      if (onRestore) {
        await onRestore()
      }
      onClose()
    } catch (error) {
      alert(error instanceof Error ? error.message : '버전 복원에 실패했습니다')
    } finally {
      setIsRestoring(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return '방금 전'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes}분 전`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours}시간 전`
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days}일 전`
    } else {
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">버전 이력</h2>
              <p className="text-sm text-gray-500 mt-1">{manualTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <Button size="sm" onClick={handleSaveVersion}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              현재 버전 저장
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              중요한 변경사항이 있을 때 수동으로 버전을 저장할 수 있습니다
            </p>
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(80vh-200px)]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500">저장된 버전이 없습니다</p>
              <p className="text-sm text-gray-400 mt-1">
                메뉴얼을 편집하면 자동으로 버전이 생성됩니다
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    selectedVersion === version.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedVersion(version.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {index === 0 && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                            최신
                          </span>
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(version.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        작성자: {version.creatorName}
                      </p>
                      {version.summary && (
                        <p className="text-sm text-gray-700 mt-2 p-2 bg-gray-50 rounded">
                          {version.summary}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(version.createdAt).toLocaleString('ko-KR')}
                      </p>
                    </div>
                    {canEdit && index !== 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRestoreVersion(version.id)
                        }}
                        disabled={isRestoring}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        복원
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <p className="text-xs text-gray-500">
            버전은 최대 30일간 보관됩니다
          </p>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  )
}
