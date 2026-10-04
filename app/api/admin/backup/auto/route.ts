import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { runAutomaticBackupIfDue } from '@/lib/backup'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') ?? ''

  const cronSecret = process.env.CRON_SECRET
  const hasValidSecret =
    Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`

  let authorized = hasValidSecret

  if (!authorized) {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role as string | undefined
    authorized = Boolean(
      session?.user?.id && ['SUPERADMIN', 'ADMIN'].includes(role ?? ''),
    )
  }

  if (!authorized) {
    return NextResponse.json(
      { success: false, message: 'Not authorized.' },
      { status: 403 },
    )
  }

  try {
    const result = await runAutomaticBackupIfDue()

    return NextResponse.json({
      success: result.success,
      created: result.created,
      message: result.message,
      backup: result.backup
        ? {
            backupId: result.backup.backupId,
            label: result.backup.label,
            rowCount: result.backup.rowCount,
            sizeBytes: result.backup.sizeBytes,
            createdAt: result.backup.createdAt,
          }
        : null,
      pruned: result.pruned,
    })
  } catch (error) {
    console.error('[backup/auto | Error]:', error)
    return NextResponse.json(
      { success: false, message: 'Automatic backup failed.' },
      { status: 500 },
    )
  }
}
