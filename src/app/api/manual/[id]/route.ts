import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError, UnauthorizedError, NotFoundError, ForbiddenError } from '@/lib/errors'

// GET /api/manual/[id] - Get manual details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      throw new UnauthorizedError()
    }

    const resolvedParams = await params
    const { id } = resolvedParams
    const manual = await prisma.manual.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        sections: {
          orderBy: [
            { order: 'asc' },
          ],
          include: {
            blocks: {
              orderBy: { order: 'asc' },
            },
            children: {
              orderBy: { order: 'asc' },
              include: {
                blocks: {
                  orderBy: { order: 'asc' },
                },
                children: {
                  orderBy: { order: 'asc' },
                  include: {
                    blocks: {
                      orderBy: { order: 'asc' },
                    },
                  },
                },
              },
            },
          },
          where: {
            parentId: null, // Only get top-level sections
          },
        },
        shares: {
          where: {
            userId: session.user.id,
          },
        },
      },
    })

    if (!manual) {
      throw new NotFoundError('메뉴얼을 찾을 수 없습니다')
    }

    // Check if user has permission to view
    const isOwner = manual.ownerId === session.user.id
    const hasShare = manual.shares.length > 0

    // Check if user is in the same team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        teamId: manual.teamId,
      },
    })

    if (!isOwner && !hasShare && !teamMember) {
      throw new ForbiddenError('이 메뉴얼을 볼 권한이 없습니다')
    }

    // Determine user's permission
    let permission = 'VIEWER'
    if (isOwner || teamMember?.role === 'OWNER') {
      permission = 'OWNER'
    } else if (teamMember?.role === 'EDITOR') {
      permission = 'EDITOR'
    } else if (manual.shares.length > 0) {
      permission = manual.shares[0].permission
    }

    return NextResponse.json({
      manual,
      permission,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/manual/[id] - Delete a manual
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      throw new UnauthorizedError()
    }

    const resolvedParams = await params
    const { id } = resolvedParams

    const manual = await prisma.manual.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            members: {
              where: { userId: session.user.id },
            },
          },
        },
      },
    })

    if (!manual) {
      throw new NotFoundError('메뉴얼을 찾을 수 없습니다')
    }

    // Check if user is owner or team owner
    const isOwner = manual.ownerId === session.user.id
    const isTeamOwner = manual.team.members.some(m => m.role === 'OWNER')

    if (!isOwner && !isTeamOwner) {
      throw new ForbiddenError('메뉴얼을 삭제할 권한이 없습니다')
    }

    // Delete manual (will cascade to sections, blocks, shares, versions)
    await prisma.manual.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
