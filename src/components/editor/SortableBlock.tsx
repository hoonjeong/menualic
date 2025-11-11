'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import RichTextEditor from './RichTextEditor'
import TableBlock from './TableBlock'
import ImageBlock from './ImageBlock'
import { safeJsonParse, isValidUrl } from '@/lib/utils'

interface Block {
  id: string
  type: string
  content: string
  order: number
}

interface SortableBlockProps {
  block: Block
  canEdit: boolean
  onUpdate: (blockId: string, content: string) => Promise<void>
  onDelete: (blockId: string) => Promise<void>
}

export function SortableBlock({ block, canEdit, onUpdate, onDelete }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const [isHovered, setIsHovered] = useState(false)
  const [localContent, setLocalContent] = useState('')

  useEffect(() => {
    // BODY and TABLE blocks store content directly (HTML or JSON string)
    if (block.type === 'BODY' || block.type === 'TABLE') {
      setLocalContent(block.content)
    } else {
      // Other blocks store JSON with text or url property
      const parsed = safeJsonParse<{ text?: string; url?: string }>(
        block.content,
        { text: '', url: '' }
      )
      setLocalContent(parsed.text || parsed.url || '')
    }
  }, [block.content, block.type])

  const handleDelete = async () => {
    await onDelete(block.id)
  }

  const renderContent = () => {
    // Heading blocks (HEADING1, HEADING2, HEADING3)
    if (block.type === 'HEADING1' || block.type === 'HEADING2' || block.type === 'HEADING3') {
      const content = safeJsonParse<{ text?: string }>(block.content, { text: '' })
      const text = content.text || ''

      try {
        const HeadingTag = block.type === 'HEADING1' ? 'h1' : block.type === 'HEADING2' ? 'h2' : 'h3'

        if (!canEdit) {
          return (
            <HeadingTag
              className={`px-2 py-1 font-bold ${
                block.type === 'HEADING1' ? 'text-3xl' : block.type === 'HEADING2' ? 'text-2xl' : 'text-xl'
              }`}
            >
              {text || ''}
            </HeadingTag>
          )
        }

        return (
          <HeadingTag
            contentEditable={canEdit}
            suppressContentEditableWarning
            onInput={(e) => {
              const newText = e.currentTarget.textContent || ''
              setLocalContent(newText)
            }}
            onBlur={async () => {
              const newText = localContent.trim()
              if (newText !== text) {
                await onUpdate(block.id, JSON.stringify({ text: newText }))
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.currentTarget.blur()
              }
            }}
            className={`px-2 py-1 font-bold outline-none cursor-text hover:bg-gray-50 rounded-lg focus:bg-gray-50 ${
              block.type === 'HEADING1' ? 'text-3xl' : block.type === 'HEADING2' ? 'text-2xl' : 'text-xl'
            }`}
            data-placeholder="제목을 입력하세요..."
            style={{
              minHeight: '1.5em',
            }}
          >
            {text}
          </HeadingTag>
        )
      } catch {
        return <div className="text-gray-500">잘못된 형식</div>
      }
    }

    // Body block with rich text editor
    if (block.type === 'BODY') {
      return (
        <RichTextEditor
          content={block.content}
          onChange={(content) => setLocalContent(content)}
          onBlur={() => {
            if (localContent !== block.content) {
              onUpdate(block.id, localContent)
            }
          }}
          readOnly={!canEdit}
        />
      )
    }

    // Table block
    if (block.type === 'TABLE') {
      return (
        <TableBlock
          content={block.content}
          onChange={(content) => setLocalContent(content)}
          onBlur={() => {
            if (localContent !== block.content) {
              onUpdate(block.id, localContent)
            }
          }}
          readOnly={!canEdit}
        />
      )
    }

    // Image block
    if (block.type === 'IMAGE') {
      return (
        <ImageBlock
          block={block}
          canEdit={canEdit}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      )
    }

    // Video block
    if (block.type === 'VIDEO') {
      const content = safeJsonParse<{ url?: string }>(block.content, { url: '' })
      const videoUrl = content.url && isValidUrl(content.url) ? content.url : ''

      const getYouTubeEmbedUrl = (url: string) => {
        const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/
        const match = url.match(youtubeRegex)
        return match ? `https://www.youtube.com/embed/${match[1]}` : null
      }

      const embedUrl = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null

      if (!videoUrl && canEdit) {
        // Empty state - show editable input
        return (
          <div className="w-full">
            <input
              type="text"
              placeholder="YouTube URL 또는 비디오 URL을 입력하세요..."
              defaultValue=""
              onBlur={async (e) => {
                const url = e.target.value.trim()
                if (url && url !== videoUrl) {
                  await onUpdate(block.id, JSON.stringify({ url }))
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.currentTarget.blur()
                }
              }}
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
        )
      }

      if (!videoUrl) {
        // Read-only empty state
        return (
          <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">영상이 없습니다</p>
            </div>
          </div>
        )
      }

      // Video is set - show video with editable caption
      return (
        <div className="space-y-2">
          {embedUrl ? (
            <div className="aspect-video">
              <iframe
                src={embedUrl}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <video src={videoUrl} controls className="w-full rounded-lg" />
          )}
          {canEdit && (
            <input
              type="text"
              defaultValue={videoUrl}
              placeholder="YouTube URL 또는 비디오 URL을 입력하세요..."
              onBlur={async (e) => {
                const url = e.target.value.trim()
                if (url !== videoUrl) {
                  await onUpdate(block.id, JSON.stringify({ url }))
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.currentTarget.blur()
                }
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          )}
        </div>
      )
    }

    return <div className="text-gray-500">지원하지 않는 블록 타입</div>
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative pl-8 pr-10"
      data-block-id={block.id}
      data-block-type={block.type}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drag Handle - Absolute positioned on the left inside padding */}
      {canEdit && (
        <div
          {...attributes}
          {...listeners}
          className={`absolute left-0 top-2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
            isDragging ? 'opacity-100' : ''
          }`}
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
      )}

      {/* Delete Button - Absolute positioned on the right inside padding */}
      {canEdit && isHovered && (
        <div className="absolute right-0 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-red-50 rounded text-red-600"
            title="삭제"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}

      {/* Block Content */}
      <div className="w-full">
        {renderContent()}
      </div>
    </div>
  )
}
