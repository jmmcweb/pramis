import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import { authOptions } from '@/lib/authOptions'

export const metadata: Metadata = {
  title: 'Audit Logs | PRAMIS',
  description: 'Audit trail of every admin and medical staff action',
}

// Auth is enforced here; the MediTrackShell itself is provided once by the
// parent app/admin/layout.tsx, so this layout must not wrap it again.
export default async function AuditLogsLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const role = (session.user as any)?.role as string | undefined
  if (!['SUPERADMIN', 'ADMIN'].includes(role ?? '')) redirect('/admin')

  return <>{children}</>
}
