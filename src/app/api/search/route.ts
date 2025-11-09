import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/search?q={query} - Search across manuals, sections, and blocks
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        success: true,
        results: {
          manuals: [],
          sections: [],
          blocks: [],
        },
        totalResults: 0,
      })
    }

    const searchQuery = query.trim()

    // Get user's teams
    const userTeams = await prisma.teamMember.findMany({
      where: { userId: session.user.id },
      select: { teamId: true },
    })

    const teamIds = userTeams.map((tm) => tm.teamId)

    // Get manuals user can access (owned + team manuals + shared manuals)
    const accessibleManualIds = await prisma.manual.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          { teamId: { in: teamIds } },
          {
            shares: {
              some: { userId: session.user.id },
            },
          },
        ],
      },
      select: { id: true },
    })

    const manualIds = accessibleManualIds.map((m) => m.id)

    if (manualIds.length === 0) {
      return NextResponse.json({
        success: true,
        results: {
          manuals: [],
          sections: [],
          blocks: [],
        },
        totalResults: 0,
      })
    }

    // Search in parallel for better performance
    // Note: MySQL is case-insensitive by default, so we don't need mode: 'insensitive'
    const [manualResults, sectionResults, blockResults] = await Promise.all([
      // Search manuals
      prisma.manual.findMany({
        where: {
          id: { in: manualIds },
          OR: [
            { title: { contains: searchQuery } },
            { description: { contains: searchQuery } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          updatedAt: true,
          team: {
            select: {
              id: true,
              name: true,
            },
          },
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),

      // Search sections
      prisma.manualSection.findMany({
        where: {
          manualId: { in: manualIds },
          title: { contains: searchQuery },
        },
        select: {
          id: true,
          title: true,
          depth: true,
          manual: {
            select: {
              id: true,
              title: true,
              team: {
                select: {
                  name: true,
                },
              },
            },
          },
          parent: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      }),

      // Search blocks
      prisma.contentBlock.findMany({
        where: {
          section: {
            manualId: { in: manualIds },
          },
          content: { contains: searchQuery },
        },
        select: {
          id: true,
          type: true,
          content: true,
          section: {
            select: {
              id: true,
              title: true,
              manual: {
                select: {
                  id: true,
                  title: true,
                  team: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
    ])

    // Process block results to extract text preview
    const processedBlocks = blockResults.map((block) => {
      let preview = ''
      try {
        // Extract text from different block types
        if (block.type === 'BODY') {
          // HTML content - strip tags and get text
          const tempDiv = block.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
          preview = tempDiv.substring(0, 200)
        } else if (
          block.type === 'HEADING1' ||
          block.type === 'HEADING2' ||
          block.type === 'HEADING3'
        ) {
          // JSON with text field
          const parsed = JSON.parse(block.content)
          preview = parsed.text || ''
        } else if (block.type === 'TABLE') {
          // JSON with cells
          const parsed = JSON.parse(block.content)
          preview = 'Table content'
        } else {
          preview = block.content.substring(0, 200)
        }
      } catch (e) {
        preview = block.content.substring(0, 200)
      }

      // Highlight search query in preview
      // Escape special regex characters
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(${escapedQuery})`, 'gi')
      const highlightedPreview = preview.replace(regex, '<mark>$1</mark>')

      return {
        id: block.id,
        type: block.type,
        preview: highlightedPreview,
        rawPreview: preview,
        sectionId: block.section.id,
        sectionTitle: block.section.title,
        manualId: block.section.manual.id,
        manualTitle: block.section.manual.title,
        teamName: block.section.manual.team.name,
      }
    })

    const totalResults =
      manualResults.length + sectionResults.length + processedBlocks.length

    return NextResponse.json({
      success: true,
      results: {
        manuals: manualResults,
        sections: sectionResults,
        blocks: processedBlocks,
      },
      totalResults,
      query: searchQuery,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: '검색 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
