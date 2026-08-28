'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CalendarDays, ClipboardList, Stethoscope, Syringe, HeartPulse, Activity } from 'lucide-react'

type DisplayService = {
  title: string
  icon: typeof CalendarDays
  href: string
}

const defaultServices: DisplayService[] = [
  { icon: CalendarDays, title: 'Appointment', href: '/user/appointment/book' },
  { icon: ClipboardList, title: 'Medical Records', href: '/user/records' },
  { icon: Syringe, title: 'Vaccination', href: '/user/appointment/book' },
  { icon: Stethoscope, title: 'Consultation', href: '/user/appointment/book' },
]

export default function ServicesSection({ className = '' }: { className?: string }) {
  const [servicesList, setServicesList] = useState<DisplayService[]>(defaultServices)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/services')
        if (res.ok) {
          const data = await res.json()
          if (data.success && Array.isArray(data.services) && data.services.length > 0) {
            const mapped: DisplayService[] = data.services.slice(0, 4).map((s: any) => {
              let icon = Stethoscope
              const t = (s.title || '').toLowerCase()
              if (t.includes('vaccin') || t.includes('immun')) icon = Syringe
              else if (t.includes('natal') || t.includes('maternal')) icon = HeartPulse
              else if (t.includes('hyper') || t.includes('blood') || t.includes('pressure')) icon = Activity
              else if (t.includes('consult')) icon = Stethoscope

              return {
                title: s.title,
                icon,
                href: '/user/appointment/book',
              }
            })
            if (mapped.length > 0) {
              setServicesList(mapped)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load services in ServicesSection:', err)
      }
    }
    load()
  }, [])

  return (
    <div className={`bg-card rounded-3xl shadow-card p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-brand">Services</h2>
        <Link href="/user/appointment/book" className="text-xs font-semibold text-brand hover:underline no-underline">
          Book Service
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {servicesList.map((service, i) => (
          <Link
            key={`${service.title}-${i}`}
            href={service.href}
            className="flex flex-col items-center justify-center gap-2.5 py-5 rounded-2xl bg-surface hover:bg-brand-tint active:scale-[0.98] transition-all no-underline text-center"
          >
            <service.icon className="w-8 h-8 text-brand" aria-hidden="true" />
            <span className="text-sm font-medium text-body px-2 line-clamp-1">{service.title}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
