import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/manual/[id]/share - Get share settings
export async function GET(
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
            members: {
              include: {
                user: true,
              },
            },
          },
        },
        shares: {
          include: {
            user: true,
          },
        },
        externalLinks: {
          orderBy: {
            createdAt: 'desc',
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
        { error: '메뉴얼 소유자만 공유 설정을 관리할 수 있습니다' },
        { status: 403 }
      )
    }

    // Get team members (excluding owner)
    const teamMembers = manual.team.members
      .filter((member) => member.userId !== manual.ownerId)
      .map((member) => ({
        id: member.userId,
        name: member.user.name,
        email: member.user.email,
        role: member.role,
      }))

    // Get shared users
    const sharedUsers = manual.shares.map((share) => ({
      id: share.id,
      userId: share.userId,
      userName: share.user.name,
      userEmail: share.user.email,
      permission: share.permission,
      sharedAt: share.sharedAt.toISOString(),
    }))

    // Get external links
    const externalLinks = manual.externalLinks.map((link) => ({
      id: link.id,
      token: link.token,
      accessType: link.accessType,
      isActive: link.isActive,
      createdAt: link.createdAt.toISOString(),
      expiresAt: link.expiresAt?.toISOString() || null,
    }))

    return NextResponse.json({
      teamMembers,
      sharedUsers,
      externalLinks,
    })
  } catch (error) {
    console.error('Get share settings error:', error)
    return NextResponse.json(
      { error: '공유 설정을 불러오는 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
