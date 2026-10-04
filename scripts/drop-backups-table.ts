

import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
})

async function main() {
  const before = await prisma.$queryRawUnsafe<Array<{ c: number }>>(
    `SELECT COUNT(*)::int c FROM information_schema.tables
      WHERE table_name = 'db_backups'`,
  )

  if (before[0].c === 0) {
    console.log('db_backups does not exist — nothing to do.')
    return
  }

  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "db_backups"')
  console.log('Dropped table db_backups.')
}

main()
  .catch((error) => {
    console.error('Failed:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())