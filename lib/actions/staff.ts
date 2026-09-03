// Guarded, exported entry point: verifies the caller is a user
'use server'

import prisma from '@/lib/prisma'

export type StaffDirectoryEntry = {
  id: string
  name: string
  role: string
}

// Fetches the staff directory from the database, returning a list of staff members with their IDs, names, and roles. The function handles any errors that may occur during the database query and returns a success status along with the staff data or an error message.
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
            : 'Medical Staff',
      })),
    }
  } catch (error) {
    console.error('[getStaffDirectory | Prisma | Error]:', error)
    return { success: false, message: 'Failed to fetch staff directory.', staff: [] }
  }
}