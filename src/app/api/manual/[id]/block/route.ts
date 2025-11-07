import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { handleApiError, UnauthorizedError } from '@/lib/errors'
import { requireManualEditAccess } from '@/lib/permissions-helpers'

const addBlockSchema = z.object({
  sectionId: z.string(),
  type: z.enum(['HEADING1', 'HEADING2', 'HEADING3', 'BODY', 'IMAGE', 'VIDEO', 'TABLE', 'DIVIDER', 'CODE']),
  content: z.string(),
})

// POST /api/manual/[id]/block - Add a block to a section
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
    const validatedData = addBlockSchema.parse(body)

    // Get current max order for this section
    const maxOrderBlock = await prisma.contentBlock.findFirst({
      where: { sectionId: validatedData.sectionId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const nextOrder = (maxOrderBlock?.order ?? -1) + 1

    // Create the block
    const block = await prisma.contentBlock.create({
      data: {
        sectionId: validatedData.sectionId,
        type: validatedData.type,
        content: validatedData.content,
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
      block,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
