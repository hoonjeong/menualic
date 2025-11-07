import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const PASSWORD_MIN_LENGTH = parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10)

const signupSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다`)
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, '비밀번호는 영문과 숫자를 포함해야 합니다'),
  name: z.string().min(1, '이름을 입력해주세요'),
  invitationToken: z.string().nullish(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = signupSchema.parse(body)

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: '이미 사용 중인 이메일입니다' },
        { status: 400 }
      )
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10)
    const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
      },
    })

    // If there's an invitation token, process it
    if (validatedData.invitationToken) {
      const invitation = await prisma.invitation.findUnique({
        where: { token: validatedData.invitationToken },
        include: { team: true },
      })

      if (invitation && invitation.status === 'PENDING') {
        // Check if invitation is expired
        if (invitation.expiresAt && invitation.expiresAt < new Date()) {
          await prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: 'EXPIRED' },
          })
        } else {
          // Add user to team
          await prisma.teamMember.create({
            data: {
              userId: user.id,
              teamId: invitation.teamId,
              role: invitation.role,
            },
          })

          // Update invitation status
          await prisma.invitation.update({
            where: { id: invitation.id },
            data: {
              status: 'ACCEPTED',
              receiverId: user.id,
            },
          })

          // Create notification for team owner
          await prisma.notification.create({
            data: {
              userId: invitation.team.ownerId,
              type: 'MEMBER_JOINED',
              title: '새 팀원이 가입했습니다',
              message: `${user.name}님이 팀에 가입했습니다`,
              relatedId: invitation.teamId,
            },
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Signup error:', error)
    return NextResponse.json(
      { error: '회원가입 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
