import prisma from '@/lib/prisma'

export async function nextReferenceId(prefix: 'USR' | 'MS' | 'ADM') {
  const table = prefix === 'USR' ? 'users' : 'Staff'
  const rows = await prisma.$queryRawUnsafe<Array<{ next: number }>>(
    `SELECT COALESCE(MAX(CAST(SPLIT_PART("referenceId", '-', 2) AS INTEGER)), 1000) + 1 AS next
     FROM "${table}"
     WHERE "referenceId" LIKE $1`,
    `${prefix}-%`,
  )

  return `${prefix}-${rows[0]?.next || 1001}`
}
