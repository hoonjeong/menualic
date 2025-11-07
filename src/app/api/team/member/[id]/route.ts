import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError, UnauthorizedError, BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors'

// PUT /api/team/member/[id] - Change member role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      throw new UnauthorizedError()
    }

    const resolvedParams = await params
    const { id: memberId } = resolvedParams

    // Check if current user is team owner
    const currentUserMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
      },
      include: {
        team: true,
      },
    })

    if (!currentUserMember || currentUserMember.role !== 'OWNER') {
      throw new ForbiddenError('멤버 역할을 변경할 권한이 없습니다')
    }

    const body = await request.json()
    const { role } = body

    if (!role) {
      throw new BadRequestError('역할을 입력해주세요')
    }

    if (!['OWNER', 'EDITOR', 'VIEWER'].includes(role)) {
      throw new BadRequestError('유효하지 않은 역할입니다')
    }

    // Get member to update
    const memberToUpdate = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: {
        user: true,
      },
    })

    if (!memberToUpdate) {
      throw new NotFoundError('멤버를 찾을 수 없습니다')
    }

    // Check if member is in the same team
    if (memberToUpdate.teamId !== currentUserMember.teamId) {
      throw new ForbiddenError('다른 팀의 멤버입니다')
    }

    // Cannot change own role
    if (memberToUpdate.userId === session.user.id) {
      throw new BadRequestError('자신의 역할은 변경할 수 없습니다')
    }

    // Update member role
    const updatedMember = await prisma.teamMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ member: updatedMember })
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/team/member/[id] - Remove member from team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      throw new UnauthorizedError()
    }

    const resolvedParams = await params
    const { id: memberId } = resolvedParams

    // Check if current user is team owner
    const currentUserMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
      },
      include: {
        team: true,
      },
    })

    if (!currentUserMember || currentUserMember.role !== 'OWNER') {
      throw new ForbiddenError('멤버를 제거할 권한이 없습니다')
    }

    // Get member to remove
    const memberToRemove = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: {
        user: true,
      },
    })

    if (!memberToRemove) {
      throw new NotFoundError('멤버를 찾을 수 없습니다')
    }

    // Check if member is in the same team
    if (memberToRemove.teamId !== currentUserMember.teamId) {
      throw new ForbiddenError('다른 팀의 멤버입니다')
    }

    // Cannot remove self
    if (memberToRemove.userId === session.user.id) {
      throw new BadRequestError('자신을 제거할 수 없습니다')
    }

    // Remove member
    await prisma.teamMember.delete({
      where: { id: memberId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
