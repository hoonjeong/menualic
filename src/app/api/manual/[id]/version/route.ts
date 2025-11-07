import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createVersionSchema = z.object({
  summary: z.string().optional(),
})

// GET /api/manual/[id]/version - Get version history
export async function GET(
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

    // Check permission - team members can view versions
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        teamId: manual.teamId,
      },
    })

    const isOwner = manual.ownerId === session.user.id
    const canView = isOwner || teamMember !== null

    if (!canView) {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      )
    }

    // Get versions
    const versions = await prisma.manualVersion.findMany({
      where: { manualId: id },
      include: {
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to 50 most recent versions
    })

    return NextResponse.json({
      versions: versions.map((v) => ({
        id: v.id,
        summary: v.summary,
        createdAt: v.createdAt.toISOString(),
        creatorName: v.creator.name,
        creatorEmail: v.creator.email,
      })),
    })
  } catch (error) {
    console.error('Get versions error:', error)
    return NextResponse.json(
      { error: '버전 이력을 불러오는 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/manual/[id]/version - Create version snapshot
export async function POST(
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
        sections: {
          include: {
            blocks: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!manual) {
      return NextResponse.json(
        { error: '메뉴얼을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // Check permission - editor or above can create versions
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
      body = {}
    }
    const validatedData = createVersionSchema.parse(body)

    // Create snapshot of current manual state
    const snapshot = {
      title: manual.title,
      description: manual.description,
      sections: manual.sections.map((section) => ({
        id: section.id,
        title: section.title,
        order: section.order,
        depth: section.depth,
        parentId: section.parentId,
        blocks: section.blocks.map((block) => ({
          id: block.id,
          type: block.type,
          content: block.content,
          order: block.order,
        })),
      })),
    }

    // Create version
    const version = await prisma.manualVersion.create({
      data: {
        manualId: id,
        createdBy: session.user.id,
        content: JSON.stringify(snapshot),
        summary: validatedData.summary || null,
      },
      include: {
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      version: {
        id: version.id,
        summary: version.summary,
        createdAt: version.createdAt.toISOString(),
        creatorName: version.creator.name,
        creatorEmail: version.creator.email,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Create version error:', error)
    return NextResponse.json(
      { error: '버전 저장 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
