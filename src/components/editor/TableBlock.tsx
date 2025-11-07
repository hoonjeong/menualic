'use client'

import { useState, useEffect } from 'react'

interface TableData {
  rows: number
  cols: number
  cells: { [key: string]: string } // key format: "row-col"
}

interface TableBlockProps {
  content: string
  onChange: (content: string) => void
  onBlur?: () => void
  readOnly?: boolean
}

export default function TableBlock({
  content,
  onChange,
  onBlur,
  readOnly = false,
}: TableBlockProps) {
  const [tableData, setTableData] = useState<TableData>({ rows: 2, cols: 2, cells: {} })
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [localValue, setLocalValue] = useState('')

  useEffect(() => {
    try {
      const parsed = JSON.parse(content)
      if (parsed.rows && parsed.cols && parsed.cells) {
        setTableData(parsed)
      }
    } catch {
      // Invalid content, use default
    }
  }, [content])

  const handleCellChange = (row: number, col: number, value: string) => {
    const key = `${row}-${col}`
    const newTableData = {
      ...tableData,
      cells: {
        ...tableData.cells,
        [key]: value,
      },
    }
    setTableData(newTableData)
    onChange(JSON.stringify(newTableData))
  }

  const handleCellBlur = () => {
    if (editingCell) {
      const [row, col] = editingCell.split('-').map(Number)
      handleCellChange(row, col, localValue)
      setEditingCell(null)
      onBlur?.()
    }
  }

  const addRow = () => {
    const newTableData = {
      ...tableData,
      rows: tableData.rows + 1,
    }
    setTableData(newTableData)
    onChange(JSON.stringify(newTableData))
  }

  const addColumn = () => {
    const newTableData = {
      ...tableData,
      cols: tableData.cols + 1,
    }
    setTableData(newTableData)
    onChange(JSON.stringify(newTableData))
  }

  const getCellValue = (row: number, col: number) => {
    const key = `${row}-${col}`
    return tableData.cells[key] || ''
  }

  const startEditing = (row: number, col: number) => {
    if (readOnly) return
    const key = `${row}-${col}`
    setEditingCell(key)
    setLocalValue(getCellValue(row, col))
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <table className="border-collapse border border-gray-300">
          <tbody>
            {Array.from({ length: tableData.rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: tableData.cols }).map((_, colIndex) => {
                  const key = `${rowIndex}-${colIndex}`
                  const isEditing = editingCell === key
                  const cellValue = getCellValue(rowIndex, colIndex)

                  return (
                    <td
                      key={colIndex}
                      className="border border-gray-300 min-w-[120px] h-[40px]"
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={localValue}
                          onChange={(e) => setLocalValue(e.target.value)}
                          onBlur={handleCellBlur}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleCellBlur()
                            } else if (e.key === 'Escape') {
                              e.preventDefault()
                              setEditingCell(null)
                            }
                          }}
                          autoFocus
                          className="w-full h-full px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      ) : (
                        <div
                          onClick={() => startEditing(rowIndex, colIndex)}
                          className={`w-full h-full px-2 py-1 ${
                            readOnly ? '' : 'cursor-text hover:bg-gray-50'
                          }`}
                        >
                          {cellValue || (readOnly ? '' : ' ')}
                        </div>
                      )}
                    </td>
                  )
                })}
                {!readOnly && rowIndex === 0 && (
                  <td
                    rowSpan={tableData.rows}
                    className="border-none w-8 align-top"
                  >
                    <button
                      onClick={addColumn}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      title="열 추가"
                      type="button"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!readOnly && (
              <tr>
                <td colSpan={tableData.cols} className="border-none h-8">
                  <button
                    onClick={addRow}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    title="행 추가"
                    type="button"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
