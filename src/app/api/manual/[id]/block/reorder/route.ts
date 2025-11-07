import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const reorderBlockSchema = z.object({
  blocks: z.array(
    z.object({
      id: z.string(),
      order: z.number(),
    })
  ),
})

// PUT /api/manual/[id]/block/reorder - Reorder blocks
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { id } = await params
    const manual = await prisma.manual.findUnique({
      where: { id },
      include: {
        team: true,
      },
    })

    if (!manual) {
      return NextResponse.json(
        { error: '메뉴얼을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // Check permission
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        teamId: manual.teamId,
      },
    })

    const isOwner = manual.ownerId === session.user.id
    const canEdit = isOwner || teamMember?.role === 'OWNER' || teamMember?.role === 'EDITOR'

    if (!canEdit) {
      return NextResponse.json(
        { error: '편집 권한이 없습니다' },
        { status: 403 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json(
        { error: '잘못된 요청 형식입니다' },
        { status: 400 }
      )
    }
    const validatedData = reorderBlockSchema.parse(body)

    // Update all block orders in a transaction
    await prisma.$transaction(
      validatedData.blocks.map((block) =>
        prisma.contentBlock.update({
          where: { id: block.id },
          data: { order: block.order },
        })
      )
    )

    // Update manual's updatedAt
    await prisma.manual.update({
      where: { id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Reorder blocks error:', error)
    return NextResponse.json(
      { error: '블록 순서 변경 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
