

import os from 'node:os'
import path from 'node:path'

export const BACKUP_TRIGGERS = ['MANUAL', 'AUTOMATIC', 'PRE_RESTORE'] as const

export type BackupTrigger = (typeof BACKUP_TRIGGERS)[number]

export const BACKUP_TRIGGER_LABELS: Record<BackupTrigger, string> = {
  MANUAL: 'Manual',
  AUTOMATIC: 'Automatic',
  PRE_RESTORE: 'Pre-restore safety',
}

export type TableCounts = Record<string, number>

export type BackupTableSpec = {
  table: string
  label: string
  order: number
}

export const BACKUP_TABLES: BackupTableSpec[] = [
  { table: 'users', label: 'User Accounts', order: 10 },
  { table: 'Staff', label: 'Staff Accounts', order: 20 },
  { table: 'Service', label: 'Services', order: 30 },
  { table: 'Event', label: 'Events', order: 40 },
  { table: 'UserProfile', label: 'User Profiles', order: 50 },
  { table: 'FamilyMember', label: 'Family Members', order: 60 },
  { table: 'Patient', label: 'Patients', order: 70 },
  { table: 'Appointment', label: 'Appointments', order: 80 },
  { table: 'MedicalHistory', label: 'Medical Records', order: 90 },
  { table: 'WalkInQueue', label: 'Walk-in Queue', order: 100 },
  { table: 'Notification', label: 'Notifications', order: 110 },
  { table: 'audit_logs', label: 'Audit Logs', order: 120 },
]

export const BACKUP_TABLES_BY_RESTORE_ORDER = [...BACKUP_TABLES].sort(
  (a, b) => a.order - b.order,
)

export const RESTORE_CONFIRM_THRESHOLD = 1


function readNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const AUTO_BACKUP_INTERVAL_HOURS = readNumberEnv(
  'AUTO_BACKUP_INTERVAL_HOURS',
  168,
)

export const AUTO_BACKUP_RETENTION = readNumberEnv('AUTO_BACKUP_RETENTION', 8)

export function formatBackupInterval(hours: number): string {
  if (hours <= 0) return 'never'
  if (hours === 1) return 'every hour'
  if (hours < 24) return `every ${hours} hours`

  const days = hours / 24
  if (days === 1) return 'every day'
  if (days < 7) return `every ${days} days`
  if (days === 7) return 'once a week'

  const weeks = Math.round(days / 7)
  return `every ${weeks} weeks`
}

export const RESTORE_CHUNK_SIZE = 100

function resolveBackupDir(): string {
  if (process.env.BACKUP_DIR) return path.resolve(process.env.BACKUP_DIR)

  const serverless = Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME,
  )

  return serverless
    ? path.join(os.tmpdir(), 'meditrack-backups')
    : path.join(process.cwd(), 'backups')
}

export const BACKUP_DIR = resolveBackupDir()

export const BACKUP_FILE_EXT = '.json.gz'

export const BACKUP_MANIFEST_EXT = '.json'

export function backupFilePath(backupId: string): string {
  return path.join(BACKUP_DIR, `${backupId}${BACKUP_FILE_EXT}`)
}

export function backupManifestPath(backupId: string): string {
  return path.join(BACKUP_DIR, `${backupId}${BACKUP_MANIFEST_EXT}`)
}

export function backupDownloadName(backupId: string): string {
  return `meditrack-${backupId}${BACKUP_FILE_EXT}`
}


export const BACKUP_ID_FILE_RE = /^BKP-\d+$/

export const BACKUP_SIZE_UNITS = ['B', 'KB', 'MB', 'GB'] as const

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < BACKUP_SIZE_UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${BACKUP_SIZE_UNITS[unit]}`
}

export function buildBackupLabel(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `Backup ${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}
