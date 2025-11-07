'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import { useEffect, useState } from 'react'
import { sanitizeHtml } from '@/lib/utils'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  onBlur?: () => void
  readOnly?: boolean
}

export default function RichTextEditor({
  content,
  onChange,
  onBlur,
  readOnly = false,
}: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary-600 underline cursor-pointer',
        },
      }),
      Underline,
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      // Sanitize HTML to prevent XSS attacks
      const sanitized = sanitizeHtml(editor.getHTML())
      onChange(sanitized)
    },
    onFocus: () => {
      setIsFocused(true)
    },
    onBlur: () => {
      setIsFocused(false)
      onBlur?.()
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) {
    return null
  }

  const handleContainerClick = () => {
    if (!readOnly && editor) {
      editor.commands.focus()
    }
  }

  return (
    <div
      onClick={handleContainerClick}
      onMouseEnter={() => !readOnly && setIsHovered(true)}
      onMouseLeave={() => !readOnly && setIsHovered(false)}
      className={`transition-all ${
        readOnly
          ? ''
          : isFocused || isHovered
          ? 'border-2 border-primary-500 rounded cursor-text'
          : 'border border-transparent rounded cursor-text'
      }`}
    >
      <EditorContent
        editor={editor}
        className={`prose prose-sm max-w-none ${
          readOnly ? 'px-1 py-0.5' : isFocused ? 'px-2 py-1 min-h-[80px]' : 'px-1 py-0.5'
        } focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:border-none`}
      />
    </div>
  )
}
