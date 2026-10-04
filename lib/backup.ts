import { createHash } from 'node:crypto'
import { promises as fs, existsSync } from 'node:fs'
import path from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'
import prisma from '@/lib/prisma'
import {
  AUTO_BACKUP_INTERVAL_HOURS,
  AUTO_BACKUP_RETENTION,
  BACKUP_DIR,
  BACKUP_FILE_EXT,
  BACKUP_ID_FILE_RE,
  BACKUP_MIRROR_TO_DRIVE,
  BACKUP_TABLES,
  BACKUP_TABLES_BY_RESTORE_ORDER,
  RESTORE_CHUNK_SIZE,
  backupFilePath,
  buildBackupLabel,
  cloudManifestPath,
  cloudSnapshotPath,
  type BackupTrigger,
  type CloudBackupFile,
  type CloudResult,
  type CloudStatus,
} from '@/lib/constants/backup'
import {
  getCloudStatus,
  listDriveFiles,
  pullFromDrive,
  pushSnapshotToDrive,
  registerFetchHook,
  removeFromDrive,
} from '@/lib/cloudBackup'
import {
  blobHasSnapshot,
  deleteSnapshotFromBlob,
  isBlobConfigured,
  listBlobSnapshots,
  putSnapshotInBlob,
  BLOB_BACKUP_PREFIX,
} from '@/lib/vercelBlob'
import {
  deleteStored,
  importSnapshot,
  listManifests,
  nextBackupId,
  patchManifest,
  readManifest,
  readSnapshotBytes,
  snapshotChecksum,
  snapshotExists,
  storeSnapshot,
  type StoredManifest,
} from '@/lib/backupStore'

export type BackupActor = {
  id?: string | null
  name?: string | null
  role?: string | null
} | null

export type TableCounts = Record<string, number>

export type BackupSnapshot = {
  version: 1
  createdAt: string
  tableCounts: TableCounts
  tables: Record<string, Record<string, unknown>[]>
}

export type BackupRecord = {
  backupId: string
  label: string
  note: string | null
  trigger: string
  sizeBytes: number
  rowCount: number
  tableCounts: TableCounts
  createdById: string | null
  createdByName: string | null
  createdByRole: string | null
  createdAt: string
  restoredAt: string | null
}

export type CreateBackupInput = {
  label?: string
  note?: string | null
  trigger?: BackupTrigger
  actor?: BackupActor
}

export type CreateBackupResult = {
  success: boolean
  message: string
  backup?: BackupRecord
  /** Set when the snapshot was also copied to the Google Drive mirror. */
  cloud?: CloudResult
}

export type RestoreBackupResult = {
  success: boolean
  message: string
  restoredRows?: number
  safetyBackupId?: string
}

export type AutomaticBackupResult = {
  success: boolean
  message: string
  created: boolean
  backup?: BackupRecord
  pruned: string[]
}

const RESTORE_LOCK_KEY = 8_675_309

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'bigint') return value.toString()
  if (Buffer.isBuffer(value)) return value.toString('base64')
  if (Array.isArray(value)) return value.map(normalizeValue)

  const ctor = (value as { constructor?: { name?: string } })?.constructor?.name
  if (ctor && ctor.startsWith('Decimal')) return String(value)

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = normalizeValue(inner)
    }
    return out
  }

  return value
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) out[key] = normalizeValue(value)
  return out
}


type ColumnType = 'json' | 'numeric' | 'plain'

type TableColumns = Record<string, ColumnType>

let columnCache: Map<string, TableColumns> | null = null

