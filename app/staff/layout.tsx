import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import { authOptions } from '@/lib/authOptions'
import MediTrackShell from '@/app/staff/MediTrackShell'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Dashboard',
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  return <MediTrackShell>{children}</MediTrackShell>
}
