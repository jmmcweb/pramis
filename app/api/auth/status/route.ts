import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ status: 'UNAUTHENTICATED', approved: false }, { status: 401 })
  }

  const role = (session.user.role as string) ?? ''
  if (['SUPERADMIN', 'ADMIN', 'MEDSTAFF'].includes(role)) {
    return NextResponse.json({ status: 'ACTIVE', approved: true })
  }

  try {
    const user = await (prisma as any).user.findUnique({
      where: { id: session.user.id },
      select: { status: true },
    })
    const status = (user?.status as string) ?? 'PENDING'
    return NextResponse.json({ status, approved: status === 'ACTIVE' })
  } catch (error) {
    console.error('Failed to fetch user approval status:', error)
    return NextResponse.json({ status: 'PENDING', approved: false }, { status: 500 })
  }
}

