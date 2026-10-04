

import { del, get, head, list, put } from '@vercel/blob'
import {
  BACKUP_FILE_EXT,
  BACKUP_ID_FILE_RE,
  BACKUP_MANIFEST_EXT,
  type CloudResult,
} from '@/lib/constants/backup'

export const BLOB_BACKUP_PREFIX = 'meditrack-backups'

export function isBlobConfigured(): boolean {
  if (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID) return true
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

function blobPathname(backupId: string, ext: string): string {
  return `${BLOB_BACKUP_PREFIX}/${backupId}${ext}`
}

async function readStreamToBuffer(
  stream: unknown,
): Promise<Buffer | null> {
  try {
    const chunks: Buffer[] = []
    const reader = (stream as ReadableStream<Uint8Array>).getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) chunks.push(Buffer.from(value))
    }
    return Buffer.concat(chunks)
  } catch (error) {
    console.error('[vercelBlob | read stream]:', error)
    return null
  }
}

export async function putSnapshotInBlob(
  backupId: string,
  snapshot: Buffer,
  manifest: unknown,
): Promise<CloudResult> {
  if (!isBlobConfigured()) {
    return {
      success: false,
      message: 'Vercel Blob is not configured on this deployment.',
      backupId,
    }
  }

  try {
    await put(blobPathname(backupId, BACKUP_FILE_EXT), snapshot, {
      access: 'private',
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: 'application/gzip',
    })

    try {
      await put(
        blobPathname(backupId, BACKUP_MANIFEST_EXT),
        JSON.stringify(manifest, null, 2),
        {
          access: 'private',
          allowOverwrite: true,
          addRandomSuffix: false,
          contentType: 'application/json',
        },
      )
    } catch (error) {
      console.error('[putSnapshotInBlob | manifest]:', error)
    }

    return {
      success: true,
      message: `Uploaded ${backupId} to Vercel Blob.`,
      backupId,
    }
  } catch (error) {
    console.error('[putSnapshotInBlob | Error]:', error)
    return {
      success: false,
      message: `Failed to upload ${backupId} to Vercel Blob.`,
      backupId,
    }
  }
}

export async function getSnapshotFromBlob(
  backupId: string,
): Promise<Buffer | null> {
  if (!isBlobConfigured()) return null

  try {
    const result = await get(blobPathname(backupId, BACKUP_FILE_EXT), {
      access: 'private',
    })
    if (!result) return null
    return await readStreamToBuffer(result.stream)
  } catch (error) {
    console.error('[getSnapshotFromBlob | Error]:', error)
    return null
  }
}

export async function getManifestFromBlob(
  backupId: string,
): Promise<any | null> {
  if (!isBlobConfigured()) return null

  try {
    const result = await get(blobPathname(backupId, BACKUP_MANIFEST_EXT), {
      access: 'private',
    })
    if (!result) return null

    const bytes = await readStreamToBuffer(result.stream)
    return bytes ? JSON.parse(bytes.toString('utf8')) : null
  } catch {
    return null
  }
}

export async function listBlobSnapshots(limit = 200): Promise<
  Array<{ backupId: string; sizeBytes: number; uploadedAt: string }>
> {
  if (!isBlobConfigured()) return []

  try {
    const result = await list({ prefix: `${BLOB_BACKUP_PREFIX}/`, limit })

    return result.blobs
      .filter((blob) => blob.pathname.endsWith(BACKUP_FILE_EXT))
      .map((blob) => {
        const file = blob.pathname.slice(blob.pathname.lastIndexOf('/') + 1)
        return {
          backupId: file
            .slice(0, -BACKUP_FILE_EXT.length)
            .replace(/\.[a-z0-9]+$/i, ''),
          sizeBytes: blob.size,
          uploadedAt: blob.uploadedAt.toISOString(),
        }
      })
      .filter((entry) => BACKUP_ID_FILE_RE.test(entry.backupId))
      .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
  } catch (error) {
    console.error('[listBlobSnapshots | Error]:', error)
    return []
  }
}

export async function deleteSnapshotFromBlob(
  backupId: string,
): Promise<CloudResult> {
  if (!isBlobConfigured()) {
    return {
      success: false,
      message: 'Vercel Blob is not configured on this deployment.',
      backupId,
    }
  }

  try {
    await del([
      blobPathname(backupId, BACKUP_FILE_EXT),
      blobPathname(backupId, BACKUP_MANIFEST_EXT),
    ])
    return {
      success: true,
      message: `Removed ${backupId} from Vercel Blob.`,
      backupId,
    }
  } catch (error) {
    console.error('[deleteSnapshotFromBlob | Error]:', error)
    return {
      success: false,
      message: `Failed to remove ${backupId} from Vercel Blob.`,
      backupId,
    }
  }
}

export async function blobHasSnapshot(backupId: string): Promise<boolean> {
  if (!isBlobConfigured()) return false
  try {
    await head(blobPathname(backupId, BACKUP_FILE_EXT))
    return true
  } catch {
    return false
  }
}