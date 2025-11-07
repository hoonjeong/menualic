/**
 * Reusable Prisma select/include objects
 * Centralizes commonly used query patterns to reduce duplication
 */

export const USER_BASE_SELECT = {
  id: true,
  name: true,
  email: true,
} as const

export const USER_FULL_SELECT = {
  ...USER_BASE_SELECT,
  profileImage: true,
  createdAt: true,
} as const

export const TEAM_MEMBER_WITH_USER = {
  include: {
    user: {
      select: USER_FULL_SELECT,
    },
  },
} as const

/**
 * Recursive section include for manual structure
 */
const SECTION_BLOCKS_INCLUDE = {
  blocks: {
    orderBy: { order: 'asc' as const },
    select: {
      id: true,
      type: true,
      content: true,
      order: true,
    },
  },
} as const

export const SECTION_RECURSIVE_INCLUDE = {
  ...SECTION_BLOCKS_INCLUDE,
  children: {
    orderBy: { order: 'asc' as const },
    include: {
      ...SECTION_BLOCKS_INCLUDE,
      children: {
        orderBy: { order: 'asc' as const },
        include: SECTION_BLOCKS_INCLUDE,
      },
    },
  },
} as const

export const MANUAL_FULL_INCLUDE = {
  owner: { select: USER_BASE_SELECT },
  team: {
    select: {
      id: true,
      name: true,
    },
  },
  sections: {
    orderBy: { order: 'asc' as const },
    where: { parentId: null },
    include: SECTION_RECURSIVE_INCLUDE,
  },
} as const

export const TEAM_WITH_MEMBERS = {
  owner: {
    select: USER_FULL_SELECT,
  },
  members: {
    include: {
      user: {
        select: USER_FULL_SELECT,
      },
    },
  },
} as const
