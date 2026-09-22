import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import MediTrackShell from '@/app/staff/MediTrackShell'
import ArchivedAccountScreen from '@/components/staff/ArchivedAccountScreen'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Dashboard',
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  try {
    const staff = await (prisma as any).staff.findUnique({
      where: { staffid: session.user.id },
      select: { deletedAt: true },
    })
    if (staff?.deletedAt) return <ArchivedAccountScreen />
  } catch (error) {
    console.error('Failed to verify staff account status:', error)
  }

  return <MediTrackShell>{children}</MediTrackShell>
}