async function loadTableColumns(): Promise<Map<string, TableColumns>> {
  if (columnCache) return columnCache

  const rows = await prisma.$queryRawUnsafe<
    Array<{ table_name: string; column_name: string; data_type: string }>
  >(
    `SELECT table_name::text AS table_name,
            column_name::text AS column_name,
            data_type::text AS data_type
       FROM information_schema.columns
      WHERE table_schema = 'public'`,
  )

  const map = new Map<string, TableColumns>()
  for (const row of rows) {
    const columns = map.get(row.table_name) ?? {}
    let type: ColumnType = 'plain'
    if (row.data_type === 'json' || row.data_type === 'jsonb') {
      type = 'json'
    } else if (
      row.data_type === 'numeric' ||
      row.data_type === 'decimal' ||
      row.data_type === 'money'
    ) {
      type = 'numeric'
    }
    columns[row.column_name] = type
    map.set(row.table_name, columns)
  }

  columnCache = map
  return map
}

export function resetBackupColumnCache(): void {
  columnCache = null
}

async function ensureBackupDir(): Promise<void> {
  await fs.mkdir(BACKUP_DIR, { recursive: true })
}

async function writeBackupFiles(
  backupId: string,
  snapshot: BackupSnapshot,
  meta: Omit<
    BackupRecord,
    'backupId' | 'createdAt' | 'restoredAt' | 'sizeBytes' | 'checksum'
  >,
): Promise<{ sizeBytes: number; checksum: string; storedInBlob: boolean }> {
  const gzipped = gzipSync(Buffer.from(JSON.stringify(snapshot), 'utf8'), {
    level: 9,
  })

  const { checksum, storedInBlob } = await storeSnapshot(backupId, gzipped, {
    backupId,
    ...meta,
    sizeBytes: gzipped.byteLength,
    checksum: '', // filled in by storeSnapshot
    restoredAt: null,
    createdAt: new Date().toISOString(),
  })

  return { sizeBytes: gzipped.byteLength, checksum, storedInBlob }
}

async function readBackupFile(backupId: string): Promise<BackupSnapshot> {
  const raw = await readSnapshotBytes(backupId)
  const json = gunzipSync(raw).toString('utf8')
  const parsed = JSON.parse(json) as BackupSnapshot
  if (parsed?.version !== 1 || typeof parsed.tables !== 'object') {
    throw new Error('Unrecognised backup file format.')
  }
  return parsed
}

async function checksumMatches(
  backupId: string,
  expected: string,
): Promise<boolean> {
  if (!expected) return true // nothing recorded; skip the check
  const actual = await snapshotChecksum(backupId)
  return actual !== null && actual === expected
}

function toBackupRecord(manifest: StoredManifest): BackupRecord {
  return {
    backupId: manifest.backupId,
    label: manifest.label,
    note: manifest.note ?? null,
    trigger: manifest.trigger,
    sizeBytes: manifest.sizeBytes ?? 0,
    rowCount: manifest.rowCount ?? 0,
    tableCounts: (manifest.tableCounts ?? {}) as TableCounts,
    createdById: manifest.createdById ?? null,
    createdByName: manifest.createdByName ?? null,
    createdByRole: manifest.createdByRole ?? null,
    createdAt: manifest.createdAt,
    restoredAt: manifest.restoredAt ?? null,
  }
}

async function getBackupRecordFromManifest(
  backupId: string,
  fallback: Omit<StoredManifest, 'backupId'>,
): Promise<BackupRecord> {
  const manifest = await readManifest(backupId)
  return toBackupRecord(manifest ?? { backupId, ...fallback })
}

export async function listBackups(limit = 50): Promise<BackupRecord[]> {
  const manifests = await listManifests()
  return manifests.slice(0, limit).map(toBackupRecord)
}

export async function getBackup(
  backupId: string,
): Promise<BackupRecord | null> {
  if (!backupId) return null
  const manifest = await readManifest(backupId)
  return manifest ? toBackupRecord(manifest) : null
}

