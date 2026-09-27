'use client'

// Post-consultation record modal. Routes to the full paginated
//   - Children (0-5 years old): Child ITR (with birth & immunization records)
//   - Everyone else (6+): Adult ITR
// Unknown birthdates are treated as adults. Saving either form marks the appointment COMPLETED.

import { X } from 'lucide-react'
import type { ScheduleAppointmentView } from '@/config/appointment'
import { isChildByAge } from '@/src/data/itrChild'
import AdultItrForm from '@/components/ui/AdultItrForm'
import ChildItrForm from '@/components/ui/ChildItrForm'

// Only the 0-5 age band is recorded on the Child ITR. Anyone older and
// anyone with no usable birthdate — gets the Adult ITR.
function isAdultPatient(appointment: ScheduleAppointmentView): boolean {
  return !isChildByAge(appointment.patientInfo?.birthdate)
}

export default function MedicalRecordModal({
  appointment,
  darkMode,
  onClose,
  onSaved,
}: {
  appointment: ScheduleAppointmentView
  darkMode: boolean
  onClose: () => void
  onSaved?: () => void
}) {
  const isAdult = isAdultPatient(appointment)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`w-full max-w-5xl my-8 rounded-2xl border shadow-2xl ${
          darkMode
            ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)] text-[#F9FAFB]'
            : 'bg-white border-[rgba(15,60,95,0.08)] text-gray-800'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-inherit">
          <div>
            <h2 className="text-xl font-bold m-0">
              {isAdult
                ? 'Adult Individual Treatment Record (ITR)'
                : 'Child Individual Treatment Record (ITR)'}
            </h2>
            <p
              className={`text-sm mt-1 mb-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
            >
              {appointment.patientName} · {appointment.serviceName} ·{' '}
              {appointment.dateLabel}, {appointment.timeLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
              darkMode
                ? 'bg-white/10 hover:bg-white/20 text-[#F9FAFB]'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body — age-appropriate ITR wizard */}
        {isAdult ? (
          <AdultItrForm
            appointment={appointment}
            darkMode={darkMode}
            onClose={onClose}
            onSaved={onSaved}
          />
        ) : (
          <ChildItrForm
            appointment={appointment}
            darkMode={darkMode}
            onClose={onClose}
            onSaved={onSaved}
          />
        )}
      </div>
    </div>
  )
}
