'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import BlockEditor from '@/components/editor/BlockEditor'

interface Manual {
  id: string
  title: string
  description?: string
  owner: {
    id: string
    name: string
    email: string
  }
  team: {
    id: string
    name: string
  }
  sections: Section[]
  createdAt: string
  updatedAt: string
}

interface Section {
  id: string
  title: string
  order: number
  depth: number
  blocks: Block[]
  children?: Section[]
}

interface Block {
  id: string
  type: string
  content: string
  order: number
}

export default function SharedManualPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [manual, setManual] = useState<Manual | null>(null)
  const [accessType, setAccessType] = useState<'TITLE_ONLY' | 'FULL_ACCESS'>('TITLE_ONLY')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<Section | null>(null)
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true)

  useEffect(() => {
    fetchSharedManual()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const fetchSharedManual = async () => {
    try {
      const response = await fetch(`/api/share/${token}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '매뉴얼을 불러올 수 없습니다')
      }

      setManual(data.manual)
      setAccessType(data.accessType)

      // Select first section if available
      if (data.manual.sections.length > 0) {
        setSelectedSection(data.manual.sections[0])
      }
    } catch (error) {
      console.error('Failed to fetch shared manual:', error)
      setError(error instanceof Error ? error.message : '매뉴얼을 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error || !manual) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">접근할 수 없습니다</h1>
          <p className="text-gray-600 mb-6">{error || '알 수 없는 오류가 발생했습니다'}</p>
          <Button onClick={() => router.push('/')}>
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  const SectionItem = ({ section, depth = 0 }: { section: Section; depth?: number }) => {
    const isSelected = selectedSection?.id === section.id
    const paddingLeft = depth * 16

    return (
      <div>
        <button
          onClick={() => setSelectedSection(section)}
          className={`w-full text-left py-2 px-4 transition-colors ${
            isSelected
              ? 'bg-primary-50 text-primary-700 font-medium'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${16 + paddingLeft}px` }}
        >
          <div className="flex items-center">
            {section.children && section.children.length > 0 && (
              <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            <span className="text-sm">{section.title}</span>
          </div>
        </button>
        {section.children?.map((child) => (
          <SectionItem key={child.id} section={child} depth={depth + 1} />
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{manual.title}</h1>
              <p className="text-sm text-gray-500">{manual.team.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2 py-1 bg-blue-100 rounded text-blue-700">
              {accessType === 'TITLE_ONLY' ? '제목만 공개' : '전체 공개'}
            </span>
            <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
              공유된 매뉴얼
            </span>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-57px)]">
        {/* Sidebar - Section Tree */}
        <aside className={`bg-white border-r border-gray-200 overflow-y-auto transition-all duration-300 ${
          isLeftSidebarOpen ? 'w-64' : 'w-0'
        }`}>
          <div className={`p-4 ${isLeftSidebarOpen ? '' : 'hidden'}`}>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">목차</h2>
            <div className="space-y-1">
              {manual.sections.map((section) => (
                <SectionItem key={section.id} section={section} />
              ))}
            </div>
          </div>
        </aside>

        {/* Left Sidebar Toggle Button */}
        <button
          onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
          className="flex-shrink-0 w-4 bg-gray-100 hover:bg-gray-200 border-r border-gray-200 transition-colors flex items-center justify-center"
          title={isLeftSidebarOpen ? '목차 접기' : '목차 펼치기'}
        >
          <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isLeftSidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            )}
          </svg>
        </button>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {selectedSection ? (
            <>
              <div className="max-w-4xl mx-auto px-8 pt-6 pb-2">
                <h2 className="text-3xl font-bold text-gray-900">
                  {selectedSection.title}
                </h2>
              </div>

              {accessType === 'FULL_ACCESS' ? (
                <BlockEditor
                  blocks={selectedSection.blocks}
                  canEdit={false}
                  onUpdateBlock={async () => {}}
                  onDeleteBlock={async () => {}}
                  onReorderBlocks={async () => {}}
                  onAddBlock={async () => {}}
                />
              ) : (
                <div className="max-w-4xl mx-auto px-8 py-8">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <svg className="w-12 h-12 text-yellow-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">제목만 공개된 매뉴얼입니다</h3>
                    <p className="text-gray-600 mb-4">
                      이 링크는 목차만 볼 수 있도록 설정되어 있습니다.<br />
                      전체 내용을 보려면 매뉴얼 소유자에게 문의하세요.
                    </p>
                    <p className="text-sm text-gray-500">
                      소유자: {manual.owner.name} ({manual.owner.email})
                    </p>
                  </div>
                </div>
              )}

              <div className="max-w-4xl mx-auto px-8 pb-6">
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div>작성자: {manual.owner.name}</div>
                    <div>최종 수정: {new Date(manual.updatedAt).toLocaleString('ko-KR')}</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500">좌측에서 섹션을 선택하세요</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
