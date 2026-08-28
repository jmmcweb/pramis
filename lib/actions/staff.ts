'use server'

import prisma from '@/lib/prisma'

export type StaffDirectoryEntry = {
  id: string
  name: string
  role: string
}


export async function getStaffDirectory(): Promise<{
  success: boolean
  message: string
  staff: StaffDirectoryEntry[]
}> {
  try {
    const rows = await (prisma as any).staff.findMany({
      orderBy: { createdAt: 'asc' },
    })
    return {
      success: true,
      message: 'Staff directory fetched.',
      staff: rows.map((s: any) => ({
        id: s.staffid,
        name: `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim(),
        role:
          s.role === 'ADMIN'
            ? 'Admin'
            : s.role === 'MIDWIFE'
              ? 'Midwife'
              : 'Medical Staff',
      })),
    }
  } catch (error) {
    console.error('[getStaffDirectory | Prisma | Error]:', error)
    return { success: false, message: 'Failed to fetch staff directory.', staff: [] }
  }
}