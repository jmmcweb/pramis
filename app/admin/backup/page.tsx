import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import BackupClient from './BackupClient'
import { getBackupOverview } from '@/lib/actions/backup'
import { authOptions } from '@/lib/authOptions'

export const maxDuration = 300

export default async function BackupPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const overview = await getBackupOverview()

  return <BackupClient initialOverview={overview} />
}
