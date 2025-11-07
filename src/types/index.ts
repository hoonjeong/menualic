import { Role, Permission, BlockType, AccessType, NotificationType, InvitationStatus } from '@prisma/client'

export type { Role, Permission, BlockType, AccessType, NotificationType, InvitationStatus }

export interface User {
  id: string
  email: string
  name: string
  profileImage?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Team {
  id: string
  name: string
  description?: string | null
  icon?: string | null
  ownerId: string
  createdAt: Date
  updatedAt: Date
}

export interface TeamMember {
  id: string
  userId: string
  teamId: string
  role: Role
  joinedAt: Date
  user?: User
}

export interface Manual {
  id: string
  title: string
  description?: string | null
  coverImage?: string | null
  teamId: string
  ownerId: string
  createdAt: Date
  updatedAt: Date
  team?: Team
  owner?: User
}

export interface ManualSection {
  id: string
  title: string
  order: number
  depth: number
  manualId: string
  parentId?: string | null
  createdAt: Date
  updatedAt: Date
  children?: ManualSection[]
  blocks?: ContentBlock[]
}

export interface ContentBlock {
  id: string
  type: BlockType
  content: string
  order: number
  sectionId: string
  createdAt: Date
  updatedAt: Date
}

export interface ManualShare {
  id: string
  manualId: string
  userId: string
  permission: Permission
  sharedAt: Date
  user?: User
}

export interface ExternalShareLink {
  id: string
  token: string
  accessType: AccessType
  isActive: boolean
  manualId: string
  createdAt: Date
  expiresAt?: Date | null
}

export interface ManualVersion {
  id: string
  manualId: string
  content: string
  summary?: string | null
  createdBy: string
  createdAt: Date
  creator?: User
}

export interface Invitation {
  id: string
  email: string
  role: Role
  token: string
  teamId: string
  senderId: string
  status: InvitationStatus
  expiresAt?: Date | null
  createdAt: Date
  team?: Team
  sender?: User
}

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  userId: string
  relatedId?: string | null
  createdAt: Date
}
