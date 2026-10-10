'use client'


import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Clock,
  CloudUpload,
  Database,
  HardDrive,
  HardDriveDownload,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
} from 'lucide-react'
import { useDarkMode } from '@/app/admin/DarkModeContext'
import {
  createDatabaseBackup,
  deleteDatabaseBackup,
  fetchBackupFromCloudAction,
  getBackupOverview,
  pushAllBackupsToDriveAction,
  restoreDatabaseBackup,
  refreshBackupsFromStoreAction,
  runScheduledBackup,
  type BackupOverview,
} from '@/lib/actions/backup'
import { formatBackupInterval, formatBytes } from '@/lib/constants/backup'
import type { BackupRecord } from '@/lib/backup'
import {
  BackupTable,
  RestoreDialog,
  StoragePanel,
  SummaryCard,
  TableBreakdown,
  formatDateTime,
  formatTimeAgo,
  nextBackupDue,
  relativeTime,
  type StorageRow,
  type TableRow,
} from './BackupParts'
import {
  card,
  cx,
  heading,
  iconTile,
  muted,
  secondaryButton,
} from './backupUi'

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

  const handleCreate = () =>
    startTransition(async () => {
      setBusy('create')
      const res = await createDatabaseBackup(note.trim() || undefined)
      setBusy(null)
      if (!res.success) {
        toast.error(res.message)
        return
      }
      setNote('')
      toast.success(res.message)
      if (res.cloud?.success) toast.success(res.cloud.message)
      else if (res.cloud) {
        toast.warning(`Drive copy failed: ${res.cloud.message}`)
      }
      await refresh()
      router.refresh()
    })

  const handleRunSchedule = () =>
    startTransition(async () => {
      setBusy('schedule')
      const res = await runScheduledBackup()
      setBusy(null)
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
    })

  const handleRefreshStore = () =>
    startTransition(async () => {
      setBusy('refresh')
      const res = await refreshBackupsFromStoreAction()
      setBusy(null)
      if (!res.success) {
        toast.error(res.message)
        return
      }
      toast.success(res.message)
      await refresh()
      router.refresh()
    })

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

  const handleRestore = (backup: BackupRecord, confirm: string) =>
    startTransition(async () => {
      setBusy('restore')
      const res = await restoreDatabaseBackup(backup.backupId, confirm)
      setBusy(null)
      if (!res.success) {
        toast.error(res.message)
        return
      }
      toast.success(res.message)
      setRestoreTarget(null)
      await refresh()
      router.refresh()
    })

  const handleSyncDrive = () =>
    startTransition(async () => {
      setBusy('drive-all')
      const res = await pushAllBackupsToDriveAction()
      setBusy(null)
      if (!res.success) {
        toast.error(res.message)
        return
      }
      toast.success(res.message)
      await refresh()
      router.refresh()
    })

  const handleFetchAllFromDrive = () =>
    startTransition(async () => {
      const pending = overview.cloud.files.filter(
        (f) => !overview.backups.some((b) => b.backupId === f.backupId),
      )
      if (pending.length === 0) {
        toast.info('Everything in Google Drive is already fetched.')
        return
      }

      setBusy('fetch-all')
      let ok = 0
      for (const file of pending) {
        const res = await fetchBackupFromCloudAction(file.backupId)
        if (res.success) ok += 1
        else toast.error(`${file.backupId}: ${res.message}`)
      }
      setBusy(null)

      if (ok > 0) toast.success(`Fetched ${ok} snapshot(s) from Google Drive.`)
      await refresh()
      router.refresh()
    })

  const driveOnlyCount = useMemo(
    () =>
      overview.cloud.files.filter(
        (f) => !overview.backups.some((b) => b.backupId === f.backupId),
      ).length,
    [overview.cloud.files, overview.backups],
  )

  const storageRows = useMemo<StorageRow[]>(() => {
    const { status } = overview.cloud
    const { blob } = overview

    return [
      {
        icon: <HardDrive size={17} />,
        label: 'Server storage',
        location: overview.backupDirectory,
        detail: overview.storageAvailable
          ? `${overview.filesOnDisk} snapshot(s) using ${formatBytes(overview.diskBytes)}`
          : 'Folder is not writable',
        tone: overview.storageAvailable ? 'good' : 'bad',
        action: {
          label: 'Refresh',
          onClick: handleRefreshStore,
          busy: busy === 'refresh',
        },
      },
      {
        icon: <CloudUpload size={17} />,
        label: 'Google Drive',
        location: status.directory ?? 'Not detected',
        detail: status.available
          ? `${status.fileCount} snapshot(s) using ${formatBytes(status.totalBytes)}` +
            (status.enabled ? ' · mirroring on' : ' · mirroring off')
          : status.message || 'Configure Google Drive credentials or set GOOGLE_DRIVE_DIR',
        tone: status.available ? (status.enabled ? 'good' : 'warn') : 'warn',
        action: {
          label: 'Sync all',
          onClick: handleSyncDrive,
          busy: busy === 'drive-all',
        },
      },
      {
        icon: <Server size={17} />,
        label: 'Vercel Blob',
        location: blob.configured ? `${blob.prefix}/` : 'Not configured',
        detail: blob.configured
          ? `${blob.fileCount} snapshot(s) using ${formatBytes(blob.totalBytes)}`
          : 'Set BLOB_READ_WRITE_TOKEN for serverless',
        tone: blob.configured ? 'good' : 'warn',
      },
    ]
  }, [
    overview.cloud,
    overview.blob,
    overview.backupDirectory,
    overview.filesOnDisk,
    overview.diskBytes,
    overview.storageAvailable,
    busy,
  ])

  const lastAuto = overview.lastAutomaticBackupAt
    ? formatDateTime(overview.lastAutomaticBackupAt)
    : null

  const lastRestore = overview.lastRestoredAt
    ? formatDateTime(overview.lastRestoredAt)
    : null

  return (
    <div className="pb-10">
      <RestoreDialog
        backup={restoreTarget}
        darkMode={darkMode}
        busy={busy !== null}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestore}
      />

      {/* The header doubles as the primary action: "Back up now" belongs next to
          the title rather than in a panel of its own. */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className={cx(
              'text-[30px] sm:text-[38px] lg:text-[45px] font-bold my-0 mb-[14px]',
              darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]',
            )}
          >
            Database Backup
          </h1>
        </div>

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
            Back up now
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
                {formatBackupInterval(overview.autoBackupIntervalHours)} while the
                app is in use. The oldest automatic backups are pruned beyond{' '}
                {overview.autoBackupRetention} kept (about{' '}
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
                  <span className={cx(darkMode ? 'text-gray-400' : 'text-gray-500')}>
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
                    <span className="font-medium text-gray-400">None recorded yet</span>
                  )}
                </div>

                {overview.lastAutomaticBackupAt && (
                  <div className="flex items-center gap-2 border-l pl-4 border-gray-300 dark:border-white/10">
                    <span className={cx(darkMode ? 'text-gray-400' : 'text-gray-500')}>
                      Next check due:
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {nextBackupDue(overview.lastAutomaticBackupAt, overview.autoBackupIntervalHours)}
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