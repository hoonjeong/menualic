import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateBlockSchema = z.object({
  content: z.string().optional(),
  order: z.number().optional(),
})

// PUT /api/manual/[id]/block/[blockId] - Update a block
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { id, blockId } = await params
    const block = await prisma.contentBlock.findUnique({
      where: { id: blockId },
      include: {
        section: {
          include: {
            manual: {
              include: {
                team: true,
              },
            },
          },
        },
      },
    })

    if (!block) {
      return NextResponse.json(
        { error: '블록을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // Check permission
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        teamId: block.section.manual.teamId,
      },
    })

    const isOwner = block.section.manual.ownerId === session.user.id
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
    const validatedData = updateBlockSchema.parse(body)

    // Update block
    const updatedBlock = await prisma.contentBlock.update({
      where: { id: blockId },
      data: validatedData,
    })

    // Update manual's updatedAt
    await prisma.manual.update({
      where: { id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      block: updatedBlock,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Update block error:', error)
    return NextResponse.json(
      { error: '블록 수정 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/manual/[id]/block/[blockId] - Delete a block
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { id, blockId } = await params
    const block = await prisma.contentBlock.findUnique({
      where: { id: blockId },
      include: {
        section: {
          include: {
            manual: {
              include: {
                team: true,
              },
            },
          },
        },
      },
    })

    if (!block) {
      return NextResponse.json(
        { error: '블록을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // Check permission
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        teamId: block.section.manual.teamId,
      },
    })

    const isOwner = block.section.manual.ownerId === session.user.id
    const canEdit = isOwner || teamMember?.role === 'OWNER' || teamMember?.role === 'EDITOR'

    if (!canEdit) {
      return NextResponse.json(
        { error: '편집 권한이 없습니다' },
        { status: 403 }
      )
    }

    // Delete block
    await prisma.contentBlock.delete({
      where: { id: blockId },
    })

    // Update manual's updatedAt
    await prisma.manual.update({
      where: { id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete block error:', error)
    return NextResponse.json(
      { error: '블록 삭제 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
