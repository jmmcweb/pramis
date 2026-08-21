import { CalendarDays, ClipboardList, Stethoscope, Syringe } from 'lucide-react'

const services = [
  { icon: CalendarDays, title: 'Appointment' },
  { icon: ClipboardList, title: 'Medical Records' },
  { icon: Syringe, title: 'Vaccination' },
  { icon: Stethoscope, title: 'Consultation' },
]

export default function ServicesSection({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-card rounded-3xl shadow-card p-5 ${className}`}>
      <h2 className="text-2xl font-bold text-brand mb-4">Services</h2>

      <div className="grid grid-cols-2 gap-4">
        {services.map((service) => (
          <button
            key={service.title}
            type="button"
            className="flex flex-col items-center justify-center gap-2.5 py-5 rounded-2xl bg-surface hover:bg-brand-tint active:scale-[0.98] transition-all"
          >
            <service.icon className="w-8 h-8 text-brand" aria-hidden="true" />
            <span className="text-sm font-medium text-body">{service.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
