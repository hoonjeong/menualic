import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/share/[token] - Get manual via external share link
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Find external share link
    const shareLink = await prisma.externalShareLink.findUnique({
      where: { token },
      include: {
        manual: {
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
    })

    if (!shareLink) {
      return NextResponse.json(
        { error: '유효하지 않은 공유 링크입니다' },
        { status: 404 }
      )
    }

    // Check if link is active
    if (!shareLink.isActive) {
      return NextResponse.json(
        { error: '비활성화된 링크입니다' },
        { status: 403 }
      )
    }

    // Check if link is expired
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      return NextResponse.json(
        { error: '만료된 링크입니다' },
        { status: 410 }
      )
    }

    const { manual, accessType } = shareLink

    // Build section tree
    const buildSectionTree = (sections: any[]) => {
      const sectionMap = new Map()
      const rootSections: any[] = []

      // First pass: create all sections
      sections.forEach((section) => {
        sectionMap.set(section.id, {
          ...section,
          children: [],
        })
      })

      // Second pass: build tree
      sections.forEach((section) => {
        const sectionWithChildren = sectionMap.get(section.id)
        if (section.parentId) {
          const parent = sectionMap.get(section.parentId)
          if (parent) {
            parent.children.push(sectionWithChildren)
          }
        } else {
          rootSections.push(sectionWithChildren)
        }
      })

      return rootSections
    }

    const sectionsTree = buildSectionTree(manual.sections)

    // If TITLE_ONLY, remove block content
    let responseSections = sectionsTree
    if (accessType === 'TITLE_ONLY') {
      const removeSectionContent = (sections: any[]): any[] => {
        return sections.map((section) => ({
          id: section.id,
          title: section.title,
          order: section.order,
          depth: section.depth,
          blocks: [], // Empty blocks for TITLE_ONLY
          children: section.children ? removeSectionContent(section.children) : [],
        }))
      }
      responseSections = removeSectionContent(sectionsTree)
    }

    return NextResponse.json({
      success: true,
      manual: {
        id: manual.id,
        title: manual.title,
        description: manual.description,
        owner: manual.owner,
        team: manual.team,
        sections: responseSections,
        createdAt: manual.createdAt.toISOString(),
        updatedAt: manual.updatedAt.toISOString(),
      },
      accessType,
    })
  } catch (error) {
    console.error('Get shared manual error:', error)
    return NextResponse.json(
      { error: '매뉴얼을 불러올 수 없습니다' },
      { status: 500 }
    )
  }
}
