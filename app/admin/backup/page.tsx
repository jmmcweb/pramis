import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import BackupClient from './BackupClient'
import { getBackupOverview } from '@/lib/actions/backup'
import { authOptions } from '@/lib/authOptions'
import { runAutomaticBackupIfDue } from '@/lib/backup'

export default async function BackupPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  try {
    await runAutomaticBackupIfDue()
  } catch (error) {
    console.error('[admin/backup | scheduled backup]:', error)
  }

  const overview = await getBackupOverview()

  return <BackupClient initialOverview={overview} />
}
