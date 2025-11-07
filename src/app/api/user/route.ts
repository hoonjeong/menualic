import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError, UnauthorizedError, BadRequestError } from '@/lib/errors'
import bcrypt from 'bcryptjs'

// GET /api/user - Get current user info
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      throw new UnauthorizedError()
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    if (!user) {
      throw new UnauthorizedError()
    }

    return NextResponse.json({ user })
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/user - Update user info
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      throw new UnauthorizedError()
    }

    const body = await request.json()
    const { name, currentPassword, newPassword } = body

    // Validate input
    if (!name || name.trim() === '') {
      throw new BadRequestError('이름을 입력해주세요')
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      throw new UnauthorizedError()
    }

    // Update name
    const updateData: { name: string; password?: string } = {
      name: name.trim(),
    }

    // If password change is requested
    if (currentPassword && newPassword) {
      const isValidPassword = await bcrypt.compare(currentPassword, user.password)

      if (!isValidPassword) {
        throw new BadRequestError('현재 비밀번호가 일치하지 않습니다')
      }

      const passwordMinLength = parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10)
      if (newPassword.length < passwordMinLength) {
        throw new BadRequestError(`새 비밀번호는 최소 ${passwordMinLength}자 이상이어야 합니다`)
      }

      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10)
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds)
      updateData.password = hashedPassword
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    return handleApiError(error)
  }
}
