'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useActionState } from 'react'
import Link from 'next/link'
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserRound,
} from 'lucide-react'
import { bookAppointment, getDayAvailability } from '@/lib/actions/appointment'
import { isServiceAvailableOnDate } from '@/config/appointment'
import type {
  FamilyMemberOption,
  ServiceView,
  SlotAvailability,
} from '@/config/appointment'

type DayStatus = 'available' | 'unavailable'

type CalendarDay = {
  day: number
  status: DayStatus
  label: string
  iso: string // YYYY-MM-DD
}

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function buildMonthCells(
  year: number,
  month: number,
  schedule: string,
): (CalendarDay | null)[] {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = first.getDay()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const cells: (CalendarDay | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const isPast = date < today
    const isUnavailableDay = !isServiceAvailableOnDate(
      schedule,
      `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    )
    const status: DayStatus =
      isPast || isUnavailableDay ? 'unavailable' : 'available'
    cells.push({
      day: d,
      status,
      label: date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      iso: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    })
  }
  return cells
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
      <span
        className={`w-2.5 h-2.5 rounded-full ${color}`}
        aria-hidden="true"
      />
      {label}
    </span>
  )
}

export default function BookingForm({
  service,
  patientName,
  familyMembers = [],
}: {
  service: ServiceView
  patientName: string
  familyMembers?: FamilyMemberOption[]
}) {
  const router = useRouter()
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<CalendarDay | null>(null)
  const [slots, setSlots] = useState<SlotAvailability[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)

  const [selectedForMemberId, setSelectedForMemberId] = useState('')

  const [state, formAction, isPending] = useActionState(bookAppointment, null)

  const goMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  const cells = buildMonthCells(viewYear, viewMonth, service.schedule)
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    'en-US',
    {
      month: 'long',
      year: 'numeric',
    },
  )

  useEffect(() => {
    if (!selectedDate) {
      setSlots([])
      setSelectedSlotId(null)
      return
    }
    let active = true
    setSlotsLoading(true)
    setSelectedSlotId(null)
    getDayAvailability(selectedDate.iso)
      .then((result) => {
        if (!active) return
        if (!result.success) toast.error(result.message)
        setSlots(result.slots)
      })
      .catch(() => {
        if (active) toast.error('Failed to load time slots.')
      })
      .finally(() => {
        if (active) setSlotsLoading(false)
      })
    return () => {
      active = false
    }
  }, [selectedDate])

  useEffect(() => {
    if (!state) return
    if (state.success) {
      toast.success(state.message)
      router.push('/user/appointment')
    } else if (state.message) {
      toast.error(state.message)
    }
  }, [state, router])

  const selectedSlot = slots.find((s) => s.id === selectedSlotId) ?? null

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="serviceId" value={service.id} />
      <input type="hidden" name="date" value={selectedDate?.iso ?? ''} />
      <input type="hidden" name="slotId" value={selectedSlotId ?? ''} />
      <input type="hidden" name="familyMemberId" value={selectedForMemberId} />

      <div className="bg-card rounded-3xl shadow-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-11 h-11 shrink-0 rounded-2xl bg-brand-tint text-brand flex items-center justify-center">
            <UserRound className="w-5 h-5" aria-hidden="true" />
          </span>
          <h2 className="text-2xl font-bold text-brand">Appointment For</h2>
        </div>
        <p className="text-sm text-muted mb-4">
          Your saved personal information is reused automatically for every
          appointment.
          <Link
            href="/user/profile"
            className="ml-1 font-semibold text-brand hover:underline"
          >
            Manage profile
          </Link>
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setSelectedForMemberId('')}
            aria-pressed={selectedForMemberId === ''}
            className={`w-full bg-surface rounded-2xl p-4 flex items-center gap-3 border-2 transition-colors ${
              selectedForMemberId === ''
                ? 'border-brand'
                : 'border-transparent hover:border-line'
            }`}
          >
            <span className="w-9 h-9 shrink-0 rounded-full bg-brand-tint text-brand text-xs font-bold flex items-center justify-center">
              {patientName.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 text-left">
              <span className="block text-sm text-body truncate">
                <span className="font-bold">Booking For:</span> {patientName}{' '}
                <span className="text-muted">(You)</span>
              </span>
              <span className="block text-xs text-muted mt-0.5">
                Booked under your account · {service.name}
              </span>
            </span>
          </button>

          {familyMembers.map((member) => {
            const isSelected = selectedForMemberId === member.id
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelectedForMemberId(member.id)}
                aria-pressed={isSelected}
                className={`w-full bg-surface rounded-2xl p-4 flex items-center gap-3 border-2 transition-colors ${
                  isSelected
                    ? 'border-brand'
                    : 'border-transparent hover:border-line'
                }`}
              >
                <span className="w-9 h-9 shrink-0 rounded-full bg-brand-tint text-brand text-xs font-bold flex items-center justify-center">
                  {member.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 text-left">
                  <span className="block text-sm text-body truncate">
                    <span className="font-bold">Booking For:</span>{' '}
                    {member.name}{' '}
                    <span className="text-muted">({member.relation})</span>
                  </span>
                  <span className="block text-xs text-muted mt-0.5">
                    Family member · gets their own patient ID
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-card rounded-3xl shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-brand">Select Date</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => goMonth(-1)}
              className="p-1.5 rounded-full text-brand hover:bg-brand-tint transition-colors"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="w-32 text-center text-sm font-bold text-body">
              {monthLabel}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => goMonth(1)}
              className="p-1.5 rounded-full text-brand hover:bg-brand-tint transition-colors"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {WEEKDAY_HEADERS.map((day) => (
            <span
              key={day}
              className="text-center text-[10px] font-bold uppercase text-muted"
            >
              {day}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell) return <span key={`empty-${i}`} />
            const isSelected = selectedDate?.iso === cell.iso
            const className = isSelected
              ? 'bg-brand text-white shadow-md'
              : cell.status === 'available'
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-track text-muted cursor-not-allowed'
            return (
              <button
                key={cell.iso}
                type="button"
                disabled={cell.status === 'unavailable'}
                onClick={() => setSelectedDate(cell)}
                aria-pressed={isSelected}
                className={`aspect-square flex items-center justify-center rounded-xl text-sm font-bold transition-colors ${className}`}
              >
                {cell.day}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
          <Legend color="bg-emerald-500" label="Open" />
          <Legend color="bg-faint" label="Unavailable" />
          <Legend color="bg-brand" label="Selected" />
        </div>

        {selectedDate && (
          <p className="text-sm text-muted mt-4 inline-flex items-center gap-1.5">
            <CalendarCheck className="w-4 h-4 text-brand" aria-hidden="true" />
            Selected:{' '}
            <span className="font-semibold text-body">
              {selectedDate.label}
            </span>
          </p>
        )}
      </div>

      <div className="bg-card rounded-3xl shadow-card p-5">
        <h2 className="text-2xl font-bold text-brand mb-1">
          Available Time Slots
        </h2>
        <p className="text-sm text-muted mb-4">
          {selectedDate
            ? 'Live availability for the selected date.'
            : 'Select a date above to see open slots.'}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
          <Legend color="bg-emerald-500" label="Available" />
          <Legend color="bg-amber-500" label="Limited" />
          <Legend color="bg-red-500" label="Full" />
        </div>

        {!selectedDate ? (
          <p className="text-sm text-muted bg-surface rounded-xl p-4">
            No date selected yet.
          </p>
        ) : slotsLoading ? (
          <p className="text-sm text-muted bg-surface rounded-xl p-4 inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Loading slots…
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
            {slots.map((slot) => {
              const isSelected = selectedSlotId === slot.id
              const className = isSelected
                ? 'bg-brand border-brand text-white'
                : slot.status === 'available'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                  : slot.status === 'limited'
                    ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300'
                    : 'bg-red-50 dark:bg-red-500/10 border-red-500/50 text-red-400 cursor-not-allowed'
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={slot.status === 'unavailable'}
                  onClick={() => setSelectedSlotId(slot.id)}
                  aria-pressed={isSelected}
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-colors ${className}`}
                >
                  <span className="text-sm font-bold leading-tight">
                    {slot.label}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold leading-tight ${
                      isSelected ? 'text-white/80' : 'opacity-80'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected
                          ? 'bg-white'
                          : slot.status === 'available'
                            ? 'bg-emerald-500'
                            : slot.status === 'limited'
                              ? 'bg-amber-500'
                              : 'bg-red-400'
                      }`}
                      aria-hidden="true"
                    />
                    {slot.remaining > 0
                      ? `Available Slots: ${slot.remaining}`
                      : 'No slots left'}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selectedDate && selectedSlot && (
        <div className="bg-card rounded-3xl shadow-card p-5">
          <h2 className="text-lg font-bold text-brand mb-3">
            Confirm Appointment
          </h2>
          <dl className="divide-y divide-line">
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-sm text-muted">Appointment For</dt>
              <dd className="text-sm font-semibold text-body">
                {selectedForMemberId
                  ? (familyMembers.find((m) => m.id === selectedForMemberId)
                      ?.name ?? patientName)
                  : patientName}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-sm text-muted">Service</dt>
              <dd className="text-sm font-semibold text-body">
                {service.name}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-sm text-muted">Date</dt>
              <dd className="text-sm font-semibold text-body">
                {selectedDate.label}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-sm text-muted">Time</dt>
              <dd className="text-sm font-semibold text-body">
                {selectedSlot.label}
              </dd>
            </div>
          </dl>
        </div>
      )}

      <button
        type="submit"
        disabled={!selectedDate || !selectedSlotId || isPending}
        className="w-full bg-brand hover:bg-brand-dark text-white py-4 rounded-2xl font-semibold text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            Booking…
          </>
        ) : (
          <>
            <CalendarCheck className="w-5 h-5" aria-hidden="true" />
            Confirm Appointment
          </>
        )}
      </button>
    </form>
  )
}
