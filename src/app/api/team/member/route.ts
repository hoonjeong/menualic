import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError, UnauthorizedError, BadRequestError, ForbiddenError } from '@/lib/errors'
import crypto from 'crypto'

// POST /api/team/member - Invite a member to team
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      throw new UnauthorizedError()
    }

    // Check if user is team owner
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
      },
      include: {
        team: true,
      },
    })

    if (!teamMember || teamMember.role !== 'OWNER') {
      throw new ForbiddenError('멤버를 초대할 권한이 없습니다')
    }

    const body = await request.json()
    const { email, role } = body

    if (!email || !role) {
      throw new BadRequestError('이메일과 역할을 입력해주세요')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new BadRequestError('유효하지 않은 이메일 형식입니다')
    }

    if (!['OWNER', 'EDITOR', 'VIEWER'].includes(role)) {
      throw new BadRequestError('유효하지 않은 역할입니다')
    }

    // Check if user is already in the team
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        teamMemberships: true,
      },
    })

    if (existingUser) {
      const isInTeam = existingUser.teamMemberships.some(
        (membership) => membership.teamId === teamMember.team.id
      )

      if (isInTeam) {
        throw new BadRequestError('이미 팀에 소속된 사용자입니다')
      }

      const hasOtherTeam = existingUser.teamMemberships.length > 0
      if (hasOtherTeam) {
        throw new BadRequestError('이미 다른 팀에 소속된 사용자입니다')
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        teamId: teamMember.team.id,
        status: 'PENDING',
      },
    })

    if (existingInvitation) {
      throw new BadRequestError('이미 초대 메일을 발송한 사용자입니다')
    }

    // Generate invitation token
    const tokenByteSize = parseInt(process.env.TOKEN_BYTE_SIZE || '32', 10)
    const invitationExpiryDays = parseInt(process.env.INVITATION_EXPIRY_DAYS || '7', 10)
    const token = crypto.randomBytes(tokenByteSize).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + invitationExpiryDays)

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        token,
        expiresAt,
        teamId: teamMember.team.id,
        senderId: session.user.id,
      },
      include: {
        team: {
          select: {
            name: true,
          },
        },
        sender: {
          select: {
            name: true,
          },
        },
      },
    })

    // Generate invitation link
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const invitationLink = `${baseUrl}/invite/${token}`

    // In development mode, log the invitation link
    if (process.env.NODE_ENV === 'development') {
      console.log('\n============================================')
      console.log('팀 초대 링크가 생성되었습니다:')
      console.log('============================================')
      console.log(`받는 사람: ${email}`)
      console.log(`팀 이름: ${invitation.team.name}`)
      console.log(`역할: ${role === 'OWNER' ? '소유자' : role === 'EDITOR' ? '편집자' : '뷰어'}`)
      console.log(`초대자: ${invitation.sender.name}`)
      console.log(`만료일: ${expiresAt.toLocaleDateString('ko-KR')}`)
      console.log('\n초대 링크:')
      console.log(invitationLink)
      console.log('============================================\n')
    }

    // TODO: In production, send email here
    // await sendInvitationEmail(email, invitationLink, invitation.team.name, invitation.sender.name)

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
      invitationLink: process.env.NODE_ENV === 'development' ? invitationLink : undefined,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
