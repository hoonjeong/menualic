import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { handleApiError } from '@/lib/errors'

const PASSWORD_MIN_LENGTH = parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10)

const resetPasswordSchema = z.object({
  token: z.string().min(1, '토큰이 필요합니다'),
  newPassword: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다`)
    .regex(/[a-zA-Z]/, '비밀번호에 영문자가 포함되어야 합니다')
    .regex(/[0-9]/, '비밀번호에 숫자가 포함되어야 합니다'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = resetPasswordSchema.parse(body)

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: validatedData.token,
        resetTokenExpiry: {
          gte: new Date(), // Token not expired
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: '유효하지 않거나 만료된 토큰입니다' },
        { status: 400 }
      )
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10)
    const hashedPassword = await bcrypt.hash(validatedData.newPassword, saltRounds)

    // Update password and clear reset token in a transaction
    await prisma.$transaction(async (tx) => {
      // Check token is still valid (prevent race condition)
      const currentUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { resetToken: true, resetTokenExpiry: true },
      })

      if (
        currentUser?.resetToken !== validatedData.token ||
        !currentUser?.resetTokenExpiry ||
        currentUser.resetTokenExpiry < new Date()
      ) {
        throw new Error('토큰이 이미 사용되었거나 만료되었습니다')
      }

      // Update password and clear token
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: '비밀번호가 성공적으로 재설정되었습니다',
    })
  } catch (error) {
    return handleApiError(error)
  }
}
