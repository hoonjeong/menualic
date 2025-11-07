import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10) // 10MB default
const ALLOWED_TYPES = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/jpg,image/png,image/gif,image/webp').split(',')

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const manualId = formData.get('manualId') as string | null

    if (!file) {
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다' },
        { status: 400 }
      )
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다. (JPEG, PNG, GIF, WebP만 가능)' },
        { status: 400 }
      )
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '파일 크기는 10MB를 초과할 수 없습니다' },
        { status: 400 }
      )
    }

    // If manualId is provided, verify user has access
    if (manualId) {
      const manual = await prisma.manual.findUnique({
        where: { id: manualId },
        include: {
          team: {
            include: {
              members: {
                where: { userId: session.user.id }
              }
            }
          },
          shares: {
            where: { userId: session.user.id }
          }
        }
      })

      if (!manual) {
        return NextResponse.json(
          { error: '메뉴얼을 찾을 수 없습니다' },
          { status: 404 }
        )
      }

      const isOwner = manual.ownerId === session.user.id
      const isMember = manual.team.members.length > 0
      const hasSharedAccess = manual.shares.length > 0

      if (!isOwner && !isMember && !hasSharedAccess) {
        return NextResponse.json(
          { error: '메뉴얼에 접근할 권한이 없습니다' },
          { status: 403 }
        )
      }
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch {
      // Directory already exists or other error, continue
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const storedFilename = `${randomUUID()}.${fileExtension}`
    const filePath = join(uploadDir, storedFilename)

    // Read file buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Get image dimensions (using basic approach without sharp for now)
    let width: number | undefined
    let height: number | undefined

    // Save file to disk
    await writeFile(filePath, buffer)

    // Save file metadata to database
    const fileRecord = await prisma.file.create({
      data: {
        filename: file.name,
        storedFilename,
        mimeType: file.type,
        size: buffer.length,
        path: `/uploads/${storedFilename}`,
        width,
        height,
        uploadedBy: session.user.id,
        manualId: manualId || undefined,
      }
    })

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        filename: fileRecord.filename,
        url: fileRecord.path,
        width: fileRecord.width,
        height: fileRecord.height,
        size: fileRecord.size,
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: '파일 업로드에 실패했습니다',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
