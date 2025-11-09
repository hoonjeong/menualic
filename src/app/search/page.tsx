'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface Manual {
  id: string
  title: string
  description: string | null
  updatedAt: string
  team: {
    id: string
    name: string
  }
  owner: {
    id: string
    name: string
  }
}

interface Section {
  id: string
  title: string
  depth: number
  manual: {
    id: string
    title: string
    team: {
      name: string
    }
  }
  parent: {
    id: string
    title: string
  } | null
}

interface Block {
  id: string
  type: string
  preview: string
  rawPreview: string
  sectionId: string
  sectionTitle: string
  manualId: string
  manualTitle: string
  teamName: string
}

interface SearchResults {
  manuals: Manual[]
  sections: Section[]
  blocks: Block[]
}

export default function SearchPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''

  const [results, setResults] = useState<SearchResults>({
    manuals: [],
    sections: [],
    blocks: [],
  })
  const [loading, setLoading] = useState(false)
  const [totalResults, setTotalResults] = useState(0)
  const [searchInput, setSearchInput] = useState(query)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated' && query) {
      performSearch(query)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, query])

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({ manuals: [], sections: [], blocks: [] })
      setTotalResults(0)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()

      if (response.ok) {
        setResults(data.results)
        setTotalResults(data.totalResults)
      } else {
        throw new Error(data.error || '검색에 실패했습니다')
      }
    } catch (error) {
      console.error('Search error:', error)
      alert(error instanceof Error ? error.message : '검색에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`)
    }
  }

  const getBlockTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      HEADING1: '제목 1',
      HEADING2: '제목 2',
      HEADING3: '제목 3',
      BODY: '본문',
      IMAGE: '이미지',
      VIDEO: '동영상',
      TABLE: '표',
      CODE: '코드',
      DIVIDER: '구분선',
    }
    return labels[type] || type
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              대시보드
            </Button>
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
              <div className="relative">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="매뉴얼, 섹션, 내용 검색..."
                  className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </form>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">검색 중...</p>
            </div>
          </div>
        ) : query ? (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                &quot;{query}&quot; 검색 결과
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                총 {totalResults}개의 결과
              </p>
            </div>

            {totalResults === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 text-gray-300 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <p className="text-gray-500 text-lg mb-2">검색 결과가 없습니다</p>
                <p className="text-gray-400 text-sm">
                  다른 검색어를 입력해보세요
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Manuals */}
                {results.manuals.length > 0 && (
                  <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      매뉴얼 ({results.manuals.length})
                    </h2>
                    <div className="space-y-3">
                      {results.manuals.map((manual) => (
                        <Link
                          key={manual.id}
                          href={`/manual/${manual.id}`}
                          className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-500 hover:shadow-md transition-all"
                        >
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {manual.title}
                          </h3>
                          {manual.description && (
                            <p className="text-sm text-gray-600 mb-2">
                              {manual.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              {manual.team.name}
                            </span>
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {manual.owner.name}
                            </span>
                            <span>
                              최종 수정: {new Date(manual.updatedAt).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {/* Sections */}
                {results.sections.length > 0 && (
                  <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      섹션 ({results.sections.length})
                    </h2>
                    <div className="space-y-3">
                      {results.sections.map((section) => (
                        <Link
                          key={section.id}
                          href={`/manual/${section.manual.id}?section=${section.id}`}
                          className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-500 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {section.title}
                              </h3>
                              {section.parent && (
                                <p className="text-xs text-gray-500 mb-2">
                                  상위 섹션: {section.parent.title}
                                </p>
                              )}
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  {section.manual.title}
                                </span>
                                <span className="flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                  {section.manual.team.name}
                                </span>
                              </div>
                            </div>
                            <span className="ml-4 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                              Depth {section.depth}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {/* Blocks */}
                {results.blocks.length > 0 && (
                  <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                      </svg>
                      콘텐츠 ({results.blocks.length})
                    </h2>
                    <div className="space-y-3">
                      {results.blocks.map((block) => (
                        <Link
                          key={block.id}
                          href={`/manual/${block.manualId}?section=${block.sectionId}`}
                          className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-500 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded font-medium">
                              {getBlockTypeLabel(block.type)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div
                                className="text-sm text-gray-700 mb-2 line-clamp-3"
                                dangerouslySetInnerHTML={{ __html: block.preview }}
                              />
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  {block.manualTitle}
                                </span>
                                <span className="flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                  </svg>
                                  {block.sectionTitle}
                                </span>
                                <span className="flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                  {block.teamName}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-gray-500 text-lg">검색어를 입력하세요</p>
          </div>
        )}
      </main>
    </div>
  )
}
