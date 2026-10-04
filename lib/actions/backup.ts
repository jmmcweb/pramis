'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/actions/guard'
import { recordAudit } from '@/lib/actions/audit'
import {
  createBackup,
  deleteBackup,
  fetchBackupFromCloud,
  getBackupDiskUsage,
  getBlobStatus,
  getCloudBackupOverview,
  getCurrentTableCounts,
  getLastAutomaticBackupAt,
  getLastRestoredAt,
  listBackups,
  pushAllBackupsToBlob,
  pushAllBackupsToDrive,
  restoreBackup,
  runAutomaticBackupIfDue,
  verifyBackup,
  verifyBackupStore,
  type BackupRecord,
  type TableCounts,
} from '@/lib/backup'
import {
  AUTO_BACKUP_INTERVAL_HOURS,
  AUTO_BACKUP_RETENTION,
  BACKUP_DIR,
  type CloudBackupFile,
  type CloudStatus,
} from '@/lib/constants/backup'
import type { AuditActor } from '@/lib/audit'

const unauthorized = {
  success: false as const,
  message: 'You are not authorized to manage database backups.',
}

export type BackupCloudInfo = {
  status: CloudStatus
  files: CloudBackupFile[]
}

export type BackupBlobInfo = {
  configured: boolean
  prefix: string
  fileCount: number
  totalBytes: number
  message: string
}

export type BackupOverview = {
  success: boolean
  message: string | null
  backups: BackupRecord[]
  currentCounts: TableCounts
  lastAutomaticBackupAt: string | null
  lastRestoredAt: string | null
  autoBackupIntervalHours: number
  autoBackupRetention: number
  totalRows: number
  totalSizeBytes: number
  backupDirectory: string
  filesOnDisk: number
  diskBytes: number
  storageAvailable: boolean
  cloud: BackupCloudInfo
  blob: BackupBlobInfo
}

const emptyCloud: BackupCloudInfo = {
  status: {
    enabled: false,
    root: null,
    directory: null,
    source: 'none',
    available: false,
    fileCount: 0,
    totalBytes: 0,
    message: 'No Google Drive folder is configured.',
  },
  files: [],
}

const emptyBlob: BackupBlobInfo = {
  configured: false,
  prefix: 'meditrack-backups',
  fileCount: 0,
  totalBytes: 0,
  message: 'Vercel Blob is not configured on this deployment.',
}

function actorFromSession(session: any): AuditActor {
  return {
    id: session?.user?.id ?? null,
    name: session?.user?.name ?? session?.user?.email ?? null,
    email: session?.user?.email ?? null,
    role: session?.user?.role ?? null,
    accountType: session?.user?.accountType ?? 'USER',
  }
}

function revalidateAfterDataChange() {
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
    } catch {
    }
  }
  revalidatePath('/admin', 'layout')
}

export async function getBackupOverview(): Promise<BackupOverview> {
  const session = await requireAdmin()
  if (!session) {
    return {
      success: false,
      message: unauthorized.message,
      backups: [],
      currentCounts: {},
      lastAutomaticBackupAt: null,
      lastRestoredAt: null,
      autoBackupIntervalHours: AUTO_BACKUP_INTERVAL_HOURS,
      autoBackupRetention: AUTO_BACKUP_RETENTION,
      totalRows: 0,
      totalSizeBytes: 0,
      backupDirectory: BACKUP_DIR,
      filesOnDisk: 0,
      diskBytes: 0,
      storageAvailable: false,
      cloud: emptyCloud,
      blob: emptyBlob,
    }
  }

  try {
    const [backups, currentCounts, lastAutomatic, lastRestored, disk, cloud, blob] =
      await Promise.all([
        listBackups(),
        getCurrentTableCounts(),
        getLastAutomaticBackupAt(),
        getLastRestoredAt(),
        getBackupDiskUsage(),
        getCloudBackupOverview(),
        getBlobStatus(),
      ])

    return {
      success: true,
      message: null,
      backups,
      currentCounts,
      lastAutomaticBackupAt: lastAutomatic
        ? lastAutomatic.toISOString()
        : null,
      lastRestoredAt: lastRestored ? lastRestored.toISOString() : null,
      autoBackupIntervalHours: AUTO_BACKUP_INTERVAL_HOURS,
      autoBackupRetention: AUTO_BACKUP_RETENTION,
      totalRows: Object.values(currentCounts).reduce((a, b) => a + b, 0),
      totalSizeBytes: backups.reduce((total, b) => total + b.sizeBytes, 0),
      backupDirectory: disk.directory,
      filesOnDisk: disk.fileCount,
      diskBytes: disk.totalBytes,
      storageAvailable: disk.available,
      cloud,
      blob,
    }
  } catch (error) {
    console.error('[getBackupOverview | Error]:', error)
    return {
      success: false,
      message: 'Failed to load database backups.',
      backups: [],
      currentCounts: {},
      lastAutomaticBackupAt: null,
      lastRestoredAt: null,
      autoBackupIntervalHours: AUTO_BACKUP_INTERVAL_HOURS,
      autoBackupRetention: AUTO_BACKUP_RETENTION,
      totalRows: 0,
      totalSizeBytes: 0,
      backupDirectory: BACKUP_DIR,
      filesOnDisk: 0,
      diskBytes: 0,
      storageAvailable: false,
      cloud: emptyCloud,
      blob: emptyBlob,
    }
  }
}

