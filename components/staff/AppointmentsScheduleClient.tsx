'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useDarkMode } from '@/app/staff/DarkModeContext'
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
  IN_CONSULTATION: { bg: '#E0F2FE', color: '#0369A1' },
  COMPLETED: { bg: '#DBEAFE', color: '#1E40AF' },
  CANCELLED: { bg: '#FEE2E2', color: '#B91C1C' },
  NO_SHOW: { bg: '#EDE9FE', color: '#6D28D9' },
}

function statusStyle(status: string) {
  return STATUS_STYLES[status] ?? { bg: '#F1F5F9', color: '#475569' }
}

export default function AppointmentsScheduleClient({
  appointments,
}: {
  appointments: ScheduleAppointmentView[]
}) {
  const { darkMode } = useDarkMode()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [allPage, setAllPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [recordFor, setRecordFor] = useState<ScheduleAppointmentView | null>(
    null,
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
  const cancel = (a: ScheduleAppointmentView) =>
    runAction(a.id, () => cancelAppointment(a.id))
  const notify = (a: ScheduleAppointmentView) =>
    runAction(a.id, () => notifyAppointment(a.id))

  const btn =
    'border-none rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed'
  const btnPrimary = `${btn} bg-[#4E69D3] text-white hover:bg-[#3D56B8]`
  const btnGreen = `${btn} bg-green-600 text-white hover:bg-green-700`
  const btnRed = `${btn} bg-red-500 text-white hover:bg-red-600`
  const btnNotify = `${btn} bg-sky-500 text-white hover:bg-sky-600`

  const rowClass = `border-b last:border-0 transition-colors ${
    darkMode
      ? 'odd:bg-[#0f1438] even:bg-white/[0.04] border-white/[0.06] hover:bg-[#3d2768]'
      : 'odd:bg-white even:bg-[#F6F8FF] border-[#EEF2F7] hover:bg-[#EEF0FB]'
  }`
  const cellText = darkMode ? 'text-[#F9FAFB]' : 'text-gray-700'
  const cardClass = `${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} border ${
    darkMode
      ? 'border-[rgba(255,255,255,0.10)]'
      : 'border-[rgba(15,60,95,0.08)]'
  } rounded-2xl p-4 shadow-sm sm:p-6`

  const renderActions = (a: ScheduleAppointmentView) => {
    if (busyId === a.id && isPending) {
      return (
        <span
          className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
        >
          Updating…
        </span>
      )
    }
    switch (a.status) {
      case 'PENDING':
        return (
          <div className="flex flex-wrap gap-2">
            <button className={btnGreen} onClick={() => approve(a)}>
              Approve
            </button>
            <button className={btnNotify} onClick={() => notify(a)}>
              Notify
            </button>
            <button className={btnRed} onClick={() => cancel(a)}>
              Cancel
            </button>
          </div>
        )
      case 'APPROVED':
        return (
          <div className="flex flex-wrap gap-2">
            {/* Medstaff hands the visit to admin: IN_CONSULTATION surfaces in
                admin for charting; only saving the record completes it. */}
            <button
              className={btnPrimary}
              onClick={() =>
                runAction(a.id, () =>
                  updateAppointmentStatus(a.id, 'IN_CONSULTATION'),
                )
              }
            >
              Start Consultation
            </button>
            <button className={btnNotify} onClick={() => notify(a)}>
              Notify
            </button>
            <button className={btnRed} onClick={() => cancel(a)}>
              Cancel
            </button>
          </div>
        )
      case 'IN_CONSULTATION':
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
            >
              In consultation — waiting for the record
            </span>
            <button className={btnNotify} onClick={() => notify(a)}>
              Notify
            </button>
          </div>
        )
      case 'COMPLETED':
        return (
          <div className="flex flex-wrap gap-2">
            <button className={btnPrimary} onClick={() => setRecordFor(a)}>
              {a.hasMedicalRecord ? 'View/Edit Record' : 'Add Record'}
            </button>
            <button className={btnNotify} onClick={() => notify(a)}>
              Notify
            </button>
          </div>
        )
      default:
        return (
          <span
            className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
          >
            &mdash;
          </span>
        )
    }
  }

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* All Appointments */}
      <div className={cardClass}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className={`m-0 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {allAppointments.length} appointment
            {allAppointments.length === 1 ? '' : 's'} found
          </p>
          <div className="relative flex items-center">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setAllPage(1)
              }}
              className={`w-full appearance-none rounded-lg border py-2.5 pl-3 pr-9 text-sm font-medium outline-none sm:w-auto ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] border-white/15' : 'bg-white text-gray-700 border-gray-200'}`}
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No Show</option>
            </select>
            <svg
              className={`absolute right-2.5 w-3.5 h-3.5 pointer-events-none ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-400'}`}
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
        <div
          className={`overflow-hidden rounded-2xl border ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'}`}
        >
          <div className="overflow-x-auto">
            <table
              className="w-full min-w-[1200px] border-collapse text-sm"
              style={{ tableLayout: 'fixed' }}
            >
              <thead>
                <tr className="bg-[#4E69D3]">
                  <th className="w-[24%] px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-white">
                    Patient Name
                  </th>
                  <th className="w-[15%] px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-white">
                    Service
                  </th>
                  <th className="w-[22%] px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-white">
                    Date
                  </th>
                  <th className="w-[10%] px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-white">
                    Time
                  </th>
                  <th className="w-[12%] px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-white">
                    Status
                  </th>
                  <th className="w-[17%] px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {allAppointments.length === 0 ? (
                  <tr className={rowClass}>
                    <td
                      colSpan={6}
                      className={`px-4 py-10 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                    >
                      No appointments found.
                    </td>
                  </tr>
                ) : (
                  paginate(allAppointments, allPage).map((a) => (
                    <tr key={a.id} className={rowClass}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${darkMode ? 'bg-[#4E69D3]/25 text-blue-200' : 'bg-[#E8EAF6] text-[#4E69D3]'}`}
                          >
                            {a.patientName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div
                              className={`truncate text-sm font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
                              title={a.patientName}
                            >
                              {a.patientName}
                            </div>
                            {a.patientReference && (
                              <div
                                className={`truncate text-xs font-semibold ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}`}
                              >
                                {a.patientReference}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        className={`truncate px-4 py-3 text-sm font-medium ${cellText}`}
                      >
                        {a.serviceName}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm font-medium ${cellText}`}
                      >
                        {a.dateLabel}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-sm font-medium ${cellText}`}
                      >
                        {a.timeLabel}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-4 py-3">{renderActions(a)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {Math.ceil(allAppointments.length / PER_PAGE) > 1 && (
          <div className="flex justify-end mt-5">
            <Pagination
              darkMode={darkMode}
              page={allPage}
              totalPages={Math.ceil(allAppointments.length / PER_PAGE)}
              onPage={setAllPage}
            />
          </div>
        )}
      </div>

      {/* Post-consultation medical info form (also completes the visit). */}
      {recordFor && (
        <MedicalRecordModal
          appointment={recordFor}
          darkMode={darkMode}
          onClose={() => setRecordFor(null)}
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
      style={{ background: style.bg, color: style.color }}
      className="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold"
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
  onPage: (p: number) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className={`px-4 py-2 rounded-lg border text-sm font-semibold cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] border-white/15 hover:bg-[#1a2050]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
      >
        Previous
      </button>
      <div className="flex items-center gap-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onPage(n)}
            className={`w-9 h-9 rounded-lg border text-sm font-bold cursor-pointer transition-colors ${n === page ? 'bg-[#4E69D3] text-white border-[#4E69D3]' : darkMode ? 'bg-[#0f1438] text-[#F9FAFB] border-white/15 hover:bg-[#1a2050]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            {n}
          </button>
        ))}
      </div>
      <button
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className={`px-4 py-2 rounded-lg border text-sm font-semibold cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] border-white/15 hover:bg-[#1a2050]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
      >
        Next
      </button>
    </div>
  )
}
