'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarDays, Check, Clock, UserRound, X } from 'lucide-react'
import { cancelAppointment } from '@/lib/actions/appointment'
import type { MyAppointmentView } from '@/config/appointment'

function formatDay(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function AppointmentCard({
  appointment,
  className = '',
}: {
  appointment: MyAppointmentView | null
  className?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cancelling, setCancelling] = useState(false)

  const handleCancel = () => {
    if (!appointment) return
    setCancelling(true)
    startTransition(async () => {
      const result = await cancelAppointment(appointment.id)
      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
      setCancelling(false)
    })
  }

  return (
    <div className={`bg-card rounded-3xl shadow-card p-5 ${className}`}>
      <h2 className="text-2xl font-bold text-brand">Upcoming Appointment</h2>

      {!appointment ? (
        <div className="bg-surface rounded-2xl p-5 mt-4 flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-full bg-brand-tint text-brand flex items-center justify-center">
            <CalendarDays className="w-6 h-6" aria-hidden="true" />
          </div>
          <p className="font-bold text-body">No upcoming appointments</p>
          <p className="text-xs text-muted">
            Book a service to see it here.
          </p>
          <Link
            href="/user/appointment/book"
            className="mt-1 inline-flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-dark text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors no-underline"
          >
            Book an Appointment
          </Link>
        </div>
      ) : (
        <>
          <div className="flex gap-3 items-center mt-4">
            <div
              aria-hidden="true"
              className="w-12 h-12 rounded-full bg-brand-tint text-brand font-bold flex items-center justify-center text-xl"
            >
              {appointment.serviceIcon}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-body truncate">{appointment.serviceName}</h3>
              <p className="text-sm text-muted truncate">
                For: {appointment.forName}
              </p>
            </div>
          </div>

          <div className="mt-4 text-sm text-muted flex flex-col gap-2">
            <p className="inline-flex items-center gap-1.5 min-w-0">
              <CalendarDays className="w-4 h-4 text-brand shrink-0" />
              {formatDay(appointment.appointmentAtISO)}
            </p>
            <p className="inline-flex items-center gap-1.5 min-w-0">
              <Clock className="w-4 h-4 text-brand shrink-0" />
              {appointment.appointmentAtTime}
            </p>
            <p className="inline-flex items-center gap-1.5 min-w-0">
              <UserRound className="w-4 h-4 text-brand shrink-0" />
              Status: {appointment.status}
            </p>
          </div>

          <div className="flex gap-2.5 mt-5">
            <Link
              href="/user/appointment"
              className="flex-1 bg-brand hover:bg-brand-dark text-white py-2.5 rounded-xl font-medium text-sm transition-colors inline-flex items-center justify-center gap-1.5 no-underline"
            >
              <Check className="w-4 h-4" />
              View Details
            </Link>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending && cancelling}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-medium text-sm transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              {isPending && cancelling ? 'Cancelling…' : 'Cancel'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}