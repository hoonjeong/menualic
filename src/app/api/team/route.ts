import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createTeamSchema = z.object({
  name: z.string().min(1, '팀 이름을 입력해주세요').max(50, '팀 이름은 최대 50자까지 입력 가능합니다'),
  description: z.string().max(200, '팀 설명은 최대 200자까지 입력 가능합니다').optional(),
  icon: z.string().optional(),
})

// GET /api/team - Get user's team
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // Check if user already has a team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
      },
      include: {
        team: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
                name: true,
                profileImage: true,
              },
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                    profileImage: true,
                  },
                },
              },
            },
            manuals: {
              select: {
                id: true,
                title: true,
                updatedAt: true,
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
      return NextResponse.json({ team: null })
    }

    return NextResponse.json({
      team: teamMember.team,
      role: teamMember.role,
    })
  } catch (error) {
    console.error('Get team error:', error)
    return NextResponse.json(
      { error: '팀 정보를 가져오는 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/team - Create a team
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // Check if user already has a team
    const existingTeamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
      },
    })

    if (existingTeamMember) {
      return NextResponse.json(
        { error: '이미 팀에 소속되어 있습니다. 한 사용자는 하나의 팀에만 소속할 수 있습니다.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = createTeamSchema.parse(body)

    // Create team and team member in a transaction
    const team = await prisma.$transaction(async (tx) => {
      // Create team
      const newTeam = await tx.team.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          icon: validatedData.icon,
          ownerId: session.user.id,
        },
      })

      // Add creator as owner
      await tx.teamMember.create({
        data: {
          userId: session.user.id,
          teamId: newTeam.id,
          role: 'OWNER',
        },
      })

      return newTeam
    })

    return NextResponse.json({
      success: true,
      team,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Create team error:', error)
    return NextResponse.json(
      { error: '팀 생성 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// PUT /api/team - Update team info
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
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
      return NextResponse.json(
        { error: '팀 정보를 수정할 권한이 없습니다' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createTeamSchema.parse(body)

    // Update team
    const updatedTeam = await prisma.team.update({
      where: { id: teamMember.team.id },
      data: {
        name: validatedData.name,
        description: validatedData.description,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            profileImage: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                profileImage: true,
              },
            },
          },
        },
        manuals: {
          select: {
            id: true,
            title: true,
            updatedAt: true,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
    })

    return NextResponse.json({ team: updatedTeam })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Update team error:', error)
    return NextResponse.json(
      { error: '팀 정보 업데이트 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/team - Delete team
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // Check if user is team owner
    const team = await prisma.team.findFirst({
      where: {
        ownerId: session.user.id,
      },
    })

    if (!team) {
      return NextResponse.json(
        { error: '권한이 없거나 팀을 찾을 수 없습니다' },
        { status: 403 }
      )
    }

    // Delete team (cascade will handle members, manuals, etc.)
    await prisma.team.delete({
      where: { id: team.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete team error:', error)
    return NextResponse.json(
      { error: '팀 삭제 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
