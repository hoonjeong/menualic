import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // Clear existing data
  await prisma.contentBlock.deleteMany()
  await prisma.manualSection.deleteMany()
  await prisma.manualVersion.deleteMany()
  await prisma.externalShareLink.deleteMany()
  await prisma.manualShare.deleteMany()
  await prisma.manual.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.invitation.deleteMany()
  await prisma.teamMember.deleteMany()
  await prisma.team.deleteMany()
  await prisma.user.deleteMany()

  // Create test user
  const hashedPassword = await bcrypt.hash('password123', 10)
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: '테스트 사용자',
      password: hashedPassword,
    },
  })

  console.log('Created user:', user.email)

  // Create test team
  const team = await prisma.team.create({
    data: {
      name: '테스트 팀',
      description: '테스트용 팀입니다',
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  })

  console.log('Created team:', team.name)

  // Create test manual
  const manual = await prisma.manual.create({
    data: {
      title: '테스트 메뉴얼',
      description: '이것은 테스트용 메뉴얼입니다',
      teamId: team.id,
      ownerId: user.id,
    },
  })

  console.log('Created manual:', manual.title)

  // Create manual sections
  const section1 = await prisma.manualSection.create({
    data: {
      title: '1. 시작하기',
      order: 1,
      depth: 1,
      manualId: manual.id,
    },
  })

  await prisma.contentBlock.create({
    data: {
      type: 'HEADING1',
      content: JSON.stringify({ text: '시작하기' }),
      order: 1,
      sectionId: section1.id,
    },
  })

  await prisma.contentBlock.create({
    data: {
      type: 'BODY',
      content: JSON.stringify({ text: '이 메뉴얼은 테스트용 메뉴얼입니다. 여기에서 서비스 사용 방법을 배울 수 있습니다.' }),
      order: 2,
      sectionId: section1.id,
    },
  })

  const subsection1 = await prisma.manualSection.create({
    data: {
      title: '1.1 설치 방법',
      order: 1,
      depth: 2,
      manualId: manual.id,
      parentId: section1.id,
    },
  })

  await prisma.contentBlock.create({
    data: {
      type: 'HEADING2',
      content: JSON.stringify({ text: '설치 방법' }),
      order: 1,
      sectionId: subsection1.id,
    },
  })

  await prisma.contentBlock.create({
    data: {
      type: 'CODE',
      content: JSON.stringify({ language: 'bash', code: 'npm install menualic' }),
      order: 2,
      sectionId: subsection1.id,
    },
  })

  const section2 = await prisma.manualSection.create({
    data: {
      title: '2. 기본 사용법',
      order: 2,
      depth: 1,
      manualId: manual.id,
    },
  })

  await prisma.contentBlock.create({
    data: {
      type: 'HEADING1',
      content: JSON.stringify({ text: '기본 사용법' }),
      order: 1,
      sectionId: section2.id,
    },
  })

  await prisma.contentBlock.create({
    data: {
      type: 'BODY',
      content: JSON.stringify({ text: '메뉴얼 작성은 매우 간단합니다. 에디터에서 블록을 추가하고 내용을 입력하세요.' }),
      order: 2,
      sectionId: section2.id,
    },
  })

  console.log('Created sections and blocks')

  // Create another manual
  const manual2 = await prisma.manual.create({
    data: {
      title: 'API 문서',
      description: 'API 사용 가이드',
      teamId: team.id,
      ownerId: user.id,
    },
  })

  const apiSection = await prisma.manualSection.create({
    data: {
      title: 'API 개요',
      order: 1,
      depth: 1,
      manualId: manual2.id,
    },
  })

  await prisma.contentBlock.create({
    data: {
      type: 'HEADING1',
      content: JSON.stringify({ text: 'API 개요' }),
      order: 1,
      sectionId: apiSection.id,
    },
  })

  await prisma.contentBlock.create({
    data: {
      type: 'BODY',
      content: JSON.stringify({ text: 'REST API를 사용하여 메뉴얼을 관리할 수 있습니다.' }),
      order: 2,
      sectionId: apiSection.id,
    },
  })

  console.log('Created second manual:', manual2.title)

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
