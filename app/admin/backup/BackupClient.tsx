'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Clock,
  CloudUpload,
  Database,
  HardDriveDownload,
  History,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { useDarkMode } from '@/app/admin/DarkModeContext'
import {
  createDatabaseBackup,
  deleteDatabaseBackup,
  getBackupOverview,
  restoreDatabaseBackup,
  runScheduledBackup,
  type BackupOverview,
} from '@/lib/actions/backup'
import { formatBackupInterval, formatBytes } from '@/lib/constants/backup'
import type { BackupRecord } from '@/lib/backup'
import {
  BackupTable,
  RestoreDialog,
  SummaryCard,
  TableBreakdown,
  formatDateTime,
  formatTimeAgo,
  nextBackupDue,
  relativeTime,
  type TableRow,
} from './BackupParts'
import { card, cx, heading, iconTile, muted, secondaryButton } from './backupUi'

export default function BackupClient({
  initialOverview,
}: {
  initialOverview: BackupOverview
}) {
  const { darkMode } = useDarkMode()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [overview, setOverview] = useState<BackupOverview>(initialOverview)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<BackupRecord | null>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    setOverview(await getBackupOverview())
  }, [])

  const [, forceTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const tableRows = useMemo<TableRow[]>(
    () =>
      Object.entries(overview.currentCounts).map(([table, current]) => ({
        table,
        current,
      })),
    [overview.currentCounts],
  )

  const handleCreate = () => {
    setBusy('create')
    startTransition(async () => {
      try {
        const res = await createDatabaseBackup(note.trim() || undefined)
        if (!res.success) {
          toast.error(res.message)
          return
        }
        setNote('')
        toast.success(res.message)
        await refresh()
        router.refresh()
      } catch (error) {
        console.error('[BackupClient | create backup]:', error)
        toast.error('The database backup could not be created.')
      } finally {
        setBusy(null)
      }
    })
  }

  const handleRunSchedule = () => {
    setBusy('schedule')
    startTransition(async () => {
      try {
        const res = await runScheduledBackup()
        if (!res.success) {
          toast.error(res.message)
          return
        }
        toast.success(res.message)
        if (res.pruned?.length) {
          toast.info(
            `Pruned ${res.pruned.length} old automatic backup(s) beyond the retention limit.`,
          )
        }
        await refresh()
        router.refresh()
      } catch (error) {
        console.error('[BackupClient | scheduled backup]:', error)
        toast.error('The scheduled backup could not be completed.')
      } finally {
        setBusy(null)
      }
    })
  }

  const handleDelete = (backup: BackupRecord) =>
    startTransition(async () => {
      if (
        !window.confirm(
          `Delete backup "${backup.label}"? This removes it from every storage location and cannot be undone.`,
        )
      ) {
        return
      }
      setBusy(backup.backupId)
      const res = await deleteDatabaseBackup(backup.backupId)
      setBusy(null)
      if (!res.success) {
        toast.error(res.message)
        return
      }
      toast.success(res.message)
      await refresh()
      router.refresh()
    })

  const handleRestore = (backup: BackupRecord, confirm: string) => {
    setBusy('restore')
    startTransition(async () => {
      try {
        const res = await restoreDatabaseBackup(backup.backupId, confirm)
        if (!res.success) {
          toast.error(res.message)
          return
        }
        toast.success(res.message)
        setRestoreTarget(null)
        await refresh()
        router.refresh()
      } catch (error) {
        console.error('[BackupClient | restore backup]:', error)
        toast.error('The selected backup could not be restored.')
      } finally {
        setBusy(null)
      }
    })
  }

  const handleRestoreUpload = (file: File) => {
    if (
      !window.confirm(
        `Restore from "${file.name}"? This replaces the current database. A safety backup will be created first.`,
      )
    ) {
      return
    }

    setBusy('restore-upload')
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('file', file)
        const response = await fetch('/api/admin/backup/restore-upload', {
          method: 'POST',
          body: formData,
        })
        const result = await response.json()
        if (!response.ok || !result.success) {
          toast.error(
            result.message ?? 'Failed to restore the uploaded backup.',
          )
          return
        }
        toast.success(result.message)
        await refresh()
        router.refresh()
      } catch {
        toast.error('The uploaded backup could not be processed.')
      } finally {
        setBusy(null)
      }
    })
  }

  const lastAuto = overview.lastAutomaticBackupAt
    ? formatDateTime(overview.lastAutomaticBackupAt)
    : null

  const lastRestore = overview.lastRestoredAt
    ? formatDateTime(overview.lastRestoredAt)
    : null
  const operationMessage =
    busy === 'create'
      ? 'Creating database backup'
      : busy === 'schedule'
        ? 'Running scheduled backup'
        : busy === 'restore'
          ? 'Restoring database'
          : busy === 'restore-upload'
            ? 'Restoring from backup file'
            : null

  return (
    <div className="pb-10">
      {operationMessage && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#171333] p-7 text-center text-white shadow-2xl">
            <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-indigo-400/20" />
              <span className="absolute inset-1 rounded-full border-2 border-indigo-300/20 border-t-indigo-300 animate-spin" />
              <Loader2 size={27} className="animate-spin text-indigo-200" />
            </div>
            <p className="text-base font-semibold">{operationMessage}…</p>
            <p className="mt-2 text-sm text-slate-300">
              Please keep this page open while we safely process your data.
            </p>
            <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-300" />
            </div>
          </div>
        </div>
      )}
      <RestoreDialog
        backup={restoreTarget}
        darkMode={darkMode}
        busy={busy !== null}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestore}
      />

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            maxLength={200}
            aria-label="Backup note"
            className={cx(
              'flex-1 sm:w-56 rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#4E69D3]',
              darkMode
                ? 'border-slate-700 bg-slate-900/50 text-slate-100 placeholder:text-slate-500'
                : 'border-gray-300 bg-white text-[#2A2E43] placeholder:text-gray-400',
            )}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4E69D3] hover:bg-[#3D56B8] text-white text-sm font-semibold px-5 py-2.5 transition disabled:opacity-50"
          >
            {busy === 'create' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            {busy === 'create' ? 'Creating backup…' : 'Back up now'}
          </button>
          <input
            ref={uploadInputRef}
            type="file"
            accept=".json,.json.gz,application/json,application/gzip"
            className="hidden"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              if (file) handleRestoreUpload(file)
            }}
          />
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            disabled={busy !== null}
            className={cx(
              secondaryButton(darkMode),
              'justify-center disabled:opacity-50',
            )}
          >
            {busy === 'restore-upload' ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <CloudUpload size={15} />
            )}
            {busy === 'restore-upload' ? 'Restoring…' : 'Restore from file'}
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-6">
        <SummaryCard
          darkMode={darkMode}
          icon={<Database size={18} />}
          label="Rows in database"
          value={overview.totalRows.toLocaleString()}
        />
        <SummaryCard
          darkMode={darkMode}
          icon={<HardDriveDownload size={18} />}
          label="Stored backups"
          value={String(overview.backups.length)}
        />
        <SummaryCard
          darkMode={darkMode}
          icon={<Clock size={18} />}
          label="Last automatic backup"
          value={
            lastAuto ? (
              <div>
                <p
                  className={cx(
                    'text-base sm:text-lg font-bold leading-tight truncate',
                    darkMode ? 'text-white' : 'text-[#1d4662]',
                  )}
                  title={`${lastAuto.date} at ${lastAuto.time}`}
                >
                  {lastAuto.date}
                </p>
                <p
                  className={cx(
                    'text-xs font-semibold mt-0.5',
                    darkMode ? 'text-slate-300' : 'text-[#2A2E43]',
                  )}
                >
                  {lastAuto.time}
                </p>
              </div>
            ) : (
              'Never'
            )
          }
          subtext={
            overview.lastAutomaticBackupAt ? (
              <span
                className={cx(
                  'inline-flex items-center gap-1 font-medium',
                  darkMode ? 'text-emerald-400' : 'text-emerald-600',
                )}
                title="Time elapsed from last automatic backup"
              >
                <Clock size={12} />
                {formatTimeAgo(overview.lastAutomaticBackupAt)}
              </span>
            ) : undefined
          }
        />
        <SummaryCard
          darkMode={darkMode}
          icon={<History size={18} />}
          label="Last restore"
          value={
            lastRestore ? (
              <div>
                <p
                  className={cx(
                    'text-base sm:text-lg font-bold leading-tight truncate',
                    darkMode ? 'text-white' : 'text-[#1d4662]',
                  )}
                  title={`${lastRestore.date} at ${lastRestore.time}`}
                >
                  {lastRestore.date}
                </p>
                <p
                  className={cx(
                    'text-xs font-semibold mt-0.5',
                    darkMode ? 'text-slate-300' : 'text-[#2A2E43]',
                  )}
                >
                  {lastRestore.time}
                </p>
              </div>
            ) : (
              'Never'
            )
          }
          subtext={
            overview.lastRestoredAt ? (
              <span
                className={cx(
                  'inline-flex items-center gap-1 font-medium',
                  darkMode ? 'text-sky-400' : 'text-sky-600',
                )}
                title="Time elapsed from last restore"
              >
                <History size={12} />
                {formatTimeAgo(overview.lastRestoredAt)}
              </span>
            ) : undefined
          }
        />
        <SummaryCard
          darkMode={darkMode}
          icon={<ShieldCheck size={18} />}
          label="Total backup size"
          value={formatBytes(overview.totalSizeBytes)}
        />
      </section>

      <section className={card(darkMode)}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className={iconTile(darkMode, 'good')}>
              <RefreshCw size={17} />
            </span>
            <div>
              <h2 className={heading(darkMode)}>Automatic backups</h2>
              <p className={cx(muted(darkMode), 'mt-1')}>
                A snapshot is taken automatically{' '}
                {formatBackupInterval(overview.autoBackupIntervalHours)} while
                the app is in use. The oldest automatic backups are pruned
                beyond {overview.autoBackupRetention} kept (about{' '}
                {Math.round(
                  (overview.autoBackupRetention *
                    overview.autoBackupIntervalHours) /
                    24 /
                    7,
                )}{' '}
                weeks of history).
              </p>

              {/* Automatic backup time log details */}
              <div
                className={cx(
                  'mt-3.5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border px-4 py-2.5 text-xs',
                  darkMode
                    ? 'border-white/10 bg-slate-900/40 text-slate-300'
                    : 'border-gray-200 bg-gray-50/80 text-gray-700',
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cx(darkMode ? 'text-gray-400' : 'text-gray-500')}
                  >
                    Last automatic backup:
                  </span>
                  {overview.lastAutomaticBackupAt && lastAuto ? (
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {lastAuto.date} at {lastAuto.time}{' '}
                      <span
                        className={cx(
                          'ml-1 font-medium',
                          darkMode ? 'text-emerald-400' : 'text-emerald-600',
                        )}
                      >
                        ({formatTimeAgo(overview.lastAutomaticBackupAt)})
                      </span>
                    </span>
                  ) : (
                    <span className="font-medium text-gray-400">
                      None recorded yet
                    </span>
                  )}
                </div>

                {overview.lastAutomaticBackupAt && (
                  <div className="flex items-center gap-2 border-l pl-4 border-gray-300 dark:border-white/10">
                    <span
                      className={cx(
                        darkMode ? 'text-gray-400' : 'text-gray-500',
                      )}
                    >
                      Next check due:
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {nextBackupDue(
                        overview.lastAutomaticBackupAt,
                        overview.autoBackupIntervalHours,
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRunSchedule}
            disabled={isPending}
            className={secondaryButton(darkMode)}
          >
            {busy === 'schedule' ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <RefreshCw size={15} />
            )}
            Run schedule now
          </button>
        </div>
      </section>

      <BackupTable
        backups={overview.backups}
        darkMode={darkMode}
        busy={busy}
        isPending={isPending}
        onRestore={setRestoreTarget}
        onDelete={handleDelete}
      />

      <TableBreakdown rows={tableRows} darkMode={darkMode} />
    </div>
  )
}
