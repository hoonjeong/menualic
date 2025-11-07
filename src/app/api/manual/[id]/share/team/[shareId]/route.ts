import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updatePermissionSchema = z.object({
  permission: z.enum(['EDITOR', 'VIEWER']),
})

// PUT /api/manual/[id]/share/team/[shareId] - Update share permission
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { id, shareId } = await params
    const manual = await prisma.manual.findUnique({
      where: { id },
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
        { error: '메뉴얼 소유자만 권한을 변경할 수 있습니다' },
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
    const validatedData = updatePermissionSchema.parse(body)

    // Update share
    const share = await prisma.manualShare.update({
      where: {
        id: shareId,
        manualId: id,
      },
      data: {
        permission: validatedData.permission,
      },
      include: {
        user: true,
      },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        type: 'PERMISSION_CHANGED',
        title: '권한 변경',
        message: `"${manual.title}" 메뉴얼의 권한이 ${validatedData.permission === 'EDITOR' ? '편집자' : '뷰어'}로 변경되었습니다`,
        userId: share.userId,
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

    console.error('Update permission error:', error)
    return NextResponse.json(
      { error: '권한 변경 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/manual/[id]/share/team/[shareId] - Remove share
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { id, shareId } = await params
    const manual = await prisma.manual.findUnique({
      where: { id },
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
        { error: '메뉴얼 소유자만 공유를 해제할 수 있습니다' },
        { status: 403 }
      )
    }

    // Delete share
    await prisma.manualShare.delete({
      where: {
        id: shareId,
        manualId: id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove share error:', error)
    return NextResponse.json(
      { error: '공유 해제 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
