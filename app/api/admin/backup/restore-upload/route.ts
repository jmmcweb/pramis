import { revalidatePath, revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { recordAudit } from '@/lib/actions/audit'
import { requireAdmin } from '@/lib/actions/guard'
import { restoreBackupFromUpload } from '@/lib/backup'

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024

export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json(
      {
        success: false,
        message: 'You are not authorized to restore database backups.',
      },
      { status: 403 },
    )
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        success: false,
        message: 'The backup file exceeds the 100 MB upload limit.',
      },
      { status: 413 },
    )
  }

  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'Choose a JSON backup file to restore.' },
        { status: 400 },
      )
    }
    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          success: false,
          message:
            file.size === 0
              ? 'The selected backup file is empty.'
              : 'The backup file exceeds the 100 MB upload limit.',
        },
        { status: file.size === 0 ? 400 : 413 },
      )
    }

    const result = await restoreBackupFromUpload(
      Buffer.from(await file.arrayBuffer()),
      {
        id: session.user?.id ?? null,
        name: session.user?.name ?? session.user?.email ?? null,
        role: session.user?.role ?? null,
      },
    )

    await recordAudit({
      action: 'RESTORE',
      entity: 'BACKUP',
      entityId: result.importedBackupId ?? null,
      description: result.success
        ? `Restored the database from uploaded backup ${result.importedBackupId}.`
        : `Failed to restore an uploaded database backup: ${result.message}`,
      status: result.success ? 'SUCCESS' : 'FAILURE',
      metadata: {
        source: 'upload',
        backupId: result.importedBackupId ?? null,
        restoredRows: result.restoredRows ?? 0,
        safetyBackupId: result.safetyBackupId ?? null,
      },
    })

    if (result.success) {
      for (const tag of [
        'users',
        'patients',
        'appointments',
        'queues',
        'events',
        'services',
        'me',
      ]) {
        try {
          revalidateTag(tag, 'max')
        } catch {}
      }
      revalidatePath('/admin', 'layout')
    }

    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error('[restore-upload | Error]:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'The uploaded backup could not be processed.',
      },
      { status: 500 },
    )
  }
}
