
// Individual Treatment Record (ITR) form fields and shared components. These are used by both the adult and child ITR forms, which are paginated multi-step wizards for post-consultation data entry. The fields include text inputs, read-only fields, radio buttons, and textareas, along with shared components for headers, stepper navigation, and footers. The code also includes a context for submitted values to preserve user input across form submissions.

import { createContext, useContext } from 'react'

export const LBL =
  'block text-xs font-bold uppercase tracking-wide mb-1.5 text-gray-500 dark:text-gray-400'
export const FIELD =
  'w-full rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0f1438] text-gray-800 dark:text-[#F9FAFB] text-sm px-3 py-2.5 outline-none transition-colors focus:border-[#4E69D3]'
export const FIELD_READONLY =
  'w-full rounded-lg border border-gray-200 dark:border-white/15 bg-gray-100 dark:bg-[#1a1f45] text-gray-600 dark:text-gray-400 text-sm px-3 py-2.5 outline-none cursor-not-allowed'
export const FIELD_AREA = `${FIELD} resize-y`
export const PANEL =
  'rounded-xl border p-4 sm:p-5 bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/10'
export const SECTION_TITLE =
  'text-sm font-bold uppercase tracking-wide m-0 mb-4 text-[#4E69D3] dark:text-[#C4B5FD]'
export const RADIO_LABEL =
  'flex items-center gap-1.5 cursor-pointer text-sm font-medium text-gray-800 dark:text-[#F9FAFB]'

// Values the user typed in the last failed submission, echoed back by the
// server action so inputs can be re-mounted pre-filled after a validation
// error (React resets uncontrolled inputs after a form action runs).
export const SubmittedValuesContext =
  createContext<Record<string, string> | null>(null)

export function computeAge(birthdate: string): string {
  const birth = new Date(`${birthdate}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return ''
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age >= 0 && age < 150 ? String(age) : ''
}

export function TextField({
  name,
  label,
  defaultValue,
  type = 'text',
  placeholder,
  className,
}: {
  name: string
  label: string
  defaultValue?: string
  type?: string
  placeholder?: string
  className?: string
}) {
  const submitted = useContext(SubmittedValuesContext)
  return (
    <div className={className}>
      <label htmlFor={`itr-${name}`} className={LBL}>
        {label}
      </label>
      <input
        id={`itr-${name}`}
        name={name}
        type={type}
        defaultValue={submitted?.[name] ?? defaultValue ?? ''}
        placeholder={placeholder}
        className={FIELD}
      />
    </div>
  )
}

// Read-only text field for auto-populated personal information from the
// user's account profile. Renders as a disabled input with a hidden input
// to include the value in form submission.
export function ReadOnlyField({
  name,
  label,
  defaultValue,
  className,
}: {
  name: string
  label: string
  defaultValue?: string
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={`itr-${name}`} className={LBL}>
        {label}
      </label>
      <input
        id={`itr-${name}`}
        type="text"
        value={defaultValue ?? ''}
        disabled
        className={FIELD_READONLY}
        tabIndex={-1}
      />
      <input type="hidden" name={name} value={defaultValue ?? ''} />
    </div>
  )
}

export function RadioField({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string
  label: string
  options: { value: string; text: string }[]
  defaultValue?: string
}) {
  const submitted = useContext(SubmittedValuesContext)
  return (
    <div>
      <span className={LBL}>{label}</span>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {options.map((o) => (
          <label key={o.value} className={RADIO_LABEL}>
            <input
              type="radio"
              name={name}
              value={o.value}
              defaultChecked={(submitted?.[name] ?? defaultValue) === o.value}
              className="accent-[#4E69D3] w-4 h-4"
            />
            {o.text}
          </label>
        ))}
      </div>
    </div>
  )
}

export function ItrTextarea({
  name,
  label,
  defaultValue,
  rows = 3,
  placeholder,
  required,
}: {
  name: string
  label: string
  defaultValue?: string
  rows?: number
  placeholder?: string
  required?: boolean
}) {
  const submitted = useContext(SubmittedValuesContext)
  return (
    <>
      <label htmlFor={`itr-${name}`} className={LBL}>
        {label}
      </label>
      <textarea
        id={`itr-${name}`}
        name={name}
        rows={rows}
        required={required}
        defaultValue={submitted?.[name] ?? defaultValue ?? ''}
        placeholder={placeholder}
        className={FIELD_AREA}
      />
    </>
  )
}

// Document header shared by both ITR forms.
export function ItrHeader({ title }: { title: string }) {
  return (
    <div className="text-center leading-tight mb-5 pb-4 border-b border-inherit">
      <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Republic of the Philippines · Province of Bulacan · City of Malolos
      </p>
      <h3 className="text-base sm:text-lg font-extrabold tracking-wide m-0 mt-1">
        {title}
      </h3>
    </div>
  )
}

// Step pills (pagination) shared by both ITR forms.
export function ItrStepper({
  steps,
  page,
  setPage,
  isPending,
}: {
  steps: string[]
  page: number
  setPage: (fn: (p: number) => number) => void
  isPending: boolean
}) {
  return (
    <ol className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1 list-none pl-0">
      {steps.map((s, i) => {
        const active = i === page
        const done = i < page
        return (
          <li key={s} className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={i >= page || isPending}
              onClick={() => setPage(() => i)}
              className={`flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-semibold border-none cursor-pointer transition-colors disabled:cursor-default ${
                active
                  ? 'bg-[#4E69D3] text-white'
                  : done
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full grid place-items-center text-[11px] font-bold ${
                  active
                    ? 'bg-white/25 text-white'
                    : done
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-gray-400'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className="whitespace-nowrap hidden md:inline">{s}</span>
            </button>
            {i < steps.length - 1 && (
              <span className="w-4 h-px bg-gray-200 dark:bg-white/10" />
            )}
          </li>
        )
      })}
    </ol>
  )
}