export async function createDatabaseBackup(note?: string) {
  const session = await requireAdmin()
  if (!session) return unauthorized

  const result = await createBackup({
    note: note ?? null,
    trigger: 'MANUAL',
    actor: actorFromSession(session),
  })

  await recordAudit({
    action: 'CREATE',
    entity: 'BACKUP',
    entityId: result.backup?.backupId ?? null,
    description: result.success
      ? `Created database backup "${result.backup?.label}" with ${result.backup?.rowCount.toLocaleString()} rows.`
      : `Failed to create database backup: ${result.message}`,
    status: result.success ? 'SUCCESS' : 'FAILURE',
    metadata: {
      backupId: result.backup?.backupId ?? null,
      rowCount: result.backup?.rowCount ?? 0,
      sizeBytes: result.backup?.sizeBytes ?? 0,
      trigger: 'MANUAL',
    },
  })

  return result
}

export async function restoreDatabaseBackup(
  backupId: string,
  confirm?: string,
) {
  const session = await requireAdmin()
  if (!session) return unauthorized

  if (!backupId) {
    return { success: false, message: 'Backup ID is required.' }
  }

  if (confirm?.trim() !== backupId) {
    return {
      success: false,
      message: 'Confirmation did not match. The restore was cancelled.',
    }
  }

  const result = await restoreBackup(backupId, actorFromSession(session))

  if (result.success) revalidateAfterDataChange()

  await recordAudit({
    action: 'RESTORE',
    entity: 'BACKUP',
    entityId: backupId,
    description: result.success
      ? `Restored the database from backup ${backupId} (${result.restoredRows?.toLocaleString()} rows). Safety snapshot: ${result.safetyBackupId}.`
      : `Failed to restore the database from backup ${backupId}: ${result.message}`,
    status: result.success ? 'SUCCESS' : 'FAILURE',
    metadata: {
      backupId,
      restoredRows: result.restoredRows ?? 0,
      safetyBackupId: result.safetyBackupId ?? null,
    },
  })

  return result
}

export async function deleteDatabaseBackup(backupId: string) {
  const session = await requireAdmin()
  if (!session) return unauthorized

  if (!backupId) {
    return { success: false, message: 'Backup ID is required.' }
  }

  const result = await deleteBackup(backupId)

  await recordAudit({
    action: 'DELETE',
    entity: 'BACKUP',
    entityId: backupId,
    description: result.success
      ? `Deleted database backup ${backupId}.`
      : `Failed to delete database backup ${backupId}: ${result.message}`,
    status: result.success ? 'SUCCESS' : 'FAILURE',
    metadata: { backupId },
  })

  return result
}

