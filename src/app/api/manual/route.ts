import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createManualSchema = z.object({
  title: z.string().min(1, '메뉴얼 제목을 입력해주세요').max(100, '제목은 최대 100자까지 입력 가능합니다'),
  description: z.string().max(500, '설명은 최대 500자까지 입력 가능합니다').optional(),
})

// GET /api/manual - Get user's manuals
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // Get user's team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
      },
      include: {
        team: {
          include: {
            manuals: {
              include: {
                owner: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                shares: {
                  where: {
                    userId: session.user.id,
                  },
                },
              },
              orderBy: {
                updatedAt: 'desc',
              },
            },
          },
        },
      },
    })

    if (!teamMember) {
      return NextResponse.json({ manuals: [] })
    }

    // Filter manuals based on user permissions
    const manuals = teamMember.team.manuals.filter(manual => {
      // User is owner
      if (manual.ownerId === session.user.id) return true
      // User has explicit share
      if (manual.shares.length > 0) return true
      return false
    })

    return NextResponse.json({ manuals })
  } catch (error) {
    console.error('Get manuals error:', error)
    return NextResponse.json(
      { error: '메뉴얼 목록을 가져오는 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/manual - Create a manual
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // Get user's team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
      },
      include: {
        team: true,
      },
    })

    if (!teamMember) {
      return NextResponse.json(
        { error: '팀에 소속되어 있지 않습니다' },
        { status: 400 }
      )
    }

    // Check if user has permission to create manuals (OWNER or EDITOR)
    if (teamMember.role === 'VIEWER') {
      return NextResponse.json(
        { error: '메뉴얼을 생성할 권한이 없습니다' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createManualSchema.parse(body)

    // Create manual
    const manual = await prisma.manual.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        teamId: teamMember.teamId,
        ownerId: session.user.id,
      },
      include: {
        sections: true,
      },
    })

    // Create initial version
    await prisma.manualVersion.create({
      data: {
        manualId: manual.id,
        content: JSON.stringify({
          title: manual.title,
          sections: [],
        }),
        summary: '초기 버전',
        createdBy: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      manual,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Create manual error:', error)
    return NextResponse.json(
      { error: '메뉴얼 생성 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