export async function getCurrentTableCounts(): Promise<TableCounts> {
  const counts: TableCounts = {}
  for (const { table } of BACKUP_TABLES) {
    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM "${table}"`,
    )
    counts[table] = Number(rows[0]?.count ?? 0)
  }
  return counts
}

export async function createBackup(
  input: CreateBackupInput = {},
): Promise<CreateBackupResult> {
  const trigger: BackupTrigger = input.trigger ?? 'MANUAL'
  const label = input.label?.trim() || buildBackupLabel()

  try {
    const tables: Record<string, Record<string, unknown>[]> = {}
    const tableCounts: TableCounts = {}
    let rowCount = 0

    for (const { table } of BACKUP_TABLES) {
      const rows = await prisma.$queryRawUnsafe<
        Array<Record<string, unknown>>
      >(`SELECT * FROM "${table}"`)
      const normalized = rows.map(normalizeRow)
      tables[table] = normalized
      tableCounts[table] = normalized.length
      rowCount += normalized.length
    }

    const snapshot: BackupSnapshot = {
      version: 1,
      createdAt: new Date().toISOString(),
      tableCounts,
      tables,
    }

    const backupId = await nextBackupId()

    const meta = {
      label,
      note: input.note?.trim() || null,
      trigger,
      rowCount,
      tableCounts,
      createdById: input.actor?.id ?? null,
      createdByName: input.actor?.name ?? null,
      createdByRole: input.actor?.role ?? null,
    }

    const { sizeBytes, checksum, storedInBlob } = await writeBackupFiles(
      backupId,
      snapshot,
      meta,
    )

    const created = await getBackupRecordFromManifest(backupId, {
      ...meta,
      sizeBytes,
      checksum,
      restoredAt: null,
      createdAt: new Date().toISOString(),
    })

    const cloud = BACKUP_MIRROR_TO_DRIVE
      ? await pushSnapshotToDrive(
          BACKUP_DIR,
          backupId,
          storedInBlob ? await readSnapshotBytes(backupId) : undefined,
        )
      : undefined

    return {
      success: true,
      message: `Backup created with ${rowCount.toLocaleString()} rows.`,
      backup: created,
      cloud,
    }
  } catch (error) {
    console.error('[createBackup | Error]:', error)
    return {
      success: false,
      message: 'Failed to create the database backup.',
    }
  }
}


const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

function isIsoDate(value: string): boolean {
  return ISO_DATE_RE.test(value)
}

export async function restoreBackup(
  backupId: string,
  actor?: BackupActor,
): Promise<RestoreBackupResult> {
  if (!backupId) {
    return { success: false, message: 'Backup ID is required.' }
  }

  const backup = await getBackup(backupId)
  if (!backup) {
    return { success: false, message: 'Backup not found.' }
  }

  const safety = await createBackup({
    label: `Pre-restore safety (${backup.label})`,
    note: `Automatic snapshot taken before restoring ${backupId}.`,
    trigger: 'PRE_RESTORE',
    actor,
  })
  if (!safety.success || !safety.backup) {
    return {
      success: false,
      message:
        'Restore aborted: the pre-restore safety backup could not be created.',
    }
  }

  let snapshot: BackupSnapshot
  try {
    const manifest = await readManifest(backupId)
    if (!manifest || !(await checksumMatches(backupId, manifest.checksum))) {
      return {
        success: false,
        message:
          'Restore aborted: the backup file is missing or its checksum does not match.',
        safetyBackupId: safety.backup.backupId,
      }
    }
    snapshot = await readBackupFile(backupId)
  } catch (error) {
    console.error('[restoreBackup | read file]:', error)
    return {
      success: false,
      message: 'Restore aborted: the backup file could not be read.',
      safetyBackupId: safety.backup.backupId,
    }
  }

  const columnMap = await loadTableColumns()
  const quotedAll = BACKUP_TABLES.map((t) => `"${t.table}"`).join(', ')

  try {
    const restoredRows = await prisma.$transaction(async (tx) => {
      const locked = (await tx.$queryRawUnsafe(
        `SELECT pg_try_advisory_xact_lock(${RESTORE_LOCK_KEY}) AS locked`,
      )) as Array<{ locked: boolean }>
      if (!locked[0]?.locked) {
        throw new Error('Another restore is already in progress. Try again.')
      }

      await tx.$executeRawUnsafe(
        `TRUNCATE TABLE ${quotedAll} RESTART IDENTITY CASCADE`,
      )

      let inserted = 0

      for (const { table } of BACKUP_TABLES_BY_RESTORE_ORDER) {
        const rows = snapshot.tables?.[table]
        if (!Array.isArray(rows) || rows.length === 0) continue

        const columns = columnMap.get(table) ?? {}

        for (let offset = 0; offset < rows.length; offset += RESTORE_CHUNK_SIZE) {
          const chunk = rows.slice(offset, offset + RESTORE_CHUNK_SIZE)
          if (chunk.length === 0) continue

          const columnNames = Object.keys(chunk[0])
          if (columnNames.length === 0) continue

          const quotedColumns = columnNames.map((c) => `"${c}"`).join(', ')

          const values: unknown[] = []
          const tuples = chunk.map((row) => {
            const placeholders = columnNames.map((name) => {
              const index = values.length + 1
              const raw = row[name]
              const type = columns[name]

              if (raw === null || raw === undefined) {
                values.push(null)
                return `$${index}`
              }
              if (
                type === 'plain' &&
                typeof raw === 'string' &&
                isIsoDate(raw)
              ) {
                values.push(new Date(raw))
                return `$${index}`
              }
              if (type === 'numeric') {
                values.push(String(raw))
                return `$${index}::numeric`
              }
              if (type === 'json') {
                values.push(
                  typeof raw === 'string' ? raw : JSON.stringify(raw),
                )
                return `$${index}::jsonb`
              }
              values.push(raw)
              return `$${index}`
            })
            return `(${placeholders.join(', ')})`
          })

          await tx.$executeRawUnsafe(
            `INSERT INTO "${table}" (${quotedColumns}) VALUES ${tuples.join(', ')}`,
            ...values,
          )

          inserted += chunk.length
        }
      }

      return inserted
    })

    await patchManifest(backupId, { restoredAt: new Date().toISOString() })

    return {
      success: true,
      message: `Database restored from "${backup.label}" (${restoredRows.toLocaleString()} rows).`,
      restoredRows,
      safetyBackupId: safety.backup.backupId,
    }
  } catch (error: any) {
    console.error('[restoreBackup | Error]:', error)
    const aborted = /advisory|already in progress/i.test(
      String(error?.message ?? ''),
    )
    return {
      success: false,
      message: aborted
        ? error.message
        : 'Restore failed and was rolled back. The database is unchanged.',
      safetyBackupId: safety.backup.backupId,
    }
  }
}

export async function deleteBackup(
  backupId: string,
): Promise<{ success: boolean; message: string }> {
  if (!backupId) return { success: false, message: 'Backup ID is required.' }

  const existed = (await readManifest(backupId)) ?? (await snapshotExists(backupId))
  if (!existed) {
    return { success: false, message: `Backup ${backupId} was not found.` }
  }

  try {
    await deleteStored(backupId)

    await Promise.all([
      deleteSnapshotFromBlob(backupId).catch(() => undefined),
      removeFromDrive(backupId).catch(() => undefined),
    ])

    return { success: true, message: 'Backup deleted.' }
  } catch (error) {
    console.error('[deleteBackup | Error]:', error)
    return { success: false, message: 'Failed to delete the backup.' }
  }
}

function countRows(snapshot: BackupSnapshot): number {
  return Object.values(snapshot.tables ?? {}).reduce(
    (total, rows) => total + (Array.isArray(rows) ? rows.length : 0),
    0,
  )
}

export async function readBackupSnapshot(
  backupId: string,
): Promise<{ counts: TableCounts; rowCount: number } | null> {
  try {
    const snapshot = await readBackupFile(backupId)
    return {
      counts: snapshot.tableCounts ?? {},
      rowCount: countRows(snapshot),
    }
  } catch {
    return null
  }
}

export async function verifyBackup(
  backupId: string,
): Promise<{
  success: boolean
  message: string
  counts?: TableCounts
  fileExists?: boolean
  checksumOk?: boolean
}> {
  const manifest = await readManifest(backupId)
  if (!manifest) return { success: false, message: 'Backup not found.' }

  const fileExists = await snapshotExists(backupId)

  if (!fileExists) {
    return {
      success: false,
      message:
        'The snapshot file is missing from storage. Re-create the backup, or fetch it back from Google Drive.',
      fileExists: false,
      checksumOk: false,
    }
  }

  const checksumOk = await checksumMatches(backupId, manifest.checksum)
  if (!checksumOk) {
    return {
      success: false,
      message:
        'The backup file is corrupted: its checksum does not match the index.',
      fileExists: true,
      checksumOk: false,
    }
  }

  try {
    const snapshot = await readBackupFile(backupId)
    const counts = snapshot.tableCounts ?? {}
    const rowCount = Object.values(counts).reduce((a, b) => a + b, 0)
    return {
      success: true,
      message: `Backup verified - ${rowCount.toLocaleString()} rows across ${Object.keys(counts).length} tables.`,
      counts,
      fileExists: true,
      checksumOk: true,
    }
  } catch (error) {
    console.error('[verifyBackup | Error]:', error)
    return { success: false, message: 'Backup file could not be decoded.' }
  }
}

export async function getBackupFileForDownload(
  backupId: string,
): Promise<{ path: string | null; bytes: Buffer | null } | null> {
  const manifest = await readManifest(backupId)
  if (!manifest) return null

  const localPath = backupFilePath(backupId)
  if (existsSync(localPath)) return { path: localPath, bytes: null }

  const bytes = await readSnapshotBytes(backupId).catch(() => null)
  if (bytes) return { path: null, bytes }

  return null
}

export async function getBackupFilePath(
  backupId: string,
): Promise<string | null> {
  const file = await getBackupFileForDownload(backupId)
  return file?.path ?? null
}

export async function getLastAutomaticBackupAt(): Promise<Date | null> {
  const manifests = await listManifests()
  const newest = manifests
    .filter((m) => m.trigger === 'AUTOMATIC')
    .map((m) => new Date(m.createdAt).getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => b - a)[0]

  return newest === undefined ? null : new Date(newest)
}

export async function getLastRestoredAt(): Promise<Date | null> {
  const manifests = await listManifests()
  const newest = manifests
    .filter((m) => m.restoredAt)
    .map((m) => new Date(m.restoredAt as string).getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => b - a)[0]

  return newest === undefined ? null : new Date(newest)
}

export async function runAutomaticBackupIfDue(): Promise<AutomaticBackupResult> {
  try {
    const last = await getLastAutomaticBackupAt()
    const dueAfter = new Date(
      Date.now() - AUTO_BACKUP_INTERVAL_HOURS * 60 * 60 * 1000,
    )

    let backup: BackupRecord | undefined

    if (!last || last < dueAfter) {
      const result = await createBackup({
        label: `Automatic backup ${new Date().toISOString()}`,
        note: `Created automatically by the ${AUTO_BACKUP_INTERVAL_HOURS}h backup schedule.`,
        trigger: 'AUTOMATIC',
        actor: { id: null, name: 'Automatic backup job', role: 'SYSTEM' },
      })

      if (!result.success || !result.backup) {
        return {
          success: false,
          message: result.message,
          created: false,
          pruned: [],
        }
      }

      backup = result.backup
    }

    const pruned = await pruneAutomaticBackups()

    return {
      success: true,
      message: backup
        ? `Automatic backup created (${backup.backupId}).`
        : 'Automatic backup is still current - nothing to do.',
      created: Boolean(backup),
      backup,
      pruned,
    }
  } catch (error) {
    console.error('[runAutomaticBackupIfDue | Error]:', error)
    return {
      success: false,
      message: 'Automatic backup failed.',
      created: false,
      pruned: [],
    }
  }
}

export async function pruneAutomaticBackups(): Promise<string[]> {
  try {
    const automatic = (await listManifests())
      .filter((m) => m.trigger === 'AUTOMATIC')
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

    if (automatic.length <= AUTO_BACKUP_RETENTION) return []

    const doomed = automatic
      .slice(AUTO_BACKUP_RETENTION)
      .map((m) => m.backupId)
    if (doomed.length === 0) return []

    // Reclaim the stored bytes, not just the manifests: local files, the Blob
    // objects and the Google Drive copies.
    for (const id of doomed) {
      await Promise.all([
        deleteStored(id).catch(() => {}),
        deleteSnapshotFromBlob(id).catch(() => undefined),
        removeFromDrive(id).catch(() => undefined),
      ])
    }

    return doomed
  } catch (error) {
    console.error('[pruneAutomaticBackups | Error]:', error)
    return []
  }
}

export async function verifyBackupStore(): Promise<string[]> {
  try {
    const manifests = await listManifests()
    return manifests
      .filter((m) => BACKUP_ID_FILE_RE.test(m.backupId))
      .map((m) => m.backupId)
  } catch (error) {
    console.error('[verifyBackupStore | Error]:', error)
    return []
  }
}

export async function getBackupDiskUsage(): Promise<{
  directory: string
  fileCount: number
  totalBytes: number
  available: boolean
}> {
  let fileCount = 0
  let totalBytes = 0
  let localAvailable = false

  try {
    const entries = await fs.readdir(BACKUP_DIR)
    for (const entry of entries) {
      if (!entry.endsWith(BACKUP_FILE_EXT)) continue
      const stat = await fs
        .stat(path.join(BACKUP_DIR, entry))
        .catch(() => null)
      if (!stat) continue
      totalBytes += stat.size
      fileCount += 1
    }
    localAvailable = true
  } catch {
    localAvailable = false
  }

  if (isBlobConfigured()) {
    const blobs = await listBlobSnapshots()
    for (const blob of blobs) {
      const local = await fs
        .access(path.join(BACKUP_DIR, `${blob.backupId}${BACKUP_FILE_EXT}`))
        .then(() => true)
        .catch(() => false)
      if (local) continue // already counted from the local folder
      totalBytes += blob.sizeBytes
      fileCount += 1
    }
  }

  return {
    directory: BACKUP_DIR,
    fileCount,
    totalBytes,
    available: localAvailable || isBlobConfigured(),
  }
}

export async function getBlobStatus(): Promise<{
  configured: boolean
  prefix: string
  fileCount: number
  totalBytes: number
  message: string
}> {
  if (!isBlobConfigured()) {
    return {
      configured: false,
      prefix: BLOB_BACKUP_PREFIX,
      fileCount: 0,
      totalBytes: 0,
      message:
        'Vercel Blob is not configured. Set BLOB_READ_WRITE_TOKEN to store snapshots off the server filesystem.',
    }
  }

  const blobs = await listBlobSnapshots()
  return {
    configured: true,
    prefix: BLOB_BACKUP_PREFIX,
    fileCount: blobs.length,
    totalBytes: blobs.reduce((total, blob) => total + blob.sizeBytes, 0),
    message: `Storing snapshots in Vercel Blob under "${BLOB_BACKUP_PREFIX}/".`,
  }
}

export async function pushBackupToDrive(
  backupId: string,
): Promise<CloudResult> {
  if (!backupId) return { success: false, message: 'Backup ID is required.' }

  const bytes = await readSnapshotBytes(backupId).catch(() => null)
  if (!bytes) {
    return {
      success: false,
      message: `Snapshot ${backupId} is missing from the backup storage.`,
      backupId,
    }
  }

  const manifest = await readManifest(backupId)

  return pushSnapshotToDrive(BACKUP_DIR, backupId, bytes, manifest)
}

export async function pushAllBackupsToDrive(): Promise<{
  pushed: string[]
  failed: Array<{ backupId: string; message: string }>
}> {
  const backups = await listBackups(500)
  const pushed: string[] = []
  const failed: Array<{ backupId: string; message: string }> = []

  for (const backup of backups) {
    const result = await pushBackupToDrive(backup.backupId)
    if (result.success) pushed.push(backup.backupId)
    else failed.push({ backupId: backup.backupId, message: result.message })
  }

  return { pushed, failed }
}

export async function pushAllBackupsToBlob(): Promise<{
  pushed: string[]
  failed: Array<{ backupId: string; message: string }>
}> {
  if (!isBlobConfigured()) {
    return {
      pushed: [],
      failed: [],
    }
  }

  const backups = await listBackups(500)
  const pushed: string[] = []
  const failed: Array<{ backupId: string; message: string }> = []

  for (const backup of backups) {
    const bytes = await readSnapshotBytes(backup.backupId).catch(() => null)
    if (!bytes) {
      failed.push({
        backupId: backup.backupId,
        message: `Snapshot ${backup.backupId} is missing from the backup storage.`,
      })
      continue
    }

    const manifest = await readManifest(backup.backupId)

    const result = await putSnapshotInBlob(
      backup.backupId,
      bytes,
      manifest ?? {
        backupId: backup.backupId,
        label: backup.label,
        note: backup.note,
        trigger: backup.trigger,
        sizeBytes: backup.sizeBytes,
        rowCount: backup.rowCount,
        tableCounts: backup.tableCounts,
        createdAt: backup.createdAt,
        restoredAt: backup.restoredAt,
        checksum: createHash('sha256').update(bytes).digest('hex'),
      },
    )

    if (result.success) pushed.push(backup.backupId)
    else failed.push({ backupId: backup.backupId, message: result.message })
  }

  return { pushed, failed }
}

async function fetchBackupFromDriveDir(
  backupId: string,
  driveDir: string,
): Promise<CloudResult> {
  if (!backupId) return { success: false, message: 'Backup ID is required.' }
  if (!driveDir) {
    return { success: false, message: 'No Google Drive folder is configured.' }
  }

  const source = cloudSnapshotPath(driveDir, backupId)
  const bytes = await fs.readFile(source).catch(() => null)
  if (!bytes) {
    return {
      success: false,
      message: `Backup ${backupId} was not found in Google Drive.`,
      backupId,
    }
  }

  const checksum = createHash('sha256').update(bytes).digest('hex')
  let manifest: StoredManifest | null = null
  try {
    manifest = JSON.parse(
      await fs.readFile(cloudManifestPath(driveDir, backupId), 'utf8'),
    ) as StoredManifest
  } catch {
    manifest = null
  }

  if (manifest?.checksum && manifest.checksum !== checksum) {
    return {
      success: false,
      message: `Backup ${backupId} in Google Drive is incomplete — its checksum does not match. Wait for Drive to finish syncing and try again.`,
      backupId,
    }
  }

  const alreadyStored = await checksumMatches(backupId, checksum)
  if (alreadyStored) {
    return {
      success: true,
      message: `Backup ${backupId} is already fetched from Google Drive.`,
      backupId,
    }
  }

  try {
    const imported = await importSnapshot(
      backupId,
      bytes,
      manifest as StoredManifest | null,
    )

    if (!imported) {
      return {
        success: false,
        message: `Backup ${backupId} was copied but could not be stored.`,
        backupId,
      }
    }

    return {
      success: true,
      message: `Fetched ${backupId} from Google Drive. It is now available to restore.`,
      backupId,
    }
  } catch (error) {
    console.error('[fetchBackupFromCloud | Error]:', error)
    return {
      success: false,
      message: `Failed to fetch ${backupId} from Google Drive.`,
      backupId,
    }
  }
}

registerFetchHook(fetchBackupFromDriveDir)

export async function fetchBackupFromCloud(
  backupId: string,
): Promise<CloudResult> {
  return pullFromDrive(backupId)
}

export async function deleteBackupFromCloud(
  backupId: string,
): Promise<CloudResult> {
  if (!backupId) return { success: false, message: 'Backup ID is required.' }
  return removeFromDrive(backupId)
}

export async function getCloudBackupOverview(): Promise<{
  status: CloudStatus
  files: CloudBackupFile[]
}> {
  const [status, files] = await Promise.all([
    getCloudStatus(),
    listDriveFiles(),
  ])
  return { status, files }
}
