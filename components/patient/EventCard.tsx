'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Droplets, HeartPulse, Syringe } from 'lucide-react'

type Event = {
  title: string
  subtitle: string
  date: string
  time: string
  icon: typeof Droplets
  iconClass: string
  badgeClass: string
}

const events: Event[] = [
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

export default function EventCard({ className = '' }: { className?: string }) {
  const [index, setIndex] = useState(0)
  const event = events[index]

  const goTo = (next: number) => {
    setIndex((next + events.length) % events.length)
  }

  return (
    <div className={`bg-card rounded-3xl shadow-card p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-brand">Event</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous event"
            onClick={() => goTo(index - 1)}
            className="p-1.5 rounded-full text-brand hover:bg-brand-tint transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Next event"
            onClick={() => goTo(index + 1)}
            className="p-1.5 rounded-full text-brand hover:bg-brand-tint transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div
          className={`w-24 h-24 shrink-0 ${event.badgeClass} rounded-2xl flex items-center justify-center`}
        >
          <event.icon className={`w-11 h-11 ${event.iconClass}`} aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <h3 className="text-xl font-bold leading-tight text-body">{event.title}</h3>
          <h3 className="text-xl font-bold leading-tight text-muted">{event.subtitle}</h3>
          <p className="text-sm mt-2 text-muted">{event.date}</p>
          <p className="text-sm text-muted">{event.time}</p>
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-5" role="tablist" aria-label="Event slides">
        {events.map((item, i) => (
          <button
            key={item.title}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Event ${i + 1}: ${item.title}`}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all ${
              i === index ? 'w-6 bg-brand' : 'w-2 bg-faint hover:bg-muted'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
