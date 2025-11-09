'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import BlockEditor from '@/components/editor/BlockEditor'
import ShareSettingsModal from '@/components/modals/ShareSettingsModal'
import VersionHistoryModal from '@/components/modals/VersionHistoryModal'
import SearchBar from '@/components/ui/SearchBar'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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

interface DeletedBlockHistory {
  block: Block
  sectionId: string
  timestamp: number
}

export default function ManualPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const manualId = params.id as string
  const sectionIdFromUrl = searchParams.get('section')

  const [manual, setManual] = useState<Manual | null>(null)
  const [permission, setPermission] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [selectedSection, setSelectedSection] = useState<Section | null>(null)
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingSectionTitle, setEditingSectionTitle] = useState('')
  const [showShareModal, setShowShareModal] = useState(false)
  const [showVersionModal, setShowVersionModal] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [pendingChanges, setPendingChanges] = useState<{
    blocks: Map<string, string>
    deletedBlocks: Set<string>
  }>({
    blocks: new Map(),
    deletedBlocks: new Set(),
  })
  const [newBlockId, setNewBlockId] = useState<string | null>(null)
  const [deletedBlocksHistory, setDeletedBlocksHistory] = useState<DeletedBlockHistory[]>([])
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true)
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchManual()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, manualId])

  // Auto-scroll to newly created block
  useEffect(() => {
    if (newBlockId) {
      setTimeout(() => {
        const blockElement = document.querySelector(`[data-block-id="${newBlockId}"]`)
        if (blockElement) {
          blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Try to focus the block (if it has a focusable element)
          const focusable = blockElement.querySelector('input, textarea, [contenteditable="true"]')
          if (focusable instanceof HTMLElement) {
            focusable.focus()
            focusable.click()
          }
        }
        setNewBlockId(null)
      }, 100)
    }
  }, [newBlockId, selectedSection])

  const fetchManual = async (keepCurrentSection = false) => {
    try {
      const response = await fetch(`/api/manual/${manualId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '메뉴얼을 불러올 수 없습니다')
      }

      setManual(data.manual)
      setPermission(data.permission)

      // Keep current section if requested, otherwise select first section
      if (keepCurrentSection && selectedSection) {
        // Find and update the selected section with new data
        const updatedSection = findSectionInTree(data.manual.sections, selectedSection.id)
        if (updatedSection) {
          setSelectedSection(updatedSection)
        } else if (data.manual.sections.length > 0) {
          setSelectedSection(data.manual.sections[0])
        }
      } else if (sectionIdFromUrl) {
        // If section ID is in URL, select that section
        const sectionFromUrl = findSectionInTree(data.manual.sections, sectionIdFromUrl)
        if (sectionFromUrl) {
          setSelectedSection(sectionFromUrl)
        } else if (data.manual.sections.length > 0) {
          setSelectedSection(data.manual.sections[0])
        }
      } else if (data.manual.sections.length > 0 && !selectedSection) {
        setSelectedSection(data.manual.sections[0])
      }
    } catch (error) {
      console.error('Failed to fetch manual:', error)
      alert(error instanceof Error ? error.message : '메뉴얼을 불러올 수 없습니다')
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const findSectionInTree = useCallback((sections: Section[], sectionId: string): Section | null => {
    for (const section of sections) {
      if (section.id === sectionId) {
        return section
      }
      if (section.children && section.children.length > 0) {
        const found = findSectionInTree(section.children, sectionId)
        if (found) return found
      }
    }
    return null
  }, [])

  const canEdit = permission === 'OWNER' || permission === 'EDITOR'

  // Save pending changes to server
  const savePendingChanges = useCallback(async () => {
    if (pendingChanges.blocks.size === 0 && pendingChanges.deletedBlocks.size === 0) {
      return
    }

    setSaveStatus('saving')

    try {
      // Save updated blocks
      for (const [blockId, content] of pendingChanges.blocks.entries()) {
        await fetch(`/api/manual/${manualId}/block/${blockId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content }),
        })
      }

      // Delete blocks
      for (const blockId of pendingChanges.deletedBlocks) {
        await fetch(`/api/manual/${manualId}/block/${blockId}`, {
          method: 'DELETE',
        })
      }

      // Clear pending changes
      setPendingChanges({
        blocks: new Map(),
        deletedBlocks: new Set(),
      })

      setSaveStatus('saved')
    } catch (error) {
      console.error('Failed to save changes:', error)
      setSaveStatus('unsaved')
    }
  }, [manualId, pendingChanges])

  // Schedule auto-save after 3 seconds
  const scheduleAutoSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    setSaveStatus('unsaved')

    saveTimerRef.current = setTimeout(() => {
      savePendingChanges()
    }, 3000) // 3 seconds
  }, [savePendingChanges])

  // Undo delete block
  const handleUndoDelete = useCallback(async () => {
    if (deletedBlocksHistory.length === 0) return

    const lastDeleted = deletedBlocksHistory[deletedBlocksHistory.length - 1]

    try {
      // Recreate the block
      const response = await fetch(`/api/manual/${manualId}/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sectionId: lastDeleted.sectionId,
          type: lastDeleted.block.type,
          content: lastDeleted.block.content,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '블록 복원에 실패했습니다')
      }

      // Remove from history
      setDeletedBlocksHistory(prev => prev.slice(0, -1))

      // Refresh manual data
      await fetchManual(true)
    } catch (error) {
      console.error('Failed to undo delete:', error)
      alert(error instanceof Error ? error.message : '블록 복원에 실패했습니다')
    }
  }, [deletedBlocksHistory, manualId])

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingChanges.blocks.size > 0 || pendingChanges.deletedBlocks.size > 0) {
        e.preventDefault()
        e.returnValue = ''
        savePendingChanges()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [pendingChanges, savePendingChanges])

  // Handle Ctrl+Z for undo delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        // Only handle if we can edit and have history
        if (canEdit && deletedBlocksHistory.length > 0) {
          e.preventDefault()
          handleUndoDelete()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [canEdit, deletedBlocksHistory, handleUndoDelete])

  const handleAddBlock = async (type: 'HEADING1' | 'HEADING2' | 'HEADING3' | 'BODY' | 'IMAGE' | 'VIDEO' | 'TABLE', initialContent?: string) => {
    if (!selectedSection) {
      alert('섹션을 먼저 선택해주세요')
      return
    }

    // Save pending changes first to prevent data loss
    if (pendingChanges.blocks.size > 0 || pendingChanges.deletedBlocks.size > 0) {
      // Clear auto-save timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      await savePendingChanges()
    }

    let content = ''

    if (initialContent) {
      content = initialContent
    } else if (type === 'HEADING1' || type === 'HEADING2' || type === 'HEADING3') {
      content = JSON.stringify({ text: '' })
    } else if (type === 'BODY') {
      content = '<p></p>' // Empty HTML for rich text editor
    } else if (type === 'TABLE') {
      content = JSON.stringify({ rows: 3, cols: 3, cells: {} })
    } else if (type === 'IMAGE') {
      content = JSON.stringify({ url: '' })
    } else if (type === 'VIDEO') {
      content = JSON.stringify({ url: '' })
    }

    try {
      const response = await fetch(`/api/manual/${manualId}/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sectionId: selectedSection.id,
          type,
          content,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '블록 추가에 실패했습니다')
      }

      // Store new block ID for auto-focus
      if (data.block && data.block.id) {
        setNewBlockId(data.block.id)
      }

      // Refresh manual data while keeping current section
      await fetchManual(true)
    } catch (error) {
      alert(error instanceof Error ? error.message : '블록 추가에 실패했습니다')
    }
  }

  const handleUpdateBlock = async (blockId: string, content: string) => {
    // Update local state immediately
    if (manual && selectedSection) {
      const updatedSections = manual.sections.map((section) => {
        if (section.id === selectedSection.id) {
          return {
            ...section,
            blocks: section.blocks.map((block) =>
              block.id === blockId ? { ...block, content } : block
            ),
          }
        }
        return section
      })

      setManual({ ...manual, sections: updatedSections })
      setSelectedSection(
        updatedSections.find((s) => s.id === selectedSection.id) || selectedSection
      )
    }

    // Add to pending changes
    setPendingChanges((prev) => {
      const newBlocks = new Map(prev.blocks)
      newBlocks.set(blockId, content)
      return { ...prev, blocks: newBlocks }
    })

    // Schedule auto-save
    scheduleAutoSave()
  }

  const handleDeleteBlock = async (blockId: string) => {
    if (!selectedSection) return

    // Find the block to save it in history
    const blockToDelete = selectedSection.blocks.find(b => b.id === blockId)
    if (!blockToDelete) return

    // Save to history for undo
    setDeletedBlocksHistory(prev => [
      ...prev,
      {
        block: blockToDelete,
        sectionId: selectedSection.id,
        timestamp: Date.now(),
      }
    ])

    try {
      const response = await fetch(`/api/manual/${manualId}/block/${blockId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '블록 삭제에 실패했습니다')
      }

      // Refresh manual data while keeping current section
      await fetchManual(true)
    } catch (error) {
      console.error('Failed to delete block:', error)
      alert(error instanceof Error ? error.message : '블록 삭제에 실패했습니다')
      // Remove from history on error
      setDeletedBlocksHistory(prev => prev.filter(h => h.block.id !== blockId))
    }
  }

  const handleReorderBlocks = async (blocks: Block[]) => {
    if (!manual || !selectedSection) return

    // Optimistic update - update local state immediately
    const updatedSections = manual.sections.map((section) => {
      if (section.id === selectedSection.id) {
        return {
          ...section,
          blocks: blocks,
        }
      }
      return section
    })

    setManual({ ...manual, sections: updatedSections })
    setSelectedSection({
      ...selectedSection,
      blocks: blocks,
    })

    try {
      const response = await fetch(`/api/manual/${manualId}/block/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blocks: blocks.map((block) => ({
            id: block.id,
            order: block.order,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '블록 순서 변경에 실패했습니다')
      }
    } catch (error) {
      console.error('Failed to reorder blocks:', error)
      alert(error instanceof Error ? error.message : '블록 순서 변경에 실패했습니다')
      // Revert on error
      await fetchManual(true)
    }
  }

  const handleAddSection = async () => {
    const title = prompt('새 섹션 제목을 입력하세요')
    if (!title) return

    // Save pending changes first to prevent data loss
    if (pendingChanges.blocks.size > 0 || pendingChanges.deletedBlocks.size > 0) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      await savePendingChanges()
    }

    try {
      const response = await fetch(`/api/manual/${manualId}/section`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '섹션 추가에 실패했습니다')
      }

      await fetchManual()
    } catch (error) {
      alert(error instanceof Error ? error.message : '섹션 추가에 실패했습니다')
    }
  }

  const handleStartEditSection = (section: Section) => {
    setEditingSectionId(section.id)
    setEditingSectionTitle(section.title)
  }

  const handleSaveSection = async (sectionId: string) => {
    if (!editingSectionTitle.trim()) {
      alert('섹션 제목을 입력해주세요')
      return
    }

    // Save pending changes first to prevent data loss
    if (pendingChanges.blocks.size > 0 || pendingChanges.deletedBlocks.size > 0) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      await savePendingChanges()
    }

    try {
      const response = await fetch(`/api/manual/${manualId}/section/${sectionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: editingSectionTitle }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '섹션 수정에 실패했습니다')
      }

      setEditingSectionId(null)
      setEditingSectionTitle('')
      await fetchManual()
    } catch (error) {
      alert(error instanceof Error ? error.message : '섹션 수정에 실패했습니다')
    }
  }

  const handleCancelEditSection = () => {
    setEditingSectionId(null)
    setEditingSectionTitle('')
  }

  const handleDeleteSection = async (section: Section) => {
    // Check if section has blocks
    if (section.blocks && section.blocks.length > 0) {
      alert('이 섹션에는 콘텐츠가 있습니다. 먼저 모든 블록을 삭제해주세요.')
      return
    }

    // Check if section has children
    if (section.children && section.children.length > 0) {
      alert('이 섹션에는 하위 섹션이 있습니다. 먼저 모든 하위 섹션을 삭제해주세요.')
      return
    }

    if (!confirm(`"${section.title}" 섹션을 삭제하시겠습니까?`)) {
      return
    }

    // Save pending changes first to prevent data loss
    if (pendingChanges.blocks.size > 0 || pendingChanges.deletedBlocks.size > 0) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      await savePendingChanges()
    }

    try {
      const response = await fetch(`/api/manual/${manualId}/section/${section.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: '응답 파싱 실패' }))
        throw new Error(data.error || `섹션 삭제에 실패했습니다 (${response.status})`)
      }

      // If this was the selected section, clear selection
      if (selectedSection?.id === section.id) {
        setSelectedSection(null)
      }

      await fetchManual()
    } catch (error) {
      console.error('Delete section error:', error)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        alert('네트워크 연결을 확인해주세요. 서버와 통신할 수 없습니다.')
      } else {
        alert(error instanceof Error ? error.message : '섹션 삭제 중 오류가 발생했습니다')
      }
    }
  }

  const handleSectionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id || !manual) {
      return
    }

    const oldIndex = manual.sections.findIndex((s) => s.id === active.id)
    const newIndex = manual.sections.findIndex((s) => s.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    const newSections = arrayMove(manual.sections, oldIndex, newIndex).map((section, index) => ({
      ...section,
      order: index,
    }))

    // Optimistic update
    setManual({
      ...manual,
      sections: newSections,
    })

    try {
      const response = await fetch(`/api/manual/${manualId}/section/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sections: newSections.map((s) => ({
            id: s.id,
            order: s.order,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '섹션 순서 변경에 실패했습니다')
      }
    } catch (error) {
      console.error('Failed to reorder sections:', error)
      // Revert on error
      await fetchManual()
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

  if (!manual) {
    return null
  }

  const SortableSectionItem = ({ section, depth = 0 }: { section: Section; depth?: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: section.id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    const isSelected = selectedSection?.id === section.id
    const isEditing = editingSectionId === section.id
    const paddingLeft = depth * 16

    return (
      <div ref={setNodeRef} style={style}>
        {isEditing ? (
          <div className="flex items-center gap-1 py-1" style={{ paddingLeft: `${32 + paddingLeft}px` }}>
            <input
              type="text"
              value={editingSectionTitle}
              onChange={(e) => setEditingSectionTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSaveSection(section.id)
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  handleCancelEditSection()
                }
              }}
              autoFocus
              className="flex-1 text-sm px-2 py-1 border border-primary-500 rounded focus:outline-none"
            />
            <button
              onClick={() => handleSaveSection(section.id)}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
              title="저장"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={handleCancelEditSection}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              title="취소"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="group flex items-center">
            {canEdit && (
              <div
                {...attributes}
                {...listeners}
                className="flex-shrink-0 p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </div>
            )}
            <button
              onClick={() => setSelectedSection(section)}
              className={`flex-1 text-left py-2 transition-colors ${
                isSelected
                  ? 'text-primary-700 font-medium'
                  : 'text-gray-700'
              }`}
              style={{ paddingLeft: canEdit ? `${32 + paddingLeft}px` : `${32 + paddingLeft}px` }}
            >
              <div className="flex items-center">
                {section.children && section.children.length > 0 && (
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                <span className="text-sm">{section.title}</span>
              </div>
            </button>
            {canEdit && (
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStartEditSection(section)
                  }}
                  className="p-1 text-gray-500 hover:text-primary-600"
                  title="제목 수정"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteSection(section)
                  }}
                  className="p-1 mr-2 text-gray-500 hover:text-red-600"
                  title="섹션 삭제"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
        {section.children?.map((child) => (
          <SortableSectionItem key={child.id} section={child} depth={depth + 1} />
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-2 sm:px-4 py-3 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="hidden sm:flex"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              대시보드
            </Button>
            {/* Mobile: Show menu toggle button */}
            <button
              onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
              className="sm:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate max-w-[150px] sm:max-w-none">{manual.title}</h1>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">{manual.team.name}</p>
            </div>
          </div>
          <div className="hidden lg:block flex-1 max-w-md">
            <SearchBar />
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            {/* Mobile: Settings toggle button */}
            <button
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              aria-label="Toggle settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
            <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600 hidden sm:inline">
              {permission === 'OWNER' ? '소유자' : permission === 'EDITOR' ? '편집자' : '뷰어'}
            </span>
            {canEdit && (
              <div className="flex items-center text-xs">
                {saveStatus === 'saved' && (
                  <>
                    <svg className="w-4 h-4 mr-1 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-500">저장됨</span>
                  </>
                )}
                {saveStatus === 'saving' && (
                  <>
                    <svg className="animate-spin w-4 h-4 mr-1 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-blue-600">저장 중...</span>
                  </>
                )}
                {saveStatus === 'unsaved' && (
                  <>
                    <svg className="w-4 h-4 mr-1 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-orange-600">저장되지 않음</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-57px)] relative">
        {/* Sidebar - Section Tree */}
        {/* Mobile: Overlay sidebar */}
        {isLeftSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
            onClick={() => setIsLeftSidebarOpen(false)}
          />
        )}
        <aside className={`bg-white border-r border-gray-200 overflow-y-auto transition-all duration-300 ${
          isLeftSidebarOpen ? 'w-64' : 'w-0 md:w-0'
        } md:relative fixed inset-y-0 left-0 z-30 md:z-auto ${
          isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}>
          <div className={`p-4 ${isLeftSidebarOpen ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">목차</h2>
              {canEdit && (
                <button
                  onClick={handleAddSection}
                  className="text-primary-600 hover:text-primary-700"
                  title="섹션 추가"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSectionDragEnd}
            >
              <SortableContext
                items={manual.sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {manual.sections.map((section) => (
                    <SortableSectionItem key={section.id} section={section} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </aside>

        {/* Left Sidebar Toggle Button - Desktop only */}
        <button
          onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
          className="hidden md:flex flex-shrink-0 w-4 bg-gray-100 hover:bg-gray-200 border-r border-gray-200 transition-colors items-center justify-center"
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
              <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 pb-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {selectedSection.title}
                </h2>
              </div>

              <BlockEditor
                blocks={selectedSection.blocks}
                canEdit={canEdit}
                onUpdateBlock={handleUpdateBlock}
                onDeleteBlock={handleDeleteBlock}
                onReorderBlocks={handleReorderBlocks}
                onAddBlock={handleAddBlock}
              />

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

        {/* Right Sidebar Toggle Button - Desktop only */}
        <button
          onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
          className="hidden lg:flex flex-shrink-0 w-4 bg-gray-100 hover:bg-gray-200 border-l border-gray-200 transition-colors items-center justify-center"
          title={isRightSidebarOpen ? '설정 접기' : '설정 펼치기'}
        >
          <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isRightSidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            )}
          </svg>
        </button>

        {/* Right Panel - Settings/Share */}
        {/* Mobile: Overlay sidebar */}
        {isRightSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setIsRightSidebarOpen(false)}
          />
        )}
        <aside className={`bg-white border-l border-gray-200 overflow-y-auto transition-all duration-300 ${
          isRightSidebarOpen ? 'w-80' : 'w-0 lg:w-0'
        } lg:relative fixed inset-y-0 right-0 z-30 lg:z-auto ${
          isRightSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}>
          <div className={`p-4 ${isRightSidebarOpen ? '' : 'hidden'}`}>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">설정</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">제목</label>
                <input
                  type="text"
                  value={manual.title}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                />
              </div>

              {manual.description && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">설명</label>
                  <textarea
                    value={manual.description}
                    readOnly
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">공유</h4>
                <p className="text-xs text-gray-500 mb-2">팀: {manual.team.name}</p>
                {permission === 'OWNER' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowShareModal(true)}
                  >
                    공유 설정
                  </Button>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">버전</h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowVersionModal(true)}
                >
                  버전 이력 보기
                </Button>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">출력</h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.print()}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  매뉴얼 출력하기
                </Button>
              </div>

              {permission === 'OWNER' && (
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">위험 구역</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600 hover:bg-red-50 border-red-300"
                    onClick={async () => {
                      const userInput = prompt(
                        `이 메뉴얼을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 모든 섹션과 블록이 함께 삭제됩니다.\n\n계속하려면 메뉴얼 이름을 입력하세요:\n"${manual.title}"`
                      )

                      if (userInput === null) {
                        // 사용자가 취소를 누른 경우
                        return
                      }

                      if (userInput !== manual.title) {
                        alert('메뉴얼 이름이 일치하지 않습니다.')
                        return
                      }

                      try {
                        const response = await fetch(`/api/manual/${manualId}`, {
                          method: 'DELETE',
                        })

                        if (!response.ok) {
                          const data = await response.json().catch(() => ({ error: '응답 파싱 실패' }))
                          throw new Error(data.error || '메뉴얼 삭제에 실패했습니다')
                        }

                        router.push('/dashboard')
                      } catch (error) {
                        console.error('Delete manual error:', error)
                        alert(error instanceof Error ? error.message : '메뉴얼 삭제 중 오류가 발생했습니다')
                      }
                    }}
                  >
                    메뉴얼 삭제
                  </Button>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Modals */}
      {manual && (
        <>
          <ShareSettingsModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            manualId={manual.id}
            manualTitle={manual.title}
          />
          <VersionHistoryModal
            isOpen={showVersionModal}
            onClose={() => setShowVersionModal(false)}
            manualId={manual.id}
            manualTitle={manual.title}
            canEdit={canEdit}
            onRestore={async () => await fetchManual()}
          />
        </>
      )}
    </div>
  )
}
