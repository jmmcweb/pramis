import Link from 'next/link'
import {
  CalendarDays,
  Clock,
  Check,
  UserRound,
  X,
} from 'lucide-react'
import { services, serviceIcons } from '@/src/data/appointment'

export default function ServiceListSection() {
  return (
    <div className="bg-card rounded-3xl shadow-card p-5">
      <h2 className="text-2xl font-bold text-brand mb-4">Available Healthcare Services</h2>

      <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-5 2xl:grid-cols-3">
        {services.map((service) => {
          const Icon = serviceIcons[service.icon]
          return (
            <div key={service.id} className="bg-surface rounded-2xl p-4 flex flex-col">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${
                  service.available ? 'bg-brand-tint text-brand' : 'bg-track text-muted'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold leading-tight min-h-[3.125rem] flex items-center text-body min-w-0">
                {service.name}
              </h3>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <div className="w-10 h-10 shrink-0 rounded-full bg-soft text-brand flex items-center justify-center">
                <UserRound className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-body">{service.staffName}</p>
                <p className="text-xs text-muted">{service.role}</p>
              </div>
            </div>

            <div className="mt-4 mb-4 flex flex-col gap-1 text-sm text-muted">
              <p className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-brand" aria-hidden="true" />
                {service.schedule}
              </p>
              <p className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand" aria-hidden="true" />
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    service.available ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={
                    service.available ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'font-semibold text-red-600 dark:text-red-400'
                  }
                >
                  {service.slots}
                </span>
              </p>
            </div>

            {service.available ? (
              <Link
                href={`/user/appointment/book?service=${service.id}`}
                className="mt-auto w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-medium text-sm transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                Make Appointment
              </Link>
            ) : (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="mt-auto w-full bg-red-500 text-white py-2.5 rounded-xl font-medium text-sm inline-flex items-center justify-center gap-1.5 cursor-not-allowed"
              >
                <X className="w-4 h-4" aria-hidden="true" />
                Full Slot
              </button>
            )}
          </div>
          )
        })}
      </div>
    </div>
  )
}
