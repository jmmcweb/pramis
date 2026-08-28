'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Droplets, HeartPulse, Syringe, Calendar, Stethoscope, Sparkles } from 'lucide-react'

type DisplayEvent = {
  title: string
  subtitle: string
  date: string
  time: string
  icon: typeof Droplets
  iconClass: string
  badgeClass: string
}

const defaultEvents: DisplayEvent[] = [
  {
    title: 'Blood Donation',
    subtitle: 'Program',
    date: 'March 30, 2026 | Monday',
    time: '3:00 PM to 5:00 PM',
    icon: Droplets,
    iconClass: 'text-red-500',
    badgeClass: 'bg-red-50 dark:bg-red-500/10',
  },
  {
    title: 'Vaccination',
    subtitle: 'Drive',
    date: 'April 6, 2026 | Monday',
    time: '8:00 AM to 11:00 AM',
    icon: Syringe,
    iconClass: 'text-sky-500',
    badgeClass: 'bg-sky-50 dark:bg-sky-500/10',
  },
  {
    title: 'Medical',
    subtitle: 'Mission',
    date: 'April 13, 2026 | Monday',
    time: '1:00 PM to 4:00 PM',
    icon: HeartPulse,
    iconClass: 'text-emerald-500',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
]

function getIconForType(type: string) {
  switch (type?.toLowerCase()) {
    case 'donation':
      return { icon: Droplets, iconClass: 'text-red-500', badgeClass: 'bg-red-50 dark:bg-red-500/10' }
    case 'vaccination':
      return { icon: Syringe, iconClass: 'text-sky-500', badgeClass: 'bg-sky-50 dark:bg-sky-500/10' }
    case 'screening':
    case 'consultation':
      return { icon: Stethoscope, iconClass: 'text-emerald-500', badgeClass: 'bg-emerald-50 dark:bg-emerald-500/10' }
    case 'maternal':
    case 'family':
      return { icon: HeartPulse, iconClass: 'text-purple-500', badgeClass: 'bg-purple-50 dark:bg-purple-500/10' }
    default:
      return { icon: Calendar, iconClass: 'text-blue-500', badgeClass: 'bg-blue-50 dark:bg-blue-500/10' }
  }
}

export default function EventCard({ className = '' }: { className?: string }) {
  const [eventsList, setEventsList] = useState<DisplayEvent[]>(defaultEvents)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/events')
        if (res.ok) {
          const data = await res.json()
          if (data.success && Array.isArray(data.scheduled) && data.scheduled.length > 0) {
            const mapped: DisplayEvent[] = data.scheduled.map((e: any) => {
              const iconInfo = getIconForType(e.type)
              const d = e.date ? new Date(e.date + 'T00:00:00') : new Date()
              const formattedDate = d.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                weekday: 'long',
              }).replace(/, (\w+)$/, ' | $1')

              const words = (e.title || 'Health Event').split(' ')
              const title = words.slice(0, Math.ceil(words.length / 2)).join(' ')
              const subtitle = words.slice(Math.ceil(words.length / 2)).join(' ')

              return {
                title,
                subtitle: subtitle || 'Schedule',
                date: formattedDate,
                time: e.time || '8:00 AM to 5:00 PM',
                icon: iconInfo.icon,
                iconClass: iconInfo.iconClass,
                badgeClass: iconInfo.badgeClass,
              }
            })
            setEventsList(mapped)
          }
        }
      } catch (err) {
        console.error('Failed to load events in EventCard:', err)
      }
    }
    fetchEvents()
  }, [])

  const safeIndex = Math.min(index, eventsList.length - 1)
  const currentEvent = eventsList[safeIndex] || defaultEvents[0]

  const goTo = (next: number) => {
    setIndex((next + eventsList.length) % eventsList.length)
  }

  return (
    <div className={`bg-card rounded-3xl shadow-card p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-brand">Events</h2>
        {eventsList.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous event"
              onClick={() => goTo(safeIndex - 1)}
              className="p-1.5 rounded-full text-brand hover:bg-brand-tint transition-colors cursor-pointer border-none bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Next event"
              onClick={() => goTo(safeIndex + 1)}
              className="p-1.5 rounded-full text-brand hover:bg-brand-tint transition-colors cursor-pointer border-none bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div
          className={`w-24 h-24 shrink-0 ${currentEvent.badgeClass} rounded-2xl flex items-center justify-center`}
        >
          <currentEvent.icon className={`w-11 h-11 ${currentEvent.iconClass}`} aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <h3 className="text-xl font-bold leading-tight text-body truncate">{currentEvent.title}</h3>
          <h3 className="text-xl font-bold leading-tight text-muted truncate">{currentEvent.subtitle}</h3>
          <p className="text-sm mt-2 text-muted truncate">{currentEvent.date}</p>
          <p className="text-sm text-muted truncate">{currentEvent.time}</p>
        </div>
      </div>

      {eventsList.length > 1 && (
        <div className="flex justify-center gap-2 mt-5" role="tablist" aria-label="Event slides">
          {eventsList.slice(0, 10).map((item, i) => (
            <button
              key={`${item.title}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              aria-label={`Event ${i + 1}: ${item.title}`}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all border-none cursor-pointer p-0 ${
                i === safeIndex ? 'w-6 bg-brand' : 'w-2 bg-faint hover:bg-muted'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
