'use client'

// Presentational pieces for /admin/backup. No data fetching or server-action
// calls live here â€” BackupClient owns all of that.
//
// Styling is centralised in ./backupUi.ts so the page has one palette instead of
// the same dark-mode ternaries repeated in every panel.

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  CloudDownload,
  CloudUpload,
  Download,
  HardDrive,
  Inbox,
  Loader2,
  RefreshCw,
  RotateCcw,
  Server,
  Trash2,
  X,
} from 'lucide-react'
import { formatBytes, BACKUP_TABLES } from '@/lib/constants/backup'
import type { BackupRecord } from '@/lib/backup'
import {
  card,
  cx,
  dot,
  heading,
  iconTile,
  mono,
  muted,
  secondaryButton,
  type StatusTone,
} from './backupUi'

export type TableRow = { table: string; current: number }

export function formatDateTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return { date: '—', time: '' }
  return {
    date: date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  }
}

/** "in 3 hours" / "2 days ago" for the schedule status line. */
export function relativeTime(iso: string | null) {
  if (!iso) return 'never'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'never'
  const diffMs = then - Date.now()
  const abs = Math.abs(diffMs)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const [unit, ms] =
    abs < 3_600_000
      ? (['minute', 60_000] as const)
      : abs < 86_400_000
        ? (['hour', 3_600_000] as const)
        : (['day', 86_400_000] as const)
  return rtf.format(Math.round(diffMs / ms), unit)
}

/** Formats elapsed time since a backup timestamp, e.g. "2 hrs, 15 mins ago". */
export function formatTimeAgo(iso: string | null): string {
  if (!iso) return 'Never'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'Never'
  const diffMs = Date.now() - then
  if (diffMs < 0) return 'Just now'
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return 'Just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} ${min === 1 ? 'min' : 'mins'} ago`
  const hr = Math.floor(min / 60)
  const remMin = min % 60
  if (hr < 24) {
    return remMin > 0
      ? `${hr} ${hr === 1 ? 'hr' : 'hrs'}, ${remMin} ${remMin === 1 ? 'min' : 'mins'} ago`
      : `${hr} ${hr === 1 ? 'hr' : 'hrs'} ago`
  }
  const days = Math.floor(hr / 24)
  const remHr = hr % 24
  if (days < 7) {
    return remHr > 0
      ? `${days} ${days === 1 ? 'day' : 'days'}, ${remHr} ${remHr === 1 ? 'hr' : 'hrs'} ago`
      : `${days} ${days === 1 ? 'day' : 'days'} ago`
  }
  return `${days} ${days === 1 ? 'day' : 'days'} ago`
}

/** Computes next due relative duration based on last automatic backup. */
export function nextBackupDue(lastIso: string, intervalHours: number): string {
  const then = new Date(lastIso).getTime()
  if (Number.isNaN(then)) return '—'
  const dueTime = then + intervalHours * 3600 * 1000
  const diffMs = dueTime - Date.now()
  if (diffMs <= 0) return 'Due now (on next activity)'
  const min = Math.round(diffMs / 60000)
  if (min < 60) return `in ~${min} min${min === 1 ? '' : 's'}`
  const hr = Math.floor(min / 60)
  const remMin = min % 60
  if (remMin > 0) {
    return `in ~${hr} hr${hr === 1 ? '' : 's'}, ${remMin} min${remMin === 1 ? '' : 's'}`
  }
  return `in ~${hr} hr${hr === 1 ? '' : 's'}`
}

const triggerTone: Record<string, string> = {
  MANUAL: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  AUTOMATIC:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  PRE_RESTORE:
    'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
}

const TRIGGER_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  AUTOMATIC: 'Automatic',
  PRE_RESTORE: 'Pre-restore safety',
}

