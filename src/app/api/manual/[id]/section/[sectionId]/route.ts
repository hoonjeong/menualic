import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSectionSchema = z.object({
  title: z.string().min(1, '섹션 제목을 입력해주세요').optional(),
  order: z.number().optional(),
})

// PUT /api/manual/[id]/section/[sectionId] - Update a section
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { id, sectionId } = await params
    const section = await prisma.manualSection.findUnique({
      where: { id: sectionId },
      include: {
        manual: {
          include: {
            team: true,
          },
        },
      },
    })

    if (!section) {
      return NextResponse.json(
        { error: '섹션을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // Check permission
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        teamId: section.manual.teamId,
      },
    })

    const isOwner = section.manual.ownerId === session.user.id
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
    const validatedData = updateSectionSchema.parse(body)

    // Update section
    const updatedSection = await prisma.manualSection.update({
      where: { id: sectionId },
      data: validatedData,
    })

    // Update manual's updatedAt
    await prisma.manual.update({
      where: { id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      section: updatedSection,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Update section error:', error)
    return NextResponse.json(
      { error: '섹션 수정 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/manual/[id]/section/[sectionId] - Delete a section
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { id, sectionId } = await params
    const section = await prisma.manualSection.findUnique({
      where: { id: sectionId },
      include: {
        manual: {
          include: {
            team: true,
          },
        },
      },
    })

    if (!section) {
      return NextResponse.json(
        { error: '섹션을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // Check permission
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        teamId: section.manual.teamId,
      },
    })

    const isOwner = section.manual.ownerId === session.user.id
    const canEdit = isOwner || teamMember?.role === 'OWNER' || teamMember?.role === 'EDITOR'

    if (!canEdit) {
      return NextResponse.json(
        { error: '편집 권한이 없습니다' },
        { status: 403 }
      )
    }

    // Delete section (will cascade to blocks and child sections)
    await prisma.manualSection.delete({
      where: { id: sectionId },
    })

    // Update manual's updatedAt
    await prisma.manual.update({
      where: { id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete section error:', error)
    return NextResponse.json(
      { error: '섹션 삭제 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
