import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateLinkSchema = z.object({
  isActive: z.boolean(),
})

// PUT /api/manual/[id]/share/external/[linkId] - Toggle link active status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { id, linkId } = await params
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
        { error: '메뉴얼 소유자만 링크 상태를 변경할 수 있습니다' },
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
    const validatedData = updateLinkSchema.parse(body)

    // Update link
    const link = await prisma.externalShareLink.update({
      where: {
        id: linkId,
        manualId: id,
      },
      data: {
        isActive: validatedData.isActive,
      },
    })

    return NextResponse.json({
      success: true,
      link: {
        id: link.id,
        token: link.token,
        accessType: link.accessType,
        isActive: link.isActive,
        createdAt: link.createdAt.toISOString(),
        expiresAt: link.expiresAt?.toISOString() || null,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Update external link error:', error)
    return NextResponse.json(
      { error: '링크 상태 변경 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
