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
  BACKUP_TABLES,
  BACKUP_TABLES_BY_RESTORE_ORDER,
  RESTORE_CHUNK_SIZE,
  backupFilePath,
  buildBackupLabel,
  type BackupTrigger,
} from '@/lib/constants/backup'
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
    for (const [key, inner] of Object.entries(
      value as Record<string, unknown>,
    )) {
      out[key] = normalizeValue(inner)
    }
    return out
  }

  return value
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row))
    out[key] = normalizeValue(value)
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
): Promise<{
  sizeBytes: number
  checksum: string
  storedInBlob: boolean
}> {
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
      const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT * FROM "${table}"`,
      )
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

    const { sizeBytes, checksum, storedInBlob } =
      await writeBackupFiles(backupId, snapshot, meta)

    const created = await getBackupRecordFromManifest(backupId, {
      ...meta,
      sizeBytes,
      checksum,
      restoredAt: null,
      createdAt: new Date().toISOString(),
    })

    // On serverless platforms the local disk is ephemeral, so snapshots must
    // reach Vercel Blob before the function ends.
    const onServerless = Boolean(
      process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME,
    )
    const persisted = storedInBlob
    if (onServerless && !persisted) {
      return {
        success: false,
        message:
          'The snapshot could not be persisted to Vercel Blob on this deployment, so it would be lost when the function ends. Set BLOB_READ_WRITE_TOKEN in the environment variables and try again.',
      }
    }

    return {
      success: true,
      message: `Backup created with ${rowCount.toLocaleString()} rows.`,
      backup: created,
    }
  } catch (error) {
    console.error('[createBackup | Error]:', error)
    return {
      success: false,
      message: `Failed to create the database backup: ${
        error instanceof Error ? error.message : String(error)
      }`,
    }
  }
}

const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

function isIsoDate(value: string): boolean {
  return ISO_DATE_RE.test(value)
}

function restoreFailureReason(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string' &&
    /advisory|already in progress/i.test(error.message)
  ) {
    return error.message
  }

  let code: string | undefined
  if (error && typeof error === 'object') {
    if ('meta' in error && error.meta && typeof error.meta === 'object') {
      const meta = error.meta as Record<string, unknown>
      if (typeof meta.code === 'string') code = meta.code
    }
    if (!code && 'code' in error && typeof error.code === 'string') {
      code = error.code
    }
    if (!code && 'message' in error && typeof error.message === 'string') {
      code = error.message.match(/\bCode:\s*([A-Z0-9]{5})\b/)?.[1]
    }
  }

  const reasons: Record<string, string> = {
    '22P02': 'The backup contains a value that does not match a database field type.',
    '23502': 'The backup is missing a value required by the current database schema.',
    '23503': 'The backup contains records with missing related records.',
    '23505': 'The backup contains duplicate records.',
    '40001': 'The database reported a transaction conflict.',
    '42P01': 'A required database table is missing.',
    '42703': 'The backup does not match the current database schema.',
    P2028: 'The restore transaction timed out. Try again; large restores may need more time.',
  }

  return code
    ? `${reasons[code] ?? `The database rejected the restore (error ${code}).`}`
    : 'The database rejected the restore. No changes were saved; contact support with the restore time.'
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

        for (
          let offset = 0;
          offset < rows.length;
          offset += RESTORE_CHUNK_SIZE
        ) {
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
                values.push(typeof raw === 'string' ? raw : JSON.stringify(raw))
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
    }, {
      maxWait: 30_000,
      timeout: 240_000,
    })

    await patchManifest(backupId, { restoredAt: new Date().toISOString() })

    return {
      success: true,
      message: `Database restored from "${backup.label}" (${restoredRows.toLocaleString()} rows).`,
      restoredRows,
      safetyBackupId: safety.backup.backupId,
    }
  } catch (error: unknown) {
    console.error('[restoreBackup | Error]:', error)
    const reason = restoreFailureReason(error)
    const aborted = /advisory|already in progress/i.test(reason)
    return {
      success: false,
      message: aborted
        ? reason
        : `Restore failed and was rolled back. The database is unchanged. ${reason}`,
      safetyBackupId: safety.backup.backupId,
    }
  }
}

export async function restoreBackupFromUpload(
  bytes: Buffer,
  actor?: BackupActor,
): Promise<RestoreBackupResult & { importedBackupId?: string }> {
  try {
    const jsonBytes =
      bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes
    const parsed = JSON.parse(
      jsonBytes.toString('utf8'),
    ) as Partial<BackupSnapshot>

    if (
      parsed.version !== 1 ||
      typeof parsed.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(parsed.createdAt)) ||
      !parsed.tables ||
      typeof parsed.tables !== 'object' ||
      Array.isArray(parsed.tables)
    ) {
      return {
        success: false,
        message: 'The selected file is not a supported MediTrack backup.',
      }
    }

    const columnMap = await loadTableColumns()
    const tables: BackupSnapshot['tables'] = {}
    const tableCounts: TableCounts = {}
    let rowCount = 0

    for (const { table } of BACKUP_TABLES) {
      const rows = parsed.tables[table]
      if (!Array.isArray(rows)) {
        return {
          success: false,
          message: `The backup is missing the expected ${table} table data.`,
        }
      }

      const allowedColumns = columnMap.get(table) ?? {}
      for (const row of rows) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
          return {
            success: false,
            message: `The backup contains invalid rows for ${table}.`,
          }
        }
        if (
          Object.keys(row).some(
            (column) => !Object.hasOwn(allowedColumns, column),
          )
        ) {
          return {
            success: false,
            message: `The backup contains unknown columns for ${table}.`,
          }
        }
      }

      tables[table] = rows as Record<string, unknown>[]
      tableCounts[table] = rows.length
      rowCount += rows.length
    }

    if (
      Object.keys(parsed.tables).some(
        (table) => !BACKUP_TABLES.some((spec) => spec.table === table),
      )
    ) {
      return {
        success: false,
        message: 'The backup contains unsupported table data.',
      }
    }

    const snapshot: BackupSnapshot = {
      version: 1,
      createdAt: parsed.createdAt,
      tableCounts,
      tables,
    }
    const backupId = await nextBackupId()
    const now = new Date().toISOString()
    const label = `Imported ${buildBackupLabel()}`
    const gzipped = gzipSync(Buffer.from(JSON.stringify(snapshot), 'utf8'), {
      level: 9,
    })

    await importSnapshot(backupId, gzipped, {
      backupId,
      label,
      note: 'Imported from an uploaded JSON backup.',
      trigger: 'MANUAL',
      sizeBytes: gzipped.byteLength,
      rowCount,
      tableCounts,
      checksum: '',
      createdById: actor?.id ?? null,
      createdByName: actor?.name ?? null,
      createdByRole: actor?.role ?? null,
      createdAt: now,
      restoredAt: null,
    })

    const result = await restoreBackup(backupId, actor)
    return {
      ...result,
      message: result.success
        ? `Imported backup ${backupId}. ${result.message}`
        : result.message,
      importedBackupId: backupId,
    }
  } catch (error) {
    console.error('[restoreBackupFromUpload | Error]:', error)
    return {
      success: false,
      message: 'The uploaded backup could not be read or restored.',
    }
  }
}

export async function deleteBackup(
  backupId: string,
): Promise<{ success: boolean; message: string }> {
  if (!backupId) return { success: false, message: 'Backup ID is required.' }

  const existed =
    (await readManifest(backupId)) ?? (await snapshotExists(backupId))
  if (!existed) {
    return { success: false, message: `Backup ${backupId} was not found.` }
  }

  try {
    await deleteStored(backupId)

    await deleteSnapshotFromBlob(backupId).catch(() => undefined)

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

export async function verifyBackup(backupId: string): Promise<{
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
        'The snapshot file is missing from storage. Re-create the backup or import it from a backup file.',
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

    const doomed = automatic.slice(AUTO_BACKUP_RETENTION).map((m) => m.backupId)
    if (doomed.length === 0) return []

    // Reclaim the stored bytes, not just the manifests: local files and Blob objects.
    for (const id of doomed) {
      await Promise.all([
        deleteStored(id).catch(() => {}),
        deleteSnapshotFromBlob(id).catch(() => undefined),
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
      const stat = await fs.stat(path.join(BACKUP_DIR, entry)).catch(() => null)
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
