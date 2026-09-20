'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from 'lucide-react'
import { useDarkMode } from '@/app/admin/DarkModeContext'
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
  AUDIT_ROLE_LABELS,
} from '@/lib/constants/audit'
import type {
  AuditLogResult,
  AuditLogFilters,
} from '@/lib/actions/audit'

const ROLES = ['ADMIN', 'MEDSTAFF']

function formatDateTime(iso: string) {
  const date = new Date(iso)
  return {
    date: date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }),
  }
}

function buildQuery(filters: AuditLogFilters, page: number) {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.action && filters.action !== 'ALL') params.set('action', filters.action)
  if (filters.entity && filters.entity !== 'ALL') params.set('entity', filters.entity)
  if (filters.role && filters.role !== 'ALL') params.set('role', filters.role)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (page > 1) params.set('page', String(page))
  return params.toString()
}

const actionTone: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  UPDATE: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  DELETE: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  APPROVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  REJECT: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  STATUS_CHANGE: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  LOGIN: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  LOGIN_FAILED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  LOGOUT: 'bg-slate-200 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
  PASSWORD_CHANGE: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  PASSWORD_RESET: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  NOTIFY: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
  VIEW: 'bg-slate-200 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
}

export default function AuditLogsClient({
  initialResult,
  initialFilters,
}: {
  initialResult: AuditLogResult
  initialFilters: AuditLogFilters
}) {
  const { darkMode } = useDarkMode()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [filters, setFilters] = useState<AuditLogFilters>(initialFilters)
  const [searchInput, setSearchInput] = useState(initialFilters.search ?? '')
  const [expanded, setExpanded] = useState<string | null>(null)

  const applyNavigation = useCallback(
    (nextFilters: AuditLogFilters, page: number) => {
      const query = buildQuery(nextFilters, page)
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname)
      })
    },
    [pathname, router],
  )

  // Keep local state in sync when the URL changes (back/forward navigation).
  useEffect(() => {
    setFilters({
      search: searchParams.get('search') || undefined,
      action: searchParams.get('action') || undefined,
      entity: searchParams.get('entity') || undefined,
      role: searchParams.get('role') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
    })
    setSearchInput(searchParams.get('search') || '')
  }, [searchParams])

  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).filter(
        ([key, value]) => value && value !== 'ALL' && key !== 'search',
      ).length,
    [filters],
  )

  const submitFilters = (next: AuditLogFilters, page = 1) => {
    setFilters(next)
    applyNavigation(next, page)
  }

  const resetFilters = () => {
    setSearchInput('')
    submitFilters({})
  }

  const selectClass = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-sky-400 ${
    darkMode
      ? 'border-slate-700 bg-slate-800 text-slate-100'
      : 'border-slate-300 bg-white text-slate-700'
  }`

  const cardClass = `rounded-2xl border shadow-sm ${
    darkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-white'
  }`

  const stats = initialResult.stats

  const statCards = [
    {
      label: 'Total Entries',
      value: stats.total,
    },
    {
      label: 'Logged Today',
      value: stats.today,
    },
    {
      label: 'Admin Actions',
      value: stats.admins,
    },
    {
      label: 'Med Staff Actions',
      value: stats.staff,
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        <h1
          className={`text-2xl font-bold ${
            darkMode ? 'text-slate-100' : 'text-slate-800'
          }`}
        >
          Audit Logs
        </h1>
      </header>

      {/* Summary cards */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map(({ label, value }) => (
          <div
            key={label}
            className={`${cardClass} flex items-center p-4`}
          >
            <span>
              <span
                className={`block text-xl font-bold leading-none ${
                  darkMode ? 'text-slate-100' : 'text-slate-800'
                }`}
              >
                {value.toLocaleString()}
              </span>
              <span
                className={`text-xs ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {label}
              </span>
            </span>
          </div>
        ))}
      </section>

      {/* Filters */}
      <section className={`${cardClass} p-4`}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            submitFilters({ ...filters, search: searchInput.trim() || undefined })
          }}
        >
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search description, actor, or reference ID…"
                className={`${selectClass} pl-9`}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  darkMode
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Reset
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <select
              aria-label="Filter by action"
              value={filters.action ?? 'ALL'}
              onChange={(event) =>
                submitFilters({ ...filters, action: event.target.value })
              }
              className={selectClass}
            >
              <option value="ALL">All Actions</option>
              {AUDIT_ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {AUDIT_ACTION_LABELS[action] ?? action}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by entity"
              value={filters.entity ?? 'ALL'}
              onChange={(event) =>
                submitFilters({ ...filters, entity: event.target.value })
              }
              className={selectClass}
            >
              <option value="ALL">All Entities</option>
              {AUDIT_ENTITIES.map((entity) => (
                <option key={entity} value={entity}>
                  {AUDIT_ENTITY_LABELS[entity] ?? entity}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by role"
              value={filters.role ?? 'ALL'}
              onChange={(event) =>
                submitFilters({ ...filters, role: event.target.value })
              }
              className={selectClass}
            >
              <option value="ALL">All Roles</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {AUDIT_ROLE_LABELS[role] ?? role}
                </option>
              ))}
            </select>
            <input
              aria-label="From date"
              type="date"
              value={filters.from ?? ''}
              onChange={(event) =>
                submitFilters({ ...filters, from: event.target.value || undefined })
              }
              className={selectClass}
            />
            <input
              aria-label="To date"
              type="date"
              value={filters.to ?? ''}
              onChange={(event) =>
                submitFilters({ ...filters, to: event.target.value || undefined })
              }
              className={selectClass}
            />
          </div>
          {activeFilterCount > 0 && (
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
            </p>
          )}
        </form>
      </section>

      {/* Logs table */}
      <section className={`${cardClass} overflow-hidden`}>
        {initialResult.logs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Inbox
              className={`h-10 w-10 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`}
            />
            <p
              className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}
            >
              {initialResult.message || 'No audit entries found.'}
            </p>
            <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Actions performed by admins and medical staff will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead
                className={`text-xs uppercase tracking-wide ${
                  darkMode
                    ? 'bg-slate-900/60 text-slate-400'
                    : 'bg-slate-50 text-slate-500'
                }`}
              >
                <tr>
                  <th className="px-4 py-3 font-semibold">Log ID</th>
                  <th className="px-4 py-3 font-semibold">Actor</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Entity</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Date &amp; Time</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${darkMode ? 'divide-slate-700/60' : 'divide-slate-100'}`}
              >
                {initialResult.logs.map((log) => {
                  const { date, time } = formatDateTime(log.createdAt)
                  const isExpanded = expanded === log.logid
                  return (
                    <tr
                      key={log.logid}
                      onClick={() => setExpanded(isExpanded ? null : log.logid)}
                      className={`cursor-pointer align-top transition ${
                        darkMode ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td
                        className={`whitespace-nowrap px-4 py-3 font-mono text-xs ${
                          darkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {log.logid}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`block font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}
                        >
                          {log.actorName || 'System'}
                        </span>
                        <span
                          className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
                        >
                          {log.actorRole === 'SUPERADMIN'
                            ? AUDIT_ROLE_LABELS.ADMIN
                            : (AUDIT_ROLE_LABELS[log.actorRole] ??
                              log.actorRole)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            log.status === 'FAILURE'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                              : actionTone[log.action] ??
                                'bg-slate-200 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300'
                          }`}
                        >
                          {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}
                        >
                          {AUDIT_ENTITY_LABELS[log.entity] ?? log.entity}
                        </span>
                        {log.entityId && (
                          <span
                            className={`block font-mono text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}
                          >
                            {log.entityId}
                          </span>
                        )}
                      </td>

                      <td
                        className={`max-w-[340px] px-4 py-3 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}
                      >
                        <span className={isExpanded ? '' : 'line-clamp-2'}>
                          {log.description}
                        </span>
                        {isExpanded && (
                          <span
                            className={`mt-2 block space-y-1 rounded-lg p-2 text-xs ${
                              darkMode ? 'bg-slate-900/60' : 'bg-slate-50'
                            }`}
                          >
                            {log.actorEmail && (
                              <span className="block">Email: {log.actorEmail}</span>
                            )}
                            {log.ipAddress && (
                              <span className="block">IP: {log.ipAddress}</span>
                            )}
                            {log.userAgent && (
                              <span className="block break-all">
                                Client: {log.userAgent}
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
                      >
                        <span className="block">{date}</span>
                        <span className="block">{time}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pagination */}
      {initialResult.totalPages > 1 && (
        <nav className="flex items-center justify-between">
          <p
            className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
          >
            Showing{' '}
            {(initialResult.page - 1) * initialResult.perPage + 1}-
            {Math.min(
              initialResult.page * initialResult.perPage,
              initialResult.total,
            )}{' '}
            of {initialResult.total.toLocaleString()} entries
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={initialResult.page <= 1 || isPending}
              onClick={() => applyNavigation(filters, initialResult.page - 1)}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                darkMode
                  ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span
              className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}
            >
              Page {initialResult.page} of {initialResult.totalPages}
            </span>
            <button
              type="button"
              disabled={initialResult.page >= initialResult.totalPages || isPending}
              onClick={() => applyNavigation(filters, initialResult.page + 1)}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                darkMode
                  ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </nav>
      )}
    </div>
  )
}



