import { NextResponse } from 'next/server'
import { createReadStream } from 'node:fs'
import { getServerSession } from 'next-auth'
import { Readable } from 'node:stream'
import { authOptions } from '@/lib/authOptions'
import { getBackupFileForDownload } from '@/lib/backup'
import { backupDownloadName } from '@/lib/constants/backup'
import { recordAudit } from '@/lib/actions/audit'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const backupId = searchParams.get('backupId')?.trim() ?? ''

  if (!backupId) {
    return NextResponse.json({ message: 'backupId is required.' }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role as string | undefined
  if (!session?.user?.id || !['SUPERADMIN', 'ADMIN'].includes(role ?? '')) {
    return NextResponse.json({ message: 'Not authorized.' }, { status: 403 })
  }

  const file = await getBackupFileForDownload(backupId)
  if (!file) {
    return NextResponse.json(
      { message: 'Backup file not found on disk or in Vercel Blob.' },
      { status: 404 },
    )
  }

  await recordAudit({
    action: 'VIEW',
    entity: 'BACKUP',
    entityId: backupId,
    description: `Downloaded database backup file ${backupId}.`,
    metadata: { backupId, source: file.path ? 'disk' : 'blob' },
  })

  const body: ReadableStream =
    file.path !== null
      ? (Readable.toWeb(createReadStream(file.path)) as unknown as ReadableStream)
      : new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(file.bytes!))
            controller.close()
          },
        })

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${backupDownloadName(backupId)}"`,
      'Cache-Control': 'no-store',
    },
  })
}
