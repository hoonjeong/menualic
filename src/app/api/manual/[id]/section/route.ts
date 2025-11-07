import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { handleApiError, UnauthorizedError } from '@/lib/errors'
import { requireManualEditAccess } from '@/lib/permissions-helpers'

const addSectionSchema = z.object({
  title: z.string().min(1, '섹션 제목을 입력해주세요'),
  parentId: z.string().optional(),
})

// POST /api/manual/[id]/section - Add a new section
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new UnauthorizedError()
    }

    const { id } = await params
    await requireManualEditAccess(id, session.user.id)

    const body = await request.json()
    const validatedData = addSectionSchema.parse(body)

    // Determine depth based on parent
    let depth = 1
    if (validatedData.parentId) {
      const parent = await prisma.manualSection.findUnique({
        where: { id: validatedData.parentId },
      })
      if (parent) {
        depth = parent.depth + 1
      }
    }

    // Get current max order for this level
    const maxOrderSection = await prisma.manualSection.findFirst({
      where: {
        manualId: id,
        parentId: validatedData.parentId || null,
      },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const nextOrder = (maxOrderSection?.order ?? -1) + 1

    // Create the section
    const section = await prisma.manualSection.create({
      data: {
        manualId: id,
        title: validatedData.title,
        parentId: validatedData.parentId || null,
        depth,
        order: nextOrder,
      },
    })

    // Update manual's updatedAt
    await prisma.manual.update({
      where: { id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      section,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
