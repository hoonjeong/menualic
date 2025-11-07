import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const addShareSchema = z.object({
  userId: z.string(),
  permission: z.enum(['EDITOR', 'VIEWER']),
})

// POST /api/manual/[id]/share/team - Add team member to share
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
        team: {
          include: {
            members: true,
          },
        },
      },
    })

    if (!manual) {
      return NextResponse.json(
        { error: '메뉴얼을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // Check permission (only owner can manage sharing)
    if (manual.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: '메뉴얼 소유자만 공유할 수 있습니다' },
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
    const validatedData = addShareSchema.parse(body)

    // Check if user is team member
    const isTeamMember = manual.team.members.some(
      (member) => member.userId === validatedData.userId
    )

    if (!isTeamMember) {
      return NextResponse.json(
        { error: '팀원만 공유할 수 있습니다' },
        { status: 400 }
      )
    }

    // Check if already shared
    const existingShare = await prisma.manualShare.findUnique({
      where: {
        manualId_userId: {
          manualId: id,
          userId: validatedData.userId,
        },
      },
    })

    if (existingShare) {
      return NextResponse.json(
        { error: '이미 공유된 팀원입니다' },
        { status: 400 }
      )
    }

    // Create share
    const share = await prisma.manualShare.create({
      data: {
        manualId: id,
        userId: validatedData.userId,
        permission: validatedData.permission,
      },
      include: {
        user: true,
      },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        type: 'MANUAL_SHARED',
        title: '새 메뉴얼 공유',
        message: `"${manual.title}" 메뉴얼이 공유되었습니다`,
        userId: validatedData.userId,
        relatedId: manual.id,
      },
    })

    return NextResponse.json({
      success: true,
      share: {
        id: share.id,
        userId: share.userId,
        userName: share.user.name,
        userEmail: share.user.email,
        permission: share.permission,
        sharedAt: share.sharedAt.toISOString(),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Add share error:', error)
    return NextResponse.json(
      { error: '공유 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
