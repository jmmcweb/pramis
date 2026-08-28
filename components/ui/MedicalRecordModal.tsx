'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { saveMedicalRecord } from '@/lib/actions/medical'
import { RECORD_STATUSES } from '@/config/medical'
import type { ScheduleAppointmentView } from '@/config/appointment'

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
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(
    saveMedicalRecord as (prev: any, formData: FormData) => Promise<any>,
    null,
  )

  useEffect(() => {
    if (!state) return
    if (state.success) {
      toast.success(state.message)
      router.refresh()
      onSaved?.()
      onClose()
    } else if (state.message) {
      toast.error(state.message)
    }
  }, [state])

  const record = appointment.medicalRecord

  const label = `block text-xs font-bold uppercase tracking-wide mb-1.5 ${
    darkMode ? 'text-gray-400' : 'text-gray-500'
  }`
  const input = `w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
    darkMode
      ? 'bg-[#0f1438] text-[#F9FAFB] border-white/15 focus:border-[#4E69D3]'
      : 'bg-white text-gray-800 border-gray-200 focus:border-[#4E69D3]'
  }`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose()
      }}
    >
      <div
        className={`w-full max-w-2xl my-8 rounded-2xl border shadow-2xl ${
          darkMode
            ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)] text-[#F9FAFB]'
            : 'bg-white border-[rgba(15,60,95,0.08)] text-gray-800'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-inherit">
          <div>
            <h2 className="text-xl font-bold m-0">Post-Consultation Record</h2>
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
            disabled={isPending}
            aria-label="Close"
            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors disabled:opacity-50 ${
              darkMode
                ? 'bg-white/10 hover:bg-white/20 text-[#F9FAFB]'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form action={formAction} className="px-6 py-5">
          <input type="hidden" name="appointmentId" value={appointment.id} />

          {/* Basic health info */}
          <p
            className={`text-sm font-bold uppercase tracking-wide mb-3 ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}`}
          >
            Basic Health Info
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="bloodPressure" className={label}>
                Blood Pressure *
              </label>
              <input
                id="bloodPressure"
                name="bloodPressure"
                defaultValue={record?.bloodPressure ?? ''}
                placeholder="120/80"
                required
                className={input}
              />
            </div>
            <div>
              <label htmlFor="oxygenLevel" className={label}>
                Oxygen Level (%) *
              </label>
              <input
                id="oxygenLevel"
                name="oxygenLevel"
                type="number"
                min="0"
                max="100"
                step="0.01"
                defaultValue={record?.oxygenLevel ?? ''}
                placeholder="98"
                required
                className={input}
              />
            </div>
            <div>
              <label htmlFor="height" className={label}>
                Height (cm) *
              </label>
              <input
                id="height"
                name="height"
                type="number"
                min="0"
                max="300"
                step="0.01"
                defaultValue={record?.height ?? ''}
                placeholder="165"
                required
                className={input}
              />
            </div>
            <div>
              <label htmlFor="weight" className={label}>
                Weight (kg) *
              </label>
              <input
                id="weight"
                name="weight"
                type="number"
                min="0"
                max="700"
                step="0.01"
                defaultValue={record?.weight ?? ''}
                placeholder="60"
                required
                className={input}
              />
            </div>
          </div>

          {/* Diagnosis & history */}
          <p
            className={`text-sm font-bold uppercase tracking-wide mt-6 mb-3 ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}`}
          >
            Diagnosis & Medical History
          </p>
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="diagnosis" className={label}>
                Diagnosis *
              </label>
              <textarea
                id="diagnosis"
                name="diagnosis"
                rows={3}
                defaultValue={record?.diagnosis ?? ''}
                placeholder="Findings from the consultation…"
                required
                className={`${input} resize-y`}
              />
            </div>
            <div>
              <label htmlFor="recommendation" className={label}>
                Recommendation / Prescription
              </label>
              <textarea
                id="recommendation"
                name="recommendation"
                rows={2}
                defaultValue={record?.recommendation ?? ''}
                placeholder="Medicines, next steps, follow-up advice…"
                className={`${input} resize-y`}
              />
            </div>
            <div>
              <label htmlFor="recordStatus" className={label}>
                Condition
              </label>
              <select
                id="recordStatus"
                name="recordStatus"
                defaultValue={record?.status || 'Stable'}
                className={input}
              >
                {RECORD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-inherit">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors disabled:opacity-50 ${
                darkMode
                  ? 'bg-white/10 hover:bg-white/20 text-[#F9FAFB]'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg px-5 py-2.5 text-sm font-semibold bg-[#4E69D3] hover:bg-[#3D56B8] text-white cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isPending
                ? 'Saving…'
                : record
                  ? 'Update Record'
                  : 'Save & Complete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
