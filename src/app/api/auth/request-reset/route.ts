import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { z } from 'zod'

const requestResetSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = requestResetSchema.parse(body)

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: '이메일이 발송되었습니다. 메일함을 확인해주세요.',
      })
    }

    // Generate secure random token
    const tokenByteSize = parseInt(process.env.TOKEN_BYTE_SIZE || '32', 10)
    const tokenExpiry = parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY || '3600000', 10)
    const resetToken = crypto.randomBytes(tokenByteSize).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + tokenExpiry)

    // Save token to database
    await prisma.user.update({
      where: { email: validatedData.email },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    // Get base URL from environment or request headers
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || (() => {
      const host = request.headers.get('host') || 'localhost:3000'
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
      return `${protocol}://${host}`
    })()
    const resetUrl = `${baseUrl}/reset-password/${resetToken}`

    if (process.env.NODE_ENV === 'development') {
      console.log('\n=================================')
      console.log('비밀번호 재설정 링크:')
      console.log(resetUrl)
      console.log('=================================\n')
    }

    // TODO: Send email with reset link
    // await sendPasswordResetEmail(user.email, resetUrl)

    return NextResponse.json({
      success: true,
      message: '이메일이 발송되었습니다. 메일함을 확인해주세요.',
      // In development, include the link
      ...(process.env.NODE_ENV === 'development' && { resetUrl }),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Request reset error:', error)
    return NextResponse.json(
      { error: '비밀번호 재설정 요청 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
