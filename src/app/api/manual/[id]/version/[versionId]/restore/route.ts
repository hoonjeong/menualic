import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/manual/[id]/version/[versionId]/restore - Restore version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { id, versionId } = await params

    // Get manual with current state
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

    // Check permission - editor or above can restore
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

    // Get the version to restore
    const version = await prisma.manualVersion.findUnique({
      where: {
        id: versionId,
        manualId: id,
      },
    })

    if (!version) {
      return NextResponse.json(
        { error: '버전을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // Parse version content
    let snapshot
    try {
      snapshot = JSON.parse(version.content)
    } catch (e) {
      return NextResponse.json(
        { error: '버전 데이터가 손상되었습니다' },
        { status: 400 }
      )
    }

    // Restore version in transaction
    await prisma.$transaction(async (tx) => {
      // Delete all current sections and blocks (cascade will handle blocks)
      await tx.manualSection.deleteMany({
        where: { manualId: id },
      })

      // Update manual metadata
      await tx.manual.update({
        where: { id },
        data: {
          title: snapshot.title,
          description: snapshot.description,
          updatedAt: new Date(),
        },
      })

      // Recreate sections and blocks
      for (const section of snapshot.sections) {
        await tx.manualSection.create({
          data: {
            manualId: id,
            title: section.title,
            order: section.order,
            depth: section.depth,
            parentId: section.parentId,
            blocks: section.blocks && section.blocks.length > 0 ? {
              create: section.blocks.map((block: any) => ({
                type: block.type,
                content: block.content,
                order: block.order,
              })),
            } : undefined,
          },
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: '버전이 복원되었습니다',
    })
  } catch (error) {
    console.error('Restore version error:', error)
    return NextResponse.json(
      { error: '버전 복원 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