export async function runScheduledBackup() {
  const session = await requireAdmin()
  if (!session) return unauthorized

  const result = await runAutomaticBackupIfDue()

  if (result.created && result.backup) {
    await recordAudit({
      action: 'CREATE',
      entity: 'BACKUP',
      entityId: result.backup.backupId,
      description: `Created scheduled database backup "${result.backup.label}" with ${result.backup.rowCount.toLocaleString()} rows.`,
      metadata: {
        backupId: result.backup.backupId,
        rowCount: result.backup.rowCount,
        sizeBytes: result.backup.sizeBytes,
        trigger: 'AUTOMATIC',
      },
    })
  }

  return {
    success: result.success,
    message: result.message,
    created: result.created,
    backup: result.backup ?? null,
    pruned: result.pruned,
  }
}

export async function verifyDatabaseBackup(backupId: string) {
  const session = await requireAdmin()
  if (!session) return unauthorized
  return verifyBackup(backupId)
}

export async function refreshBackupsFromStoreAction() {
  const session = await requireAdmin()
  if (!session) return unauthorized

  try {
    const found = await verifyBackupStore()

    await recordAudit({
      action: 'VIEW',
      entity: 'BACKUP',
      description: `Refreshed the backup store: ${found.length} snapshot(s) found.`,
      metadata: { found },
    })

    return {
      success: true,
      message:
        found.length > 0
          ? `Found ${found.length} snapshot(s) in the backup store.`
          : 'No snapshots were found in the backup store.',
      found,
    }
  } catch (error) {
    console.error('[refreshBackupsFromStoreAction | Error]:', error)
    return { success: false, message: 'Failed to read the backup store.' }
  }
}
export async function pushAllBackupsToDriveAction() {
  const session = await requireAdmin()
  if (!session) return unauthorized

  const result = await pushAllBackupsToDrive()

  await recordAudit({
    action: 'CREATE',
    entity: 'BACKUP',
    description: `Copied ${result.pushed.length} database backup(s) to Google Drive${result.failed.length ? `; ${result.failed.length} failed` : ''}.`,
    status: result.failed.length === 0 ? 'SUCCESS' : 'FAILURE',
    metadata: { pushed: result.pushed, failed: result.failed },
  })

  return {
    success: result.failed.length === 0,
    message:
      result.pushed.length === 0 && result.failed.length === 0
        ? 'There are no stored backups to copy to Google Drive.'
        : `Copied ${result.pushed.length} backup(s) to Google Drive${
            result.failed.length ? `; ${result.failed.length} failed` : ''
          }.`,
    pushed: result.pushed,
    failed: result.failed,
  }
}

export async function fetchBackupFromCloudAction(backupId: string) {
  const session = await requireAdmin()
  if (!session) return unauthorized

  if (!backupId) {
    return { success: false, message: 'Backup ID is required.' }
  }

  const result = await fetchBackupFromCloud(backupId)

  if (result.success) revalidateAfterDataChange()

  await recordAudit({
    action: 'UPDATE',
    entity: 'BACKUP',
    entityId: backupId,
    description: result.success
      ? `Fetched database backup ${backupId} from Google Drive.`
      : `Failed to fetch database backup ${backupId} from Google Drive: ${result.message}`,
    status: result.success ? 'SUCCESS' : 'FAILURE',
    metadata: { backupId },
  })

  return result
}

export async function pushAllBackupsToBlobAction() {
  const session = await requireAdmin()
  if (!session) return unauthorized

  const result = await pushAllBackupsToBlob()

  await recordAudit({
    action: 'CREATE',
    entity: 'BACKUP',
    description: `Copied ${result.pushed.length} database backup(s) to Vercel Blob${result.failed.length ? `; ${result.failed.length} failed` : ''}.`,
    status: result.failed.length === 0 ? 'SUCCESS' : 'FAILURE',
    metadata: { pushed: result.pushed, failed: result.failed },
  })

  return {
    success: result.failed.length === 0,
    message:
      result.pushed.length === 0 && result.failed.length === 0
        ? 'There are no stored backups to copy to Vercel Blob.'
        : `Copied ${result.pushed.length} backup(s) to Vercel Blob${
            result.failed.length ? `; ${result.failed.length} failed` : ''
          }.`,
    pushed: result.pushed,
    failed: result.failed,
  }
}
