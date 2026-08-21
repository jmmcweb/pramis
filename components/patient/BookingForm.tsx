'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { CalendarCheck, ChevronLeft, ChevronRight, Plus, UserRound } from 'lucide-react'
import type { Service } from '@/src/data/appointment'
import { familyMembers, patient } from '@/src/data/records'
import type { PatientMember } from '@/src/data/records'

type DayStatus = 'available' | 'booked' | 'unavailable'

type CalendarDay = {
  day: number
  status: DayStatus
  label: string
  iso: string
}

type TimeSlot = {
  time: string
  availability: string
  status: 'available' | 'limited' | 'unavailable'
}

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const BOOKED_DAYS = [4, 8, 15, 19, 23, 28]

const timeSlots: TimeSlot[] = [
  { time: '8:00 AM - 9:00 AM', availability: 'Available Slots: 9', status: 'available' },
  { time: '9:00 AM - 10:00 AM', availability: 'Available Slots: 4', status: 'available' },
  { time: '10:00 AM - 11:00 AM', availability: 'Available Slots: 2', status: 'limited' },
  { time: '1:00 PM - 2:00 PM', availability: 'Available Slots: 6', status: 'available' },
  { time: '2:00 PM - 3:00 PM', availability: 'Available Slots: 1', status: 'limited' },
  { time: '3:00 PM - 4:00 PM', availability: 'No slots left', status: 'unavailable' },
  { time: '4:00 PM - 5:00 PM', availability: 'Available Slots: 8', status: 'available' },
]

function buildMonthCells(year: number, month: number): (CalendarDay | null)[] {
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
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const status: DayStatus =
      isPast || isWeekend ? 'unavailable' : BOOKED_DAYS.includes(d) ? 'booked' : 'available'
    cells.push({
      day: d,
      status,
      label: date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      iso: `${year}-${month}-${d}`,
    })
  }
  return cells
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} aria-hidden="true" />
      {label}
    </span>
  )
}

export default function BookingForm({ service }: { service: Service }) {
  const router = useRouter()
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<CalendarDay | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [selectedMember, setSelectedMember] = useState<PatientMember>(patient)

  const people: PatientMember[] = [patient, ...familyMembers]

  const goMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  const cells = buildMonthCells(viewYear, viewMonth)
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const confirm = () => {
    if (!selectedDate || !selectedSlot) return
    toast.success(
      <div className="flex flex-col gap-0.5">
        <span className="font-bold">
          Appointment for {selectedDate.label} at {selectedSlot.time}
        </span>
        <span className="text-sm text-white/80">
          {selectedMember.name} · {selectedMember.relation}
        </span>
        <span className="text-sm text-white/80">{service.name}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-card rounded-3xl shadow-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-11 h-11 shrink-0 rounded-2xl bg-brand-tint text-brand flex items-center justify-center">
            <UserRound className="w-5 h-5" aria-hidden="true" />
          </span>
          <h2 className="text-2xl font-bold text-brand">Appointment For</h2>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {people.map((person) => {
            const isActive = person.id === selectedMember.id
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => setSelectedMember(person)}
                aria-pressed={isActive}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-brand text-white shadow-md'
                    : 'bg-surface text-muted hover:bg-brand-tint'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-brand-tint text-brand'
                  }`}
                >
                  {person.initials}
                </span>
                <span className="text-sm font-semibold">
                  {person.id === 'me' ? 'Me' : person.name.split(' ')[0]}
                </span>
              </button>
            )
          })}
        </div>

        {familyMembers.length === 0 && (
          <button
            type="button"
            onClick={() => router.push('/user/records')}
            className="w-full border-2 border-dashed border-line rounded-xl py-2.5 mt-3 text-sm font-medium text-brand hover:bg-brand-tint transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Family Member
          </button>
        )}

        <div className="bg-surface rounded-2xl p-4 mt-3 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 shrink-0 rounded-full bg-brand-tint text-brand text-xs font-bold flex items-center justify-center">
              {selectedMember.initials}
            </span>
            <p className="text-sm text-body">
              <span className="font-bold">Booking For:</span> {selectedMember.name}
            </p>
          </div>
          <p className="text-sm text-muted">
            <span className="font-bold text-body">Relationship:</span>{' '}
            {selectedMember.relation}
          </p>
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
                : cell.status === 'booked'
                  ? 'bg-red-500 text-white'
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
          <Legend color="bg-emerald-500" label="Available" />
          <Legend color="bg-red-500" label="Fully Booked" />
          <Legend color="bg-faint" label="Unavailable" />
          <Legend color="bg-brand" label="Selected" />
        </div>

        {selectedDate && (
          <p className="text-sm text-muted mt-4 inline-flex items-center gap-1.5">
            <CalendarCheck className="w-4 h-4 text-brand" aria-hidden="true" />
            Selected:{' '}
            <span className="font-semibold text-body">{selectedDate.label}</span>
          </p>
        )}
      </div>

      <div className="bg-card rounded-3xl shadow-card p-5">
        <h2 className="text-2xl font-bold text-brand mb-1">Available Time Slots</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
          <Legend color="bg-emerald-500" label="Available" />
          <Legend color="bg-amber-500" label="Limited" />
          <Legend color="bg-red-500" label="Unavailable" />
        </div>

        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
          {timeSlots.map((slot) => {
            const isSelected = selectedSlot?.time === slot.time
            const className = isSelected
              ? 'bg-brand border-brand text-white'
              : slot.status === 'available'
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                : slot.status === 'limited'
                  ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300'
                  : 'bg-red-50 dark:bg-red-500/10 border-red-500/50 text-red-400 cursor-not-allowed'
            return (
              <button
                key={slot.time}
                type="button"
                disabled={slot.status === 'unavailable'}
                onClick={() => setSelectedSlot(slot)}
                className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-colors ${className}`}
              >
                <span className="text-sm font-bold leading-tight">{slot.time}</span>
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
                  {slot.availability}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {selectedDate && selectedSlot && (
        <div className="bg-card rounded-3xl shadow-card p-5">
          <h2 className="text-lg font-bold text-brand mb-3">Confirm Appointment</h2>
          <dl className="divide-y divide-line">
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-sm text-muted">Appointment For</dt>
              <dd className="text-sm font-semibold text-body">{selectedMember.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-sm text-muted">Service</dt>
              <dd className="text-sm font-semibold text-body">{service.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-sm text-muted">Date</dt>
              <dd className="text-sm font-semibold text-body">{selectedDate.label}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-sm text-muted">Time</dt>
              <dd className="text-sm font-semibold text-body">{selectedSlot.time}</dd>
            </div>
          </dl>
        </div>
      )}

      <button
        type="button"
        disabled={!selectedDate || !selectedSlot}
        onClick={confirm}
        className="w-full bg-brand hover:bg-brand-dark text-white py-4 rounded-2xl font-semibold text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        <CalendarCheck className="w-5 h-5" aria-hidden="true" />
        Confirm Appointment
      </button>
    </div>
  )
}
