import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError, UnauthorizedError, BadRequestError, NotFoundError } from '@/lib/errors'

// GET /api/invite/[token] - Get invitation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await params
    const { token } = resolvedParams

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        sender: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!invitation) {
      throw new NotFoundError('초대 링크를 찾을 수 없습니다')
    }

    // Check if invitation is expired
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      })
      throw new BadRequestError('초대 링크가 만료되었습니다')
    }

    // Check if invitation is still pending
    if (invitation.status !== 'PENDING') {
      throw new BadRequestError(
        invitation.status === 'ACCEPTED'
          ? '이미 수락된 초대입니다'
          : invitation.status === 'REJECTED'
          ? '거절된 초대입니다'
          : '유효하지 않은 초대입니다'
      )
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        team: invitation.team,
        sender: invitation.sender,
        expiresAt: invitation.expiresAt,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/invite/[token] - Accept invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      throw new UnauthorizedError()
    }

    const resolvedParams = await params
    const { token } = resolvedParams

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        team: true,
      },
    })

    if (!invitation) {
      throw new NotFoundError('초대 링크를 찾을 수 없습니다')
    }

    // Check if invitation is expired
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      })
      throw new BadRequestError('초대 링크가 만료되었습니다')
    }

    // Check if invitation is still pending
    if (invitation.status !== 'PENDING') {
      throw new BadRequestError('이미 처리된 초대입니다')
    }

    // Check if user's email matches invitation email
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        teamMemberships: true,
      },
    })

    if (!currentUser) {
      throw new UnauthorizedError()
    }

    if (currentUser.email !== invitation.email) {
      throw new BadRequestError('초대받은 이메일과 로그인한 계정의 이메일이 다릅니다')
    }

    // Check if user is already in a team
    if (currentUser.teamMemberships.length > 0) {
      throw new BadRequestError('이미 다른 팀에 소속되어 있습니다')
    }

    // Add user to team and update invitation
    await prisma.$transaction([
      prisma.teamMember.create({
        data: {
          userId: currentUser.id,
          teamId: invitation.teamId,
          role: invitation.role,
        },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          receiverId: currentUser.id,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      team: invitation.team,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
