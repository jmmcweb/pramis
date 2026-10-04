

import { promises as fs } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import {
  BACKUP_DIR,
  BACKUP_FILE_EXT,
  BACKUP_ID_FILE_RE,
  BACKUP_MANIFEST_EXT,
  type BackupTrigger,
  type TableCounts,
} from '@/lib/constants/backup'
import {
  getManifestFromBlob,
  getSnapshotFromBlob,
  isBlobConfigured,
  listBlobSnapshots,
  putSnapshotInBlob,
} from '@/lib/vercelBlob'

/** The sidecar manifest. Also the catalogue entry for one snapshot. */
export type StoredManifest = {
  backupId: string
  label: string
  note: string | null
  trigger: BackupTrigger | string
  sizeBytes: number
  rowCount: number
  tableCounts: TableCounts
  checksum: string
  createdById: string | null
  createdByName: string | null
  createdByRole: string | null
  createdAt: string
  /** ISO timestamp of the last restore from this snapshot, or null. */
  restoredAt: string | null
}

function snapshotPath(backupId: string): string {
  return path.join(BACKUP_DIR, `${backupId}${BACKUP_FILE_EXT}`)
}

function manifestPath(backupId: string): string {
  return path.join(BACKUP_DIR, `${backupId}${BACKUP_MANIFEST_EXT}`)
}

/** Creates the store folder if needed. */
export async function ensureStoreDir(): Promise<void> {
  await fs.mkdir(BACKUP_DIR, { recursive: true })
}


export async function storeSnapshot(
  backupId: string,
  gzipped: Buffer,
  manifest: StoredManifest,
): Promise<{ checksum: string; storedInBlob: boolean }> {
  const checksum = createHash('sha256').update(gzipped).digest('hex')
  const withChecksum: StoredManifest = { ...manifest, checksum }
  await ensureStoreDir()

  try {
    const temp = `${snapshotPath(backupId)}.tmp`
    await fs.writeFile(temp, gzipped)
    await fs.rename(temp, snapshotPath(backupId))
    await writeManifest(backupId, withChecksum)
    return { checksum, storedInBlob: false }
  } catch (error) {
    console.error('[storeSnapshot | local write]:', error)
    if (!isBlobConfigured()) throw error

    const uploaded = await putSnapshotInBlob(backupId, gzipped, withChecksum)
    if (!uploaded.success) throw new Error(uploaded.message)
    return { checksum, storedInBlob: true }
  }
}

export async function writeManifest(
  backupId: string,
  manifest: StoredManifest,
): Promise<void> {
  await fs.writeFile(
    manifestPath(backupId),
    JSON.stringify(manifest, null, 2),
    'utf8',
  )
}

export async function readManifest(
  backupId: string,
): Promise<StoredManifest | null> {
  try {
    return JSON.parse(
      await fs.readFile(manifestPath(backupId), 'utf8'),
    ) as StoredManifest
  } catch {
    return (await getManifestFromBlob(backupId)) as StoredManifest | null
  }
}

export async function patchManifest(
  backupId: string,
  patch: Partial<StoredManifest>,
): Promise<StoredManifest | null> {
  const current = await readManifest(backupId)
  if (!current) return null

  const next = { ...current, ...patch }
  try {
    await writeManifest(backupId, next)
  } catch (error) {
    console.error('[patchManifest | local write]:', error)
    const bytes = await getSnapshotFromBlob(backupId)
    if (!bytes) throw error
    const uploaded = await putSnapshotInBlob(backupId, bytes, next)
    if (!uploaded.success) throw new Error(uploaded.message)
  }
  return next
}

export async function readSnapshotBytes(backupId: string): Promise<Buffer> {
  const local = await fs.readFile(snapshotPath(backupId)).catch(() => null)
  if (local) return local

  const blob = await getSnapshotFromBlob(backupId)
  if (blob) return blob

  throw new Error(`Snapshot file for ${backupId} was not found.`)
}

export async function snapshotExists(backupId: string): Promise<boolean> {
  try {
    await readSnapshotBytes(backupId)
    return true
  } catch {
    return false
  }
}

export async function snapshotChecksum(backupId: string): Promise<string | null> {
  try {
    const bytes = await readSnapshotBytes(backupId)
    return createHash('sha256').update(bytes).digest('hex')
  } catch {
    return null
  }
}

function recoveredManifest(backupId: string, sizeBytes: number): StoredManifest {
  return {
    backupId,
    label: `Recovered ${backupId}`,
    note: 'Recovered from storage.',
    trigger: 'MANUAL',
    sizeBytes,
    rowCount: 0,
    tableCounts: {},
    checksum: '',
    createdById: null,
    createdByName: null,
    createdByRole: null,
    createdAt: new Date().toISOString(),
    restoredAt: null,
  }
}

export async function listManifests(): Promise<StoredManifest[]> {
  const found: StoredManifest[] = []

  try {
    await ensureStoreDir()
    const entries = await fs.readdir(BACKUP_DIR)

    for (const entry of entries) {
      if (!entry.endsWith(BACKUP_FILE_EXT)) continue
      const backupId = entry.slice(0, -BACKUP_FILE_EXT.length)
      if (!BACKUP_ID_FILE_RE.test(backupId)) continue

      const manifest = await readManifest(backupId)
      found.push(manifest ?? recoveredManifest(backupId, 0))
    }
  } catch (error) {
    console.error('[listManifests | readdir]:', error)
  }

  if (isBlobConfigured()) {
    const seen = new Set(found.map((m) => m.backupId))
    for (const blob of await listBlobSnapshots()) {
      if (seen.has(blob.backupId)) continue
      const manifest = (await getManifestFromBlob(
        blob.backupId,
      )) as StoredManifest | null
      found.push(manifest ?? recoveredManifest(blob.backupId, blob.sizeBytes))
    }
  }

  return found.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function nextBackupId(): Promise<string> {
  const manifests = await listManifests()
  const highest = manifests.reduce((max, m) => {
    const n = Number.parseInt(m.backupId.split('-')[1] ?? '0', 10)
    return Number.isFinite(n) && n > max ? n : max
  }, 1000)

  return `BKP-${highest + 1}`
}

export async function deleteStored(backupId: string): Promise<void> {
  await Promise.all([
    fs.unlink(snapshotPath(backupId)).catch(() => {}),
    fs.unlink(manifestPath(backupId)).catch(() => {}),
  ])
}

export async function importSnapshot(
  backupId: string,
  bytes: Buffer,
  manifest: StoredManifest | null,
): Promise<StoredManifest> {
  const checksum = createHash('sha256').update(bytes).digest('hex')
  await ensureStoreDir()

  const temp = `${snapshotPath(backupId)}.tmp`
  await fs.writeFile(temp, bytes)
  await fs.rename(temp, snapshotPath(backupId))

  const resolved: StoredManifest = manifest
    ? { ...manifest, backupId, checksum }
    : {
        ...recoveredManifest(backupId, bytes.byteLength),
        note: 'Fetched from Google Drive.',
        restoredAt: null,
      }

  await writeManifest(backupId, resolved)
  return resolved
}
