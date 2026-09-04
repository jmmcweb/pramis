'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { CalendarDays, Clock, UserRound, X } from 'lucide-react'
import { cancelAppointment } from '@/lib/actions/appointment'
import type { MyAppointmentView } from '@/config/appointment'

const STATUS_STYLES: Record<string, string> = {
  PENDING:
    'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  APPROVED:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  CANCELLED: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300',
  NO_SHOW:
    'bg-slate-200 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
}

function formatDay(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function AppointmentOverviewCard({
  appointments,
}: {
  appointments: MyAppointmentView[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const upcoming = appointments.filter(
    (a) => a.status === 'PENDING' || a.status === 'APPROVED',
  )
  const history = appointments.filter(
    (a) => a.status !== 'PENDING' && a.status !== 'APPROVED',
  )

  const handleCancel = (id: string) => {
    setCancellingId(id)
    startTransition(async () => {
      const result = await cancelAppointment(id)
      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
      setCancellingId(null)
    })
  }

  return (
    <>
      <div className="bg-card rounded-3xl shadow-card p-5">
        <h2 className="text-2xl font-bold text-brand">My Appointments</h2>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          Schedule consultations, vaccinations, and healthcare visits.
        </p>

        {upcoming.length === 0 ? (
          <div className="bg-surface rounded-2xl p-4 mt-4 text-sm text-muted">
            You have no upcoming appointments. Pick a service below to book one.
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {upcoming.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-surface rounded-2xl p-4 flex items-start gap-3"
              >
                <div
                  className="w-11 h-11 shrink-0 rounded-full bg-brand-tint flex items-center justify-center text-xl"
                  aria-hidden="true"
                >
                  {appointment.serviceIcon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-body truncate">
                      {appointment.serviceName}
                    </h3>
                    <span
                      className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        STATUS_STYLES[appointment.status] ??
                        STATUS_STYLES.PENDING
                      }`}
                    >
                      {appointment.status}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-col gap-1 text-sm text-muted">
                    <p className="inline-flex items-center gap-1.5">
                      <CalendarDays
                        className="w-4 h-4 text-brand shrink-0"
                        aria-hidden="true"
                      />
                      {formatDay(appointment.appointmentAtISO)}
                    </p>
                    <p className="inline-flex items-center gap-1.5">
                      <Clock
                        className="w-4 h-4 text-brand shrink-0"
                        aria-hidden="true"
                      />
                      {appointment.appointmentAtTime}
                    </p>
                    {appointment.forName && appointment.forName !== 'Self' && (
                      <p className="inline-flex items-center gap-1.5">
                        <UserRound
                          className="w-4 h-4 text-brand shrink-0"
                          aria-hidden="true"
                        />
                        For: {appointment.forName}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={isPending && cancellingId === appointment.id}
                    onClick={() => handleCancel(appointment.id)}
                    className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                    {isPending && cancellingId === appointment.id
                      ? 'Cancelling…'
                      : 'Cancel appointment'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted mb-2">
              Past & Cancelled
            </p>
            <div className="flex flex-col gap-2">
              {history.slice(0, 5).map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between gap-3 text-sm text-muted bg-surface rounded-xl px-3.5 py-2.5"
                >
                  <span className="truncate">
                    {appointment.serviceIcon} {appointment.serviceName} ·{' '}
                    {formatDay(appointment.appointmentAtISO)}
                    {appointment.forName && appointment.forName !== 'Self'
                      ? ` · ${appointment.forName}`
                      : ''}
                  </span>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      STATUS_STYLES[appointment.status] ?? STATUS_STYLES.PENDING
                    }`}
                  >
                    {appointment.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
