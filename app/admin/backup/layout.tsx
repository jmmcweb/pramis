import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import { authOptions } from '@/lib/authOptions'

export const metadata: Metadata = {
  title: 'Database Backup | PRAMIS',
  description:
    'Create, schedule and restore snapshots of the MediTrack database',
}

export default async function BackupLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const role = (session.user as any)?.role as string | undefined
  if (!['SUPERADMIN', 'ADMIN'].includes(role ?? '')) redirect('/admin')

  return <>{children}</>
}
