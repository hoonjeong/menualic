'use client'

import { useState, useRef, useEffect } from 'react'
import { safeJsonParse } from '@/lib/utils'
import { useParams } from 'next/navigation'

interface Block {
  id: string
  type: string
  content: string
  order: number
}

interface ImageBlockProps {
  block: Block
  canEdit: boolean
  onUpdate: (blockId: string, content: string) => Promise<void>
  onDelete: (blockId: string) => Promise<void>
}

interface ImageContent {
  url?: string
  fileId?: string
  width?: number
  height?: number
}

export default function ImageBlock({ block, canEdit, onUpdate, onDelete }: ImageBlockProps) {
  const params = useParams()
  const manualId = params.id as string

  const [content, setContent] = useState<ImageContent>(() =>
    safeJsonParse<ImageContent>(block.content, {})
  )
  const [isSelected, setIsSelected] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setContent(safeJsonParse<ImageContent>(block.content, {}))
  }, [block.content])

  // Handle keyboard delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSelected && canEdit && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault()
        onDelete(block.id)
      }
    }

    if (isSelected) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSelected, canEdit, onDelete, block.id])

  // Click outside to deselect
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsSelected(false)
      }
    }

    if (isSelected) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSelected])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB를 초과할 수 없습니다')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (manualId) {
        formData.append('manualId', manualId)
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        let errorMessage = '파일 업로드에 실패했습니다'
        try {
          const data = await response.json()
          errorMessage = data.error || errorMessage
        } catch {
          // Failed to parse error response
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

      const newContent: ImageContent = {
        url: data.file.url,
        fileId: data.file.id,
        width: data.file.width,
        height: data.file.height,
      }

      setContent(newContent)
      await onUpdate(block.id, JSON.stringify(newContent))
    } catch (error) {
      console.error('Upload error:', error)
      alert(error instanceof Error ? error.message : '파일 업로드에 실패했습니다')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleResizeStart = (e: React.MouseEvent, direction: 'right' | 'bottom' | 'corner') => {
    e.preventDefault()
    e.stopPropagation()

    if (!imageRef.current) return

    const rect = imageRef.current.getBoundingClientRect()
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
    }
    setIsResizing(true)

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!imageRef.current) return

      const deltaX = moveEvent.clientX - resizeStartRef.current.x
      const deltaY = moveEvent.clientY - resizeStartRef.current.y

      let newWidth = resizeStartRef.current.width
      let newHeight = resizeStartRef.current.height

      if (direction === 'right' || direction === 'corner') {
        newWidth = Math.max(100, resizeStartRef.current.width + deltaX)
      }
      if (direction === 'bottom' || direction === 'corner') {
        newHeight = Math.max(100, resizeStartRef.current.height + deltaY)
      }

      // Maintain aspect ratio for corner resize
      if (direction === 'corner' && content.width && content.height) {
        const aspectRatio = content.width / content.height
        newHeight = newWidth / aspectRatio
      }

      imageRef.current.style.width = `${newWidth}px`
      imageRef.current.style.height = `${newHeight}px`
    }

    const handleMouseUp = async () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)

      if (imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect()
        const newContent = {
          ...content,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }
        setContent(newContent)
        await onUpdate(block.id, JSON.stringify(newContent))
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleImageClick = () => {
    if (canEdit) {
      setIsSelected(true)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const imageUrl = content.url

  return (
    <div
      ref={containerRef}
      className="relative inline-block max-w-full"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {isUploading && (
        <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">업로드 중...</p>
          </div>
        </div>
      )}

      {!isUploading && !imageUrl && (
        <div
          onClick={canEdit ? handleUploadClick : undefined}
          className={`w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center ${
            canEdit ? 'cursor-pointer hover:bg-gray-200' : ''
          }`}
        >
          <div className="text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">클릭하여 이미지 업로드</p>
          </div>
        </div>
      )}

      {!isUploading && imageUrl && (
        <div className="relative inline-block group">
          <img
            ref={imageRef}
            src={imageUrl}
            alt=""
            className={`rounded-lg ${isSelected ? 'ring-2 ring-primary-500' : ''} ${
              canEdit ? 'cursor-pointer' : ''
            }`}
            style={{
              width: content.width ? `${content.width}px` : undefined,
              height: content.height ? `${content.height}px` : undefined,
              maxWidth: '100%',
              userSelect: 'none',
            }}
            onClick={handleImageClick}
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-size="18" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3E이미지를 불러올 수 없습니다%3C/text%3E%3C/svg%3E'
            }}
          />

          {/* Resize handles */}
          {canEdit && isSelected && !isResizing && (
            <>
              {/* Right handle */}
              <div
                onMouseDown={(e) => handleResizeStart(e, 'right')}
                className="absolute top-0 right-0 h-full w-2 cursor-ew-resize bg-primary-500 opacity-0 hover:opacity-100 transition-opacity"
                style={{ transform: 'translateX(50%)' }}
              />

              {/* Bottom handle */}
              <div
                onMouseDown={(e) => handleResizeStart(e, 'bottom')}
                className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize bg-primary-500 opacity-0 hover:opacity-100 transition-opacity"
                style={{ transform: 'translateY(50%)' }}
              />

              {/* Corner handle */}
              <div
                onMouseDown={(e) => handleResizeStart(e, 'corner')}
                className="absolute bottom-0 right-0 w-4 h-4 bg-primary-500 rounded-full cursor-nwse-resize opacity-0 hover:opacity-100 transition-opacity"
                style={{ transform: 'translate(50%, 50%)' }}
              />
            </>
          )}

          {/* Change image button */}
          {canEdit && isSelected && (
            <button
              onClick={handleUploadClick}
              className="absolute top-2 right-2 px-3 py-1 bg-white rounded shadow-md text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              이미지 변경
            </button>
          )}

          {/* Selection hint */}
          {canEdit && isSelected && (
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-75 text-white text-xs rounded">
              Delete 키로 삭제 | 가장자리를 드래그하여 크기 조절
            </div>
          )}
        </div>
      )}
    </div>
  )
}
