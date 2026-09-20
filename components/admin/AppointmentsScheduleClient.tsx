'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useDarkMode } from '@/app/admin/DarkModeContext'
import {
  cancelAppointment,
  updateAppointmentStatus,
  notifyAppointment,
} from '@/lib/actions/appointment'
import type { ScheduleAppointmentView } from '@/config/appointment'
import MedicalRecordModal from '@/components/ui/MedicalRecordModal'

const PER_PAGE = 10

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: '#FEF3C7', color: '#92400E' },
  APPROVED: { bg: '#DCFCE7', color: '#166534' },
  COMPLETED: { bg: '#DBEAFE', color: '#1E40AF' },
  CANCELLED: { bg: '#FEE2E2', color: '#B91C1C' },
  NO_SHOW: { bg: '#EDE9FE', color: '#6D28D9' },
}

function statusStyle(status: string) {
  return (
    STATUS_STYLES[status] ?? {
      bg: '#F1F5F9',
      color: '#475569',
    }
  )
}

export default function AppointmentsScheduleClient({
  appointments,
  todayISO,
}: {
  appointments: ScheduleAppointmentView[]
  todayISO: string
}) {
  const { darkMode } = useDarkMode()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [busyId, setBusyId] = useState<string | null>(null)

  const [todayPage, setTodayPage] = useState(1)
  const [upcomingPage, setUpcomingPage] = useState(1)
  const [allPage, setAllPage] = useState(1)

  const [statusFilter, setStatusFilter] = useState('ALL')

  const [recordFor, setRecordFor] =
    useState<ScheduleAppointmentView | null>(null)


  const today = useMemo(
    () => appointments.filter((a) => a.dateISO === todayISO),
    [appointments, todayISO],
  )

  const upcoming = useMemo(
    () => appointments.filter((a) => a.dateISO > todayISO),
    [appointments, todayISO],
  )

  const allAppointments = useMemo(
    () =>
      statusFilter === 'ALL'
        ? appointments
        : appointments.filter((a) => a.status === statusFilter),
    [appointments, statusFilter],
  )

  const runAction = (
    id: string,
    action: () => Promise<{ success: boolean; message: string }>,
  ) => {
    setBusyId(id)

    startTransition(async () => {
      const result = await action()

      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }

      setBusyId(null)
    })
  }

  const approve = (a: ScheduleAppointmentView) =>
    runAction(a.id, () => updateAppointmentStatus(a.id, 'APPROVED'))

  const noShow = (a: ScheduleAppointmentView) =>
    runAction(a.id, () => updateAppointmentStatus(a.id, 'NO_SHOW'))

  const cancel = (a: ScheduleAppointmentView) =>
    runAction(a.id, () => cancelAppointment(a.id))

  const notify = (a: ScheduleAppointmentView) =>
    runAction(a.id, () => notifyAppointment(a.id))


  const cardClass = `
    rounded-2xl border p-5 sm:p-6
    ${
      darkMode
        ? 'bg-[#171a3d] border-white/[0.08]'
        : 'bg-white border-gray-200/80'
    }
    shadow-sm
  `

  const sectionTitle = `
    text-lg sm:text-xl font-bold
    ${darkMode ? 'text-white' : 'text-[#1D4662]'}
  `

  const sectionDescription = `
    text-sm
    ${darkMode ? 'text-gray-400' : 'text-gray-500'}
  `

  const tableBorder = darkMode
    ? 'border-white/[0.08]'
    : 'border-gray-200'

  const tableHeader = `
    bg-[#4E69D3]
    text-white
    text-xs
    font-bold
    uppercase
    tracking-wide
  `

  const rowClass = `
    border-b last:border-b-0 transition-colors
    ${
      darkMode
        ? 'border-white/[0.06] odd:bg-[#121633] even:bg-white/[0.025] hover:bg-[#202650]'
        : 'border-gray-100 odd:bg-white even:bg-gray-50/70 hover:bg-[#F4F6FF]'
    }
  `

  const cellText = darkMode ? 'text-gray-200' : 'text-gray-700'

  const buttonBase = `
    inline-flex items-center justify-center
    rounded-lg
    px-3 py-2
    text-xs font-semibold
    whitespace-nowrap
    transition-colors
    disabled:cursor-not-allowed
    disabled:opacity-50
  `

  const btnPrimary = `
    ${buttonBase}
    bg-[#4E69D3] text-white
    hover:bg-[#3D56B8]
  `

  const btnGreen = `
    ${buttonBase}
    bg-green-600 text-white
    hover:bg-green-700
  `

  const btnAmber = `
    ${buttonBase}
    bg-amber-500 text-white
    hover:bg-amber-600
  `

  const btnRed = `
    ${buttonBase}
    bg-red-500 text-white
    hover:bg-red-600
  `

  const btnNotify = `
    ${buttonBase}
    bg-sky-500 text-white
    hover:bg-sky-600
  `


  const renderActions = (a: ScheduleAppointmentView) => {
    if (busyId === a.id && isPending) {
      return (
        <span
          className={`text-xs font-medium ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          Updating...
        </span>
      )
    }

    switch (a.status) {
      case 'PENDING':
        return (
          <div className="flex flex-wrap gap-2">
            <button
              className={btnGreen}
              onClick={() => approve(a)}
              disabled={isPending}
            >
              Approve
            </button>

            <button
              className={btnNotify}
              onClick={() => notify(a)}
              disabled={isPending}
            >
              Notify
            </button>

            <button
              className={btnRed}
              onClick={() => cancel(a)}
              disabled={isPending}
            >
              Cancel
            </button>
          </div>
        )

      case 'APPROVED':
        return (
          <div className="flex flex-wrap gap-2">
            <button
              className={btnPrimary}
              onClick={() => setRecordFor(a)}
              disabled={isPending}
            >
              Complete & Record
            </button>

            <button
              className={btnNotify}
              onClick={() => notify(a)}
              disabled={isPending}
            >
              Notify
            </button>

            <button
              className={btnAmber}
              onClick={() => noShow(a)}
              disabled={isPending}
            >
              No Show
            </button>

            <button
              className={btnRed}
              onClick={() => cancel(a)}
              disabled={isPending}
            >
              Cancel
            </button>
          </div>
        )

      case 'COMPLETED':
        return (
          <div className="flex flex-wrap gap-2">
            <button
              className={btnPrimary}
              onClick={() => setRecordFor(a)}
              disabled={isPending}
            >
              {a.hasMedicalRecord ? 'View / Edit Record' : 'Add Record'}
            </button>

            <button
              className={btnNotify}
              onClick={() => notify(a)}
              disabled={isPending}
            >
              Notify
            </button>
          </div>
        )

      default:
        return (
          <span
            className={`text-sm ${
              darkMode ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            —
          </span>
        )
    }
  }


  const renderPatient = (a: ScheduleAppointmentView) => (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className={`
          flex h-9 w-9 shrink-0 items-center justify-center
          rounded-full text-sm font-bold
          ${
            darkMode
              ? 'bg-[#4E69D3]/25 text-blue-200'
              : 'bg-[#E8EAF6] text-[#4E69D3]'
          }
        `}
      >
        {a.patientName.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0">
        <div
          className={`
            truncate text-sm font-semibold
            ${darkMode ? 'text-gray-100' : 'text-gray-800'}
          `}
          title={a.patientName}
        >
          {a.patientName}
        </div>

        {a.patientReference && (
          <div
            className={`
              mt-0.5 truncate text-xs font-medium
              ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}
            `}
          >
            {a.patientReference}
          </div>
        )}
      </div>
    </div>
  )


  const EmptyState = ({
    message,
    colSpan,
  }: {
    message: string
    colSpan: number
  }) => (
    <tr className={rowClass}>
      <td colSpan={colSpan}>
        <div className="flex flex-col items-center justify-center px-6 py-12">
          <div
            className={`
              mb-3 flex h-11 w-11 items-center justify-center rounded-full
              ${
                darkMode
                  ? 'bg-white/[0.06] text-gray-500'
                  : 'bg-gray-100 text-gray-400'
              }
            `}
          >
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>

          <p
            className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            {message}
          </p>
        </div>
      </td>
    </tr>
  )


  const TableHeader = ({
    includeDate = true,
  }: {
    includeDate?: boolean
  }) => (
    <thead>
      <tr className={tableHeader}>
        <th className="px-5 py-3.5 text-left w-[25%]">Patient</th>
        <th className="px-5 py-3.5 text-left w-[18%]">Service</th>

        {includeDate && (
          <th className="px-5 py-3.5 text-left w-[15%]">Date</th>
        )}

        <th className="px-5 py-3.5 text-left w-[14%]">Time</th>
        <th className="px-5 py-3.5 text-left w-[12%]">Status</th>
        <th className="px-5 py-3.5 text-left w-[25%]">Actions</th>
      </tr>
    </thead>
  )


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1
          className={`
            text-2xl sm:text-3xl font-bold
            ${darkMode ? 'text-white' : 'text-[#1D4662]'}
          `}
        >
          Appointment Schedule
        </h1>

        <p
          className={`
            mt-1 text-sm
            ${darkMode ? 'text-gray-400' : 'text-gray-500'}
          `}
        >
          Manage today&apos;s appointments, upcoming visits, and appointment
          history.
        </p>
      </div>


      <section className={cardClass}>
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className={sectionTitle}>Today&apos;s Schedule</h2>

            <p className={sectionDescription}>
              {today.length} appointment{today.length === 1 ? '' : 's'} scheduled
              for today
            </p>
          </div>

          <div
            className={`
              inline-flex w-fit items-center rounded-full px-3 py-1.5
              text-xs font-semibold
              ${
                darkMode
                  ? 'bg-blue-500/10 text-blue-300'
                  : 'bg-blue-50 text-blue-700'
              }
            `}
          >
            {today.length} today
          </div>
        </div>

        <div
          className={`overflow-hidden rounded-xl border ${tableBorder}`}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <TableHeader includeDate={false} />

              <tbody>
                {today.length === 0 ? (
                  <EmptyState
                    message="No appointments scheduled for today yet."
                    colSpan={5}
                  />
                ) : (
                  paginate(today, todayPage).map((a) => (
                    <tr key={a.id} className={rowClass}>
                      <td className="px-5 py-4">
                        {renderPatient(a)}
                      </td>

                      <td
                        className={`px-5 py-4 text-sm font-medium ${cellText}`}
                      >
                        <span className="line-clamp-2">
                          {a.serviceName}
                        </span>
                      </td>

                      <td
                        className={`px-5 py-4 text-sm font-medium whitespace-nowrap ${cellText}`}
                      >
                        {a.timeLabel}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={a.status} />
                      </td>

                      <td className="px-5 py-4">
                        {renderActions(a)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {Math.ceil(today.length / PER_PAGE) > 1 && (
          <Pagination
            darkMode={darkMode}
            page={todayPage}
            totalPages={Math.ceil(today.length / PER_PAGE)}
            onPage={setTodayPage}
          />
        )}
      </section>


      <section className={cardClass}>
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className={sectionTitle}>Upcoming Appointments</h2>

            <p className={sectionDescription}>
              Scheduled appointments after today.
            </p>
          </div>

          <div
            className={`
              inline-flex w-fit items-center rounded-full px-3 py-1.5
              text-xs font-semibold
              ${
                darkMode
                  ? 'bg-purple-500/10 text-purple-300'
                  : 'bg-purple-50 text-purple-700'
              }
            `}
          >
            {upcoming.length} upcoming
          </div>
        </div>

        <div
          className={`overflow-hidden rounded-xl border ${tableBorder}`}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse">
              <TableHeader />

              <tbody>
                {upcoming.length === 0 ? (
                  <EmptyState
                    message="No upcoming appointments."
                    colSpan={6}
                  />
                ) : (
                  paginate(upcoming, upcomingPage).map((a) => (
                    <tr key={a.id} className={rowClass}>
                      <td className="px-5 py-4">
                        {renderPatient(a)}
                      </td>

                      <td
                        className={`px-5 py-4 text-sm font-medium ${cellText}`}
                      >
                        <span className="line-clamp-2">
                          {a.serviceName}
                        </span>
                      </td>

                      <td
                        className={`px-5 py-4 text-sm font-medium whitespace-nowrap ${cellText}`}
                      >
                        {a.dateLabel}
                      </td>

                      <td
                        className={`px-5 py-4 text-sm font-medium whitespace-nowrap ${cellText}`}
                      >
                        {a.timeLabel}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={a.status} />
                      </td>

                      <td className="px-5 py-4">
                        {renderActions(a)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {Math.ceil(upcoming.length / PER_PAGE) > 1 && (
          <Pagination
            darkMode={darkMode}
            page={upcomingPage}
            totalPages={Math.ceil(upcoming.length / PER_PAGE)}
            onPage={setUpcomingPage}
          />
        )}
      </section>


      <section className={cardClass}>
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className={sectionTitle}>All Appointments</h2>

            <p className={sectionDescription}>
              {allAppointments.length} appointment
              {allAppointments.length === 1 ? '' : 's'} found
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="appointment-status-filter"
              className={`
                text-sm font-medium
                ${darkMode ? 'text-gray-300' : 'text-gray-600'}
              `}
            >
              Status
            </label>

            <div className="relative">
              <select
                id="appointment-status-filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setAllPage(1)
                }}
                className={`
                  appearance-none
                  rounded-lg
                  border
                  py-2.5 pl-3 pr-9
                  text-sm font-medium
                  outline-none
                  cursor-pointer
                  ${
                    darkMode
                      ? 'border-white/10 bg-[#0f1438] text-white focus:border-[#4E69D3]'
                      : 'border-gray-200 bg-white text-gray-700 focus:border-[#4E69D3]'
                  }
                `}
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="NO_SHOW">No Show</option>
              </select>

              <svg
                className={`
                  pointer-events-none absolute right-2.5 top-1/2
                  h-4 w-4 -translate-y-1/2
                  ${darkMode ? 'text-gray-400' : 'text-gray-400'}
                `}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </div>

        <div
          className={`overflow-hidden rounded-xl border ${tableBorder}`}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse">
              <TableHeader />

              <tbody>
                {allAppointments.length === 0 ? (
                  <EmptyState
                    message={
                      statusFilter === 'ALL'
                        ? 'No appointments found.'
                        : `No ${statusFilter
                            .replace('_', ' ')
                            .toLowerCase()} appointments found.`
                    }
                    colSpan={6}
                  />
                ) : (
                  paginate(allAppointments, allPage).map((a) => (
                    <tr key={a.id} className={rowClass}>
                      <td className="px-5 py-4">
                        {renderPatient(a)}
                      </td>

                      <td
                        className={`px-5 py-4 text-sm font-medium ${cellText}`}
                      >
                        <span className="line-clamp-2">
                          {a.serviceName}
                        </span>
                      </td>

                      <td
                        className={`px-5 py-4 text-sm font-medium whitespace-nowrap ${cellText}`}
                      >
                        {a.dateLabel}
                      </td>

                      <td
                        className={`px-5 py-4 text-sm font-medium whitespace-nowrap ${cellText}`}
                      >
                        {a.timeLabel}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={a.status} />
                      </td>

                      <td className="px-5 py-4">
                        {renderActions(a)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {Math.ceil(allAppointments.length / PER_PAGE) > 1 && (
          <Pagination
            darkMode={darkMode}
            page={allPage}
            totalPages={Math.ceil(allAppointments.length / PER_PAGE)}
            onPage={setAllPage}
          />
        )}
      </section>


      {recordFor && (
        <MedicalRecordModal
          appointment={recordFor}
          darkMode={darkMode}
          onClose={() => setRecordFor(null)}
          onSaved={() => {
            setRecordFor(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}


function paginate<T>(list: T[], page: number): T[] {
  return list.slice((page - 1) * PER_PAGE, page * PER_PAGE)
}

function StatusBadge({ status }: { status: string }) {
  const style = statusStyle(status)

  return (
    <span
      style={{
        backgroundColor: style.bg,
        color: style.color,
      }}
      className="
        inline-flex items-center
        rounded-full
        px-2.5 py-1
        text-[11px]
        font-bold
        whitespace-nowrap
      "
    >
      {status.replace('_', ' ')}
    </span>
  )
}

function Pagination({
  darkMode,
  page,
  totalPages,
  onPage,
}: {
  darkMode: boolean
  page: number
  totalPages: number
  onPage: (page: number) => void
}) {
  const pages = getPaginationPages(page, totalPages)

  return (
    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p
        className={`text-xs ${
          darkMode ? 'text-gray-500' : 'text-gray-500'
        }`}
      >
        Page {page} of {totalPages}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className={`
            rounded-lg border px-3 py-2
            text-xs font-semibold
            transition-colors
            disabled:cursor-not-allowed
            disabled:opacity-40
            ${
              darkMode
                ? 'border-white/10 bg-[#0f1438] text-gray-200 hover:bg-[#1a2050]'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          Previous
        </button>

        {pages.map((item, index) =>
          item === '...' ? (
            <span
              key={`ellipsis-${index}`}
              className={`
                px-1.5 text-sm
                ${darkMode ? 'text-gray-500' : 'text-gray-400'}
              `}
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPage(item)}
              className={`
                h-9 min-w-9 rounded-lg border
                px-2.5 text-xs font-bold
                transition-colors
                ${
                  item === page
                    ? 'border-[#4E69D3] bg-[#4E69D3] text-white'
                    : darkMode
                      ? 'border-white/10 bg-[#0f1438] text-gray-200 hover:bg-[#1a2050]'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              {item}
            </button>
          ),
        )}

        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className={`
            rounded-lg border px-3 py-2
            text-xs font-semibold
            transition-colors
            disabled:cursor-not-allowed
            disabled:opacity-40
            ${
              darkMode
                ? 'border-white/10 bg-[#0f1438] text-gray-200 hover:bg-[#1a2050]'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          Next
        </button>
      </div>
    </div>
  )
}

function getPaginationPages(
  currentPage: number,
  totalPages: number,
): Array<number | '...'> {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, '...', totalPages]
  }

  if (currentPage >= totalPages - 2) {
    return [
      1,
      '...',
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ]
  }

  return [
    1,
    '...',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    '...',
    totalPages,
  ]
}