// Pagination footer shared by both ITR forms. The submit button only
// renders on the last page; Back/Next are plain buttons so they never
// trigger validation.
export function ItrFooter({
  steps,
  page,
  setPage,
  isPending,
  darkMode,
  submitLabel,
}: {
  steps: string[]
  page: number
  setPage: (fn: (p: number) => number) => void
  isPending: boolean
  darkMode: boolean
  submitLabel: string
}) {
  const isLast = page === steps.length - 1
  return (
    <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-inherit">
      <button
        type="button"
        onClick={() => setPage((p) => Math.max(0, p - 1))}
        disabled={page === 0 || isPending}
        className={`rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          darkMode
            ? 'bg-white/10 hover:bg-white/20 text-[#F9FAFB]'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
      >
        Back
      </button>
      <p className="m-0 text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">
        Step {page + 1} of {steps.length} · {steps[page]}
      </p>
      {isLast ? (
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold bg-[#4E69D3] hover:bg-[#3D56B8] text-white cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isPending ? 'Saving…' : submitLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(steps.length - 1, p + 1))}
          disabled={isPending}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold bg-[#4E69D3] hover:bg-[#3D56B8] text-white cursor-pointer transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          Next
        </button>
      )}
    </div>
  )
}

// Minimal structural type of the medical record summary used below
// (avoids a circular import with config/appointment).
type ScheduleMedicalRecord = {
  bloodPressure: string
  heartRate: string
  respiratoryRate: string
  height: string
  weight: string
  temperature: string
  chiefComplaints: string
  diagnosis: string
  medications: string
  recommendation: string
}

// Consultation section (date, vitals, chief complaints, diagnosis,
// medications) shared by both ITR forms.
export function ItrConsultationSection({
  record,
  recordDate,
}: {
  record: ScheduleMedicalRecord | null
  recordDate: string
}) {
  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <TextField
          name="consultationDate"
          label="Date of Consultation"
          type="date"
          defaultValue={recordDate}
        />
        <TextField
          name="bloodPressure"
          label="Vital Signs — BP (mmHg)"
          defaultValue={record?.bloodPressure || ''}
          placeholder="120/80"
        />
        <TextField
          name="heartRate"
          label="HR (bpm)"
          defaultValue={record?.heartRate || ''}
          placeholder="72"
        />
        <TextField
          name="respiratoryRate"
          label="RR (breaths/min)"
          defaultValue={record?.respiratoryRate || ''}
          placeholder="16"
        />
        <TextField
          name="weight"
          label="WT (kg)"
          defaultValue={record?.weight || ''}
          placeholder="60"
        />
        <TextField
          name="height"
          label="HT (cm)"
          defaultValue={record?.height || ''}
          placeholder="165"
        />
        <TextField
          name="temperature"
          label="Temp. (°C)"
          defaultValue={record?.temperature || ''}
          placeholder="36.8"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <ItrTextarea
            name="chiefComplaints"
            label="Chief Complaints"
            rows={4}
            defaultValue={record?.chiefComplaints ?? ''}
            placeholder="Patient's presenting complaints…"
          />
        </div>
        <div>
          <ItrTextarea
            name="diagnosis"
            label="Diagnosis *"
            rows={4}
            required
            defaultValue={record?.diagnosis ?? ''}
            placeholder="Findings from the consultation…"
          />
        </div>
        <div className="sm:col-span-2">
          <ItrTextarea
            name="medications"
            label="Medications / Treatment"
            rows={3}
            defaultValue={record?.medications ?? record?.recommendation ?? ''}
            placeholder="Medicines given, treatment, and next steps…"
          />
        </div>
      </div>
    </>
  )
}
