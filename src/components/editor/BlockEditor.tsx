'use client'

import { useState } from 'react'
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
} from '@dnd-kit/sortable'
import { SortableBlock } from './SortableBlock'

interface Block {
  id: string
  type: string
  content: string
  order: number
}

interface BlockEditorProps {
  blocks: Block[]
  canEdit: boolean
  onUpdateBlock: (blockId: string, content: string) => Promise<void>
  onDeleteBlock: (blockId: string) => Promise<void>
  onReorderBlocks: (blocks: Block[]) => Promise<void>
  onAddBlock: (type: 'HEADING1' | 'HEADING2' | 'HEADING3' | 'BODY' | 'IMAGE' | 'VIDEO' | 'TABLE', initialContent?: string) => Promise<void>
}

export default function BlockEditor({
  blocks,
  canEdit,
  onUpdateBlock,
  onDeleteBlock,
  onReorderBlocks,
  onAddBlock,
}: BlockEditorProps) {
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showTableModal, setShowTableModal] = useState(false)
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id)
      const newIndex = blocks.findIndex((b) => b.id === over.id)

      const newBlocks = arrayMove(blocks, oldIndex, newIndex).map((block, index) => ({
        ...block,
        order: index,
      }))

      await onReorderBlocks(newBlocks)
    }
  }

  const handleUpdateBlock = async (blockId: string, content: string) => {
    await onUpdateBlock(blockId, content)
  }

  const handleDeleteBlock = async (blockId: string) => {
    await onDeleteBlock(blockId)
  }

  const handleAddBlock = async (type: 'HEADING1' | 'HEADING2' | 'HEADING3' | 'BODY' | 'IMAGE' | 'VIDEO' | 'TABLE', initialContent?: string) => {
    setShowAddMenu(false)
    await onAddBlock(type, initialContent)
  }

  const handleCreateTable = async () => {
    const initialContent = JSON.stringify({
      rows: tableRows,
      cols: tableCols,
      cells: {},
    })
    setShowTableModal(false)
    await handleAddBlock('TABLE', initialContent)
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-4">
      <div className="bg-white rounded-lg shadow-sm p-6">
        {blocks.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 mb-4">비어있는 페이지입니다</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {blocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    canEdit={canEdit}
                    onUpdate={handleUpdateBlock}
                    onDelete={handleDeleteBlock}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {canEdit && (
          <div className="mt-4 relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="w-full text-left px-4 py-3 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              블록 추가하려면 클릭
            </button>

            {showAddMenu && (
              <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10 max-h-96 overflow-y-auto">
                <button
                  onClick={() => handleAddBlock('HEADING1')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center"
                >
                  <span className="w-5 h-5 mr-3 text-gray-600 font-bold text-xl">H1</span>
                  <div>
                    <div className="font-medium text-gray-900">제목 1</div>
                    <div className="text-xs text-gray-500">큰 제목</div>
                  </div>
                </button>
                <button
                  onClick={() => handleAddBlock('HEADING2')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center"
                >
                  <span className="w-5 h-5 mr-3 text-gray-600 font-bold text-lg">H2</span>
                  <div>
                    <div className="font-medium text-gray-900">제목 2</div>
                    <div className="text-xs text-gray-500">중간 제목</div>
                  </div>
                </button>
                <button
                  onClick={() => handleAddBlock('HEADING3')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center"
                >
                  <span className="w-5 h-5 mr-3 text-gray-600 font-bold">H3</span>
                  <div>
                    <div className="font-medium text-gray-900">제목 3</div>
                    <div className="text-xs text-gray-500">작은 제목</div>
                  </div>
                </button>
                <button
                  onClick={() => handleAddBlock('BODY')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center"
                >
                  <svg className="w-5 h-5 mr-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  <div>
                    <div className="font-medium text-gray-900">본문</div>
                    <div className="text-xs text-gray-500">서식이 있는 텍스트</div>
                  </div>
                </button>
                <div className="border-t border-gray-200 my-1" />
                <button
                  onClick={() => {
                    setShowAddMenu(false)
                    setShowTableModal(true)
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center"
                >
                  <svg className="w-5 h-5 mr-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <div className="font-medium text-gray-900">표</div>
                    <div className="text-xs text-gray-500">표 삽입</div>
                  </div>
                </button>
                <button
                  onClick={() => handleAddBlock('IMAGE')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center"
                >
                  <svg className="w-5 h-5 mr-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <div className="font-medium text-gray-900">이미지</div>
                    <div className="text-xs text-gray-500">이미지 업로드 또는 URL</div>
                  </div>
                </button>
                <button
                  onClick={() => handleAddBlock('VIDEO')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center"
                >
                  <svg className="w-5 h-5 mr-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div className="font-medium text-gray-900">영상</div>
                    <div className="text-xs text-gray-500">YouTube 또는 비디오 URL</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table Creation Modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-bold text-gray-900 mb-4">표 만들기</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  행 개수
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  열 개수
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <button
                onClick={() => setShowTableModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={handleCreateTable}
                className="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg"
              >
                만들기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
