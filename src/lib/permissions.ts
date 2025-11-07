import { prisma } from './prisma'

export type Permission = 'OWNER' | 'EDITOR' | 'VIEWER' | 'NONE'

interface PermissionResult {
  permission: Permission
  canEdit: boolean
  canDelete: boolean
  canShare: boolean
}

/**
 * Check user's permission for a manual
 * @param userId - User ID to check permissions for
 * @param manualId - Manual ID to check permissions on
 * @returns Permission result object
 */
export async function checkManualPermission(
  userId: string,
  manualId: string
): Promise<PermissionResult> {
  const manual = await prisma.manual.findUnique({
    where: { id: manualId },
    include: {
      team: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
    },
  })

  if (!manual) {
    return {
      permission: 'NONE',
      canEdit: false,
      canDelete: false,
      canShare: false,
    }
  }

  const isOwner = manual.ownerId === userId
  const teamMember = manual.team.members[0]

  let permission: Permission = 'NONE'
  if (isOwner || teamMember?.role === 'OWNER') {
    permission = 'OWNER'
  } else if (teamMember?.role === 'EDITOR') {
    permission = 'EDITOR'
  } else if (teamMember?.role === 'VIEWER') {
    permission = 'VIEWER'
  }

  return {
    permission,
    canEdit: permission === 'OWNER' || permission === 'EDITOR',
    canDelete: permission === 'OWNER',
    canShare: permission === 'OWNER',
  }
}

/**
 * Check if user has permission to edit a manual
 * @param userId - User ID to check
 * @param manualId - Manual ID to check
 * @returns true if user can edit, false otherwise
 */
export async function canEditManual(
  userId: string,
  manualId: string
): Promise<boolean> {
  const result = await checkManualPermission(userId, manualId)
  return result.canEdit
}

/**
 * Check user's permission for a team
 * @param userId - User ID to check permissions for
 * @param teamId - Team ID to check permissions on
 * @returns Team member role or 'NONE'
 */
export async function checkTeamPermission(
  userId: string,
  teamId: string
): Promise<'OWNER' | 'EDITOR' | 'VIEWER' | 'NONE'> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        where: { userId },
      },
    },
  })

  if (!team) {
    return 'NONE'
  }

  if (team.ownerId === userId) {
    return 'OWNER'
  }

  const member = team.members[0]
  return member?.role || 'NONE'
}