export function SummaryCard({
  darkMode,
  icon,
  label,
  value,
  subtext,
}: {
  darkMode: boolean
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  subtext?: React.ReactNode
}) {
  return (
    <div className={card(darkMode)}>
      <div className="flex items-center gap-2 mb-2">
        <span className={cx(darkMode ? 'text-[#8b7fd4]' : 'text-[#4E69D3]')}>
          {icon}
        </span>
        <span
          className={cx(
            'text-xs font-semibold',
            darkMode ? 'text-gray-400' : 'text-gray-500',
          )}
        >
          {label}
        </span>
      </div>
      {typeof value === 'string' ? (
        <p
          className={cx(
            'text-2xl font-bold truncate',
            darkMode ? 'text-white' : 'text-[#1d4662]',
          )}
          title={value}
        >
          {value}
        </p>
      ) : (
        value
      )}
      {subtext && (
        <div
          className={cx(
            'text-xs mt-1.5 font-medium',
            darkMode ? 'text-gray-400' : 'text-gray-500',
          )}
        >
          {subtext}
        </div>
      )}
    </div>
  )
}

export function BackupTable({
  backups,
  darkMode,
  busy,
  isPending,
  onRestore,
  onDelete,
}: {
  backups: BackupRecord[]
  darkMode: boolean
  busy: string | null
  isPending: boolean
  onRestore: (backup: BackupRecord) => void
  onDelete: (backup: BackupRecord) => void
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border mb-6 ${
        darkMode ? 'bg-[#211a3d] border-white/10' : 'bg-white border-gray-200'
      }`}
    >
      <div className="p-5 border-b border-inherit">
        <h2
          className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-[#1d4662]'}`}
        >
          Backup history
        </h2>
      </div>

      {backups.length === 0 ? (
        <div className="py-14 text-center px-5">
          <div
            className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${
              darkMode ? 'bg-[#171333] text-gray-500' : 'bg-gray-50 text-gray-300'
            }`}
          >
            <Inbox size={22} />
          </div>
          <p
            className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
          >
            No backups yet
          </p>
          <p
            className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}
          >
            Create your first backup to be able to restore the database later.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className={`border-b ${darkMode ? 'border-white/10' : 'border-gray-200'}`}
              >
                {['Backup', 'Type', 'Rows', 'Size', 'Created', 'Actions'].map(
                  (h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wide ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => {
                const { date, time } = formatDateTime(backup.createdAt)
                const isBusy = busy === backup.backupId
                return (
                  <tr
                    key={backup.backupId}
                    className={`border-b last:border-0 ${
                      darkMode ? 'border-white/5' : 'border-gray-100'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p
                        className={`font-semibold ${darkMode ? 'text-slate-100' : 'text-[#2A2E43]'}`}
                      >
                        {backup.label}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}
                      >
                        {backup.backupId}
                        {backup.restoredAt ? ' Â· restored' : ''}
                      </p>
                      {backup.note && (
                        <p
                          className={`text-xs mt-1 italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                        >
                          {backup.note}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                          triggerTone[backup.trigger] ??
                          'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {TRIGGER_LABELS[backup.trigger] ?? backup.trigger}
                      </span>
                      {backup.createdByName && (
                        <p
                          className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}
                        >
                          {backup.createdByName}
                        </p>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 ${darkMode ? 'text-slate-300' : 'text-[#2A2E43]'}`}
                    >
                      {backup.rowCount.toLocaleString()}
                    </td>
                    <td
                      className={`px-4 py-3 whitespace-nowrap ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}
                    >
                      {formatBytes(backup.sizeBytes)}
                    </td>
                    <td
                      className={`px-4 py-3 whitespace-nowrap text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}
                    >
                      <span className="block font-medium">{date}</span>
                      <span className="block opacity-90">{time}</span>
                      <span className="block text-[11px] opacity-75 mt-0.5">
                        {formatTimeAgo(backup.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <BackupRowActions
                        backupId={backup.backupId}
                        darkMode={darkMode}
                        disabled={isPending}
                        busy={isBusy}
                        onRestore={() => onRestore(backup)}
                        onDelete={() => onDelete(backup)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function BackupRowActions({
  backupId,
  darkMode,
  disabled,
  busy,
  onRestore,
  onDelete,
}: {
  backupId: string
  darkMode: boolean
  disabled: boolean
  busy: boolean
  onRestore: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <a
        href={`/api/admin/backup/download?backupId=${encodeURIComponent(backupId)}`}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
          darkMode
            ? 'bg-slate-700/60 text-slate-200 hover:bg-slate-700'
            : 'bg-gray-100 text-[#2A2E43] hover:bg-gray-200'
        }`}
        title="Download this snapshot to off-site storage"
      >
        <Download size={13} /> Download
      </a>
      <button
        type="button"
        onClick={onRestore}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
          darkMode
            ? 'bg-[#2d1b4e] text-slate-200 hover:bg-[#3b2a63]'
            : 'bg-[#EEF0FB] text-[#4E69D3] hover:bg-[#e2e6f8]'
        }`}
      >
        <RotateCcw size={13} /> Restore
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
          darkMode
            ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
            : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
        }`}
      >
        {busy ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Trash2 size={13} />
        )}
        Delete
      </button>
    </div>
  )
}


export function RestoreDialog({
  backup,
  darkMode,
  busy,
  onClose,
  onConfirm,
}: {
  backup: BackupRecord | null
  darkMode: boolean
  busy: boolean
  onClose: () => void
  onConfirm: (backup: BackupRecord, confirm: string) => void
}) {
  const [confirm, setConfirm] = useState('')

  useEffect(() => {
    setConfirm('')
  }, [backup?.backupId])

  useEffect(() => {
    if (!backup) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [backup, busy, onClose])

  if (!backup) return null

  const { date, time } = formatDateTime(backup.createdAt)
  const matches = confirm.trim() === backup.backupId

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={busy ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="restore-dialog-title"
        className={`relative w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${
          darkMode ? 'bg-[#171333] border-white/10' : 'bg-white border-gray-200'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
          className={`absolute top-4 right-4 rounded-lg p-1.5 transition ${
            darkMode
              ? 'text-gray-400 hover:bg-white/10'
              : 'text-gray-400 hover:bg-gray-100'
          }`}
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-500">
            <AlertTriangle size={20} />
          </span>
          <div>
            <h2
              id="restore-dialog-title"
              className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-[#1d4662]'}`}
            >
              Restore the database?
            </h2>
            <p
              className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
            >
              This replaces the contents of every table with the rows captured
              in the selected snapshot.
            </p>
          </div>
        </div>

        <div
          className={`rounded-lg border p-3 mb-4 text-xs ${
            darkMode
              ? 'border-white/10 bg-slate-900/40 text-slate-300'
              : 'border-gray-200 bg-gray-50 text-[#2A2E43]'
          }`}
        >
          <p className="font-semibold">{backup.label}</p>
          <p className="mt-1 opacity-80">
            {backup.backupId} · {backup.rowCount.toLocaleString()} rows ·{' '}
            {formatBytes(backup.sizeBytes)}
          </p>
          <p className="mt-1 opacity-80">
            Captured {date} at {time}
          </p>
        </div>

        <ul className="space-y-2 mb-4">
          {[
            'A safety snapshot of the current database is taken automatically before anything is overwritten.',
            'Users, patients, appointments, medical records, audit logs and queues are all rolled back.',
            'Anyone signed in may need to sign in again afterwards.',
          ].map((point) => (
            <li key={point} className="flex items-start gap-2">
              <CheckCircle2
                size={14}
                className="mt-0.5 flex-shrink-0 text-emerald-500"
              />
              <span
                className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
              >
                {point}
              </span>
            </li>
          ))}
        </ul>

        <label
          className={`block text-xs font-semibold mb-1.5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
          htmlFor="restore-confirm"
        >
          Type <span className="font-mono">{backup.backupId}</span> to confirm
        </label>
        <input
          id="restore-confirm"
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder={backup.backupId}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-rose-500 ${
            darkMode
              ? 'border-slate-700 bg-slate-900/60 text-slate-100 placeholder:text-slate-600'
              : 'border-gray-300 bg-white text-[#2A2E43] placeholder:text-gray-300'
          }`}
        />

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
              darkMode
                ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                : 'border-gray-300 text-[#2A2E43] hover:bg-gray-50'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(backup, confirm)}
            disabled={busy || !matches}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2.5 transition disabled:opacity-40"
          >
            {busy ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <RotateCcw size={15} />
            )}
            Restore database
          </button>
        </div>
      </div>
    </div>
  )
}

export type StorageRow = {
  icon: React.ReactNode
  label: string
  location: string
  detail: string
  tone: StatusTone
  action?: { label: string; onClick: () => void; busy: boolean }
}

export function StoragePanel({
  darkMode,
  rows,
  driveOnly,
  onFetchAll,
}: {
  darkMode: boolean
  rows: StorageRow[]
  driveOnly: number
  onFetchAll: () => void
}) {
  return (
    <section className={card(darkMode)}>
      <div className="flex items-start gap-3 mb-4">
        <span className={iconTile(darkMode, 'good')}>
          <HardDrive size={17} />
        </span>
        <div>
          <h2 className={heading(darkMode)}>Where backups are stored</h2>
          <p className={cx(muted(darkMode), 'mt-1')}>
            The database only keeps an index, so snapshots survive even if it is
            lost. New backups are mirrored to every available store.
          </p>
        </div>
      </div>

      <ul>
        {rows.map((row) => (
          <li
            key={row.label}
            className={cx(
              'flex flex-wrap items-center gap-3 border-b py-3 last:border-b-0',
              darkMode ? 'border-white/5' : 'border-gray-100',
            )}
          >
            <span className={iconTile(darkMode, row.tone)}>{row.icon}</span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={dot(row.tone)} />
                <span
                  className={cx(
                    'text-sm font-semibold',
                    darkMode ? 'text-slate-100' : 'text-[#2A2E43]',
                  )}
                >
                  {row.label}
                </span>
              </div>
              <p className={cx(mono(darkMode), 'mt-0.5 truncate')}>
                {row.location}
              </p>
              <p className={cx(muted(darkMode), 'mt-0.5')}>{row.detail}</p>
            </div>

            {row.action && (
              <button
                type="button"
                onClick={row.action.onClick}
                disabled={row.action.busy}
                className={secondaryButton(darkMode)}
              >
                {row.action.busy ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : row.action.label === 'Refresh' ? (
                  <RefreshCw size={15} />
                ) : (
                  <CloudUpload size={15} />
                )}
                {row.action.label}
              </button>
            )}
          </li>
        ))}
      </ul>

      {driveOnly > 0 && (
        <div
          className={cx(
            'mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3',
            darkMode
              ? 'border-amber-500/25 bg-amber-500/10'
              : 'border-amber-200 bg-amber-50',
          )}
        >
          <p
            className={cx(
              'text-xs',
              darkMode ? 'text-amber-200' : 'text-amber-800',
            )}
          >
            {driveOnly} snapshot(s) exist in Google Drive but are not registered
            here. Fetch them to make them restorable.
          </p>
          <button
            type="button"
            onClick={onFetchAll}
            className={cx(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
              darkMode
                ? 'bg-amber-500/20 text-amber-100 hover:bg-amber-500/30'
                : 'bg-amber-600 text-white hover:bg-amber-700',
            )}
          >
            <CloudDownload size={15} />
            Fetch all
          </button>
        </div>
      )}
    </section>
  )
}

export function TableBreakdown({
  rows,
  darkMode,
}: {
  rows: TableRow[]
  darkMode: boolean
}) {
  const ordered = BACKUP_TABLES.map((spec) => ({
    table: spec.table,
    label: spec.label,
    current: rows.find((r) => r.table === spec.table)?.current ?? 0,
  }))
  const total = ordered.reduce((sum, r) => sum + r.current, 0)

  return (
    <section
      className={`rounded-xl border p-5 ${
        darkMode ? 'bg-[#211a3d] border-white/10' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <HardDrive
          size={16}
          className={darkMode ? 'text-[#8b7fd4]' : 'text-[#4E69D3]'}
        />
        <h2
          className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-[#1d4662]'}`}
        >
          Current database table breakdown
        </h2>
      </div>
      <p
        className={`text-xs mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
      >
        {ordered.length} tables · {total.toLocaleString()} rows in total.
      </p>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((row) => (
          <div
            key={row.table}
            className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
              darkMode
                ? 'border-white/10 bg-slate-900/30'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="min-w-0">
              <p
                className={`text-xs font-semibold truncate ${darkMode ? 'text-slate-200' : 'text-[#2A2E43]'}`}
              >
                {row.label}
              </p>
              <p
                className={`text-[10px] font-mono truncate ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}
              >
                {row.table}
              </p>
            </div>
            <span
              className={`text-sm font-bold flex-shrink-0 ${darkMode ? 'text-slate-300' : 'text-[#1d4662]'}`}
            >
              {row.current.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}


