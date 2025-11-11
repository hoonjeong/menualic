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

  // Parse content directly from block.content instead of using state
  const content = safeJsonParse<ImageContent>(block.content, {})

  const [isSelected, setIsSelected] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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

  const uploadFile = async (file: File) => {
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

      setIsUploading(false)
      await onUpdate(block.id, JSON.stringify(newContent))
    } catch (error) {
      console.error('Upload error:', error)
      alert(error instanceof Error ? error.message : '파일 업로드에 실패했습니다')
      setIsUploading(false)
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }

    await uploadFile(file)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (!canEdit) return

    const file = e.dataTransfer.files[0]
    if (file) {
      await uploadFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (canEdit && !content.url) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
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
      className="relative w-full"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        onClick={(e) => {
          // Reset value to allow selecting the same file again
          e.currentTarget.value = ''
        }}
        className="hidden"
      />

      {isUploading && (
        <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">업로드 중...</p>
          </div>
        </div>
      )}

      {!isUploading && !imageUrl && (
        <div className="w-full py-4 px-4 rounded-lg border-2 border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500 text-center">
            이미지를 불러오는 중...
          </p>
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
              height: 'auto',
              maxWidth: '100%',
              userSelect: 'none',
            }}
            onClick={handleImageClick}
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-size="18" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3E이미지를 불러올 수 없습니다%3C/text%3E%3C/svg%3E'
            }}
          />

          {/* Toolbar - shows on hover or when selected */}
          {canEdit && (isSelected || undefined) && (
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleUploadClick()
                }}
                className="px-3 py-1.5 bg-white rounded-lg shadow-md text-xs font-medium text-gray-700 hover:bg-gray-100 border border-gray-200"
                title="이미지 변경"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('이미지를 삭제하시겠습니까?')) {
                    onDelete(block.id)
                  }
                }}
                className="px-3 py-1.5 bg-white rounded-lg shadow-md text-xs font-medium text-red-600 hover:bg-red-50 border border-gray-200"
                title="이미지 삭제"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}

          {/* Resize handles - only show when selected */}
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

              {/* Selection hint */}
              <div className="absolute bottom-2 left-2 px-3 py-1.5 bg-black bg-opacity-75 text-white text-xs rounded-lg">
                Delete 키로 삭제 | 가장자리를 드래그하여 크기 조절
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
