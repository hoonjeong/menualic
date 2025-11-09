'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDebounce } from '@/hooks/useDebounce'

interface SearchBarProps {
  className?: string
}

interface QuickResult {
  id: string
  title: string
  type: 'manual' | 'section'
  manualId?: string
  teamName?: string
}

export default function SearchBar({ className = '' }: SearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [quickResults, setQuickResults] = useState<QuickResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebounce(query, 300)

  // Fetch quick results when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length > 0) {
      fetchQuickResults(debouncedQuery)
    } else {
      setQuickResults([])
    }
  }, [debouncedQuery])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Handle keyboard shortcuts (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const fetchQuickResults = async (searchQuery: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()

      if (response.ok) {
        // Get top 5 results from manuals and sections
        const results: QuickResult[] = []

        data.results.manuals.slice(0, 3).forEach((manual: any) => {
          results.push({
            id: manual.id,
            title: manual.title,
            type: 'manual',
            teamName: manual.team.name,
          })
        })

        data.results.sections.slice(0, 3).forEach((section: any) => {
          results.push({
            id: section.id,
            title: section.title,
            type: 'section',
            manualId: section.manual.id,
            teamName: section.manual.team.name,
          })
        })

        setQuickResults(results)
      }
    } catch (error) {
      console.error('Quick search error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
      setIsFocused(false)
      inputRef.current?.blur()
    }
  }

  const handleResultClick = (result: QuickResult) => {
    if (result.type === 'manual') {
      router.push(`/manual/${result.id}`)
    } else {
      router.push(`/manual/${result.manualId}?section=${result.id}`)
    }
    setQuery('')
    setIsFocused(false)
    inputRef.current?.blur()
  }

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="검색... (Ctrl+K)"
            className="w-full px-4 py-2.5 pl-10 pr-4 border border-dark-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-accent-purple/50 bg-dark-800/50 backdrop-blur-sm text-white placeholder:text-dark-400 hover:border-dark-600 transition-all"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-400"
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
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-purple"></div>
            </div>
          )}
        </div>
      </form>

      {/* Quick Results Dropdown */}
      {isFocused && (query.trim().length > 0 || quickResults.length > 0) && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-2 w-full glass rounded-xl border border-dark-700 shadow-glass max-h-96 overflow-y-auto z-50"
        >
          {quickResults.length > 0 ? (
            <>
              <div className="px-4 py-3 border-b border-dark-700">
                <p className="text-xs text-dark-400 font-semibold uppercase tracking-wider">빠른 검색</p>
              </div>
              <div className="py-1.5">
                {quickResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      {result.type === 'manual' ? (
                        <svg className="w-5 h-5 mt-0.5 text-accent-purple flex-shrink-0 group-hover:text-accent-purple-light transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 mt-0.5 text-accent-blue flex-shrink-0 group-hover:text-accent-blue-light transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-accent-purple-light transition-colors">
                          {result.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-dark-700/50 text-dark-300 rounded-md border border-dark-600">
                            {result.type === 'manual' ? '매뉴얼' : '섹션'}
                          </span>
                          {result.teamName && (
                            <span className="text-xs text-dark-400">
                              {result.teamName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-dark-700">
                <button
                  onClick={handleSubmit}
                  className="text-xs text-accent-purple hover:text-accent-purple-light font-medium flex items-center transition-colors"
                >
                  모든 결과 보기
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </>
          ) : query.trim().length > 0 && !isLoading ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-dark-400">검색 결과가 없습니다</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
