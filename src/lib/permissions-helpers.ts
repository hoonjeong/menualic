/**
 * Permission helper functions
 * Centralizes permission checking logic to reduce duplication
 */

import { prisma } from './prisma'
import { ForbiddenError, NotFoundError } from './errors'

export interface ManualWithTeamMembers {
  id: string
  ownerId: string
  teamId: string
  team: {
    members: Array<{
      role: string
    }>
  }
}

/**
 * Check if user can edit manual (owner or team editor/owner)
 */
export function checkManualEditPermission(
  manual: ManualWithTeamMembers,
  userId: string
): void {
  const isOwner = manual.ownerId === userId
  const teamMember = manual.team.members[0]
  const canEdit = isOwner || teamMember?.role === 'OWNER' || teamMember?.role === 'EDITOR'

  if (!canEdit) {
    throw new ForbiddenError('편집 권한이 없습니다')
  }
}

/**
 * Get manual with user's team member info in one query
 */
export async function getManualWithUserAccess(
  manualId: string,
  userId: string
) {
  const manual = await prisma.manual.findUnique({
    where: { id: manualId },
    include: {
      team: {
        include: {
          members: {
            where: { userId },
            select: {
              role: true,
            },
          },
        },
      },
    },
  })

  if (!manual) {
    throw new NotFoundError('메뉴얼을 찾을 수 없습니다')
  }

  return manual
}

/**
 * Check and ensure user has edit permission for manual
 * Throws error if not found or no permission
 */
export async function requireManualEditAccess(
  manualId: string,
  userId: string
) {
  const manual = await getManualWithUserAccess(manualId, userId)
  checkManualEditPermission(manual, userId)
  return manual
}
