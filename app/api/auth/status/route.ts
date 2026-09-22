import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'

function normalizeStatus(status: string) {
  if (status === 'INACTIVE') return 'REJECTED'
  return status
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ status: 'UNAUTHENTICATED', approved: false }, { status: 401 })
  }

  const role = (session.user.role as string) ?? ''
  if (['SUPERADMIN', 'ADMIN', 'MEDSTAFF'].includes(role)) {
    // Staff/admin accounts are archived by setting `deletedAt` on the staff
    // row. An archived account reports ARCHIVED so any active client session
    // polls, learns it was archived and signs itself out automatically.
    try {
      const staff = await (prisma as any).staff.findUnique({
        where: { staffid: session.user.id },
        select: { deletedAt: true },
      })
      if (staff?.deletedAt) {
        return NextResponse.json({ status: 'ARCHIVED', approved: false })
      }
    } catch (error) {
      console.error('Failed to fetch staff account status:', error)
    }
    return NextResponse.json({ status: 'ACTIVE', approved: true })
  }

  try {
    const user = await (prisma as any).user.findUnique({
      where: { id: session.user.id },
      select: { status: true },
    })
    const status = normalizeStatus((user?.status as string) ?? 'PENDING')
    return NextResponse.json({ status, approved: status === 'ACTIVE' })
  } catch (error) {
    console.error('Failed to fetch user approval status:', error)
    return NextResponse.json({ status: 'PENDING', approved: false }, { status: 500 })
  }
}

