'use client'

import { useState, useTransition, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useDarkMode } from '@/app/admin/DarkModeContext'
import { advanceQueueEntry, getWalkInItrAppointment, removeQueueEntry, addToQueue, type QueueEntry, type TodayQueues } from '@/lib/actions/queue'
import { cancelAppointment, updateAppointmentStatus } from '@/lib/actions/appointment'
import { registerWalkIn, searchPatientById, searchPatientsByName, type PatientLookup } from '@/lib/actions/appointmentManagement'
import { now, toISO } from '@/src/lib/dateUtils'
import { FIXED_ADDRESS, PUROKS } from '@/src/data/patientInfo'
import { MAX } from '@/src/lib/constants'
import { isValidPhone } from '@/lib/helper'
import MedicalRecordModal from '@/components/ui/MedicalRecordModal'
import type { ScheduleAppointmentView } from '@/config/appointment'

type Lane = 'WALKIN' | 'PRIORITY'

// A PTN-#### (or bare digits) entry is an exact ID lookup; anything else is
// treated as a (possibly partial) patient name.
const PATIENT_ID_QUERY = /^(?:\d+|ptn-?\d+)$/i

// Blank details collected when registering a NEW walk-in patient from this
// page. The PTN-#### is generated on save, and a login account is only created
// when an email address is entered.
const EMPTY_NEW_INFO = {
  firstName: '',
  lastName: '',
  birthdate: '',
  sex: '',
  phoneNumber: '',
  // Walk-ins live inside this health center's catchment, so only the street and
  // the purok are captured. Barangay / city / province / ZIP are fixed to
  // FIXED_ADDRESS (Barangay Sumapang Matanda) on the server.
  houseNumber: '',
  purok: '',
  email: '',
}

export default function QueueingClient({
  queues,
  services,
}: {
  queues: TodayQueues
  services: { id: string; title: string }[]
}) {
  const { darkMode } = useDarkMode()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const safeQueues: TodayQueues = {
    scheduled: Array.isArray(queues?.scheduled) ? queues.scheduled : [],
    walkins: Array.isArray(queues?.walkins) ? queues.walkins : [],
    priority: Array.isArray(queues?.priority) ? queues.priority : [],
  }

  const [showAdd, setShowAdd] = useState(false)
  const [lane, setLane] = useState<Lane>('WALKIN')
  const [priority, setPriority] = useState<'SENIOR' | 'PWD'>('SENIOR')
  const [isPwd, setIsPwd] = useState(false)
  const [serviceId, setServiceId] = useState('')
  const [search, setSearch] = useState('')
  const [patient, setPatient] = useState<PatientLookup | null>(null)
  // Name-search shortlist — lets staff pick the right walk-in instead of
  // typing a PTN-#### they may not know.
  const [matches, setMatches] = useState<PatientLookup[]>([])
  const [searchState, setSearchState] = useState<
    'idle' | 'found' | 'notfound' | 'matches'
  >('idle')

  // Walk-in registration. The modal opens on the existing-patient flow; the
  // "New Walk-in" tab collects the details and lets the server generate the
  // PTN-#### (plus a login account when an email is entered).
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [newInfo, setNewInfo] = useState({ ...EMPTY_NEW_INFO })
  const [walkInResult, setWalkInResult] = useState<{
    patientId: string
    email?: string
    credentialsEmailed?: boolean
  } | null>(null)
  const [recordFor, setRecordFor] = useState<ScheduleAppointmentView | null>(null)

  const setNewField =
    (key: keyof typeof newInfo) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setNewInfo((prev) => ({ ...prev, [key]: e.target.value }))

  const refresh = () => router.refresh()

  const runAction = (
    action: () => Promise<{ success: boolean; message: string }>,
    onDone?: () => void,
  ) => {
    startTransition(async () => {
      const res = await action()
      if (res.success) {
        toast.success(res.message)
        refresh()
        onDone?.()
      } else {
        toast.error(res.message)
      }
    })
  }

  // Correct flow for scheduled visits: APPROVED -> IN_CONSULTATION (medstaff
  // starts it, admin charts it) -> COMPLETED only by saving the medical
  // record. The queueing board never completes a visit directly.
  const advanceScheduled = (entry: QueueEntry) => {
    if (isPending) return
    if (entry.status === 'IN_CONSULTATION') {
      toast.error(
        'This visit is in consultation — enter the record from Appointments to complete it.',
      )
      return
    }
    runAction(() =>
      updateAppointmentStatus(
        entry.appointmentId ?? entry.id,
        'IN_CONSULTATION',
      ),
    )
  }

  const scheduledStatus = (entry: QueueEntry): QueueEntry['status'] =>
    entry.status

  const advanceQueued = (entry: QueueEntry) => {
    if (entry.id.startsWith('APT-')) {
      advanceScheduled(entry)
      return
    }
    // Walk-ins: WAITING -> IN_CONSULTATION only. Saving the record is what
    // completes them; the board never jumps straight to DONE.
    if (entry.status !== 'WAITING') {
      toast.error(
        'This visit is in consultation — save the medical record to complete it.',
      )
      return
    }
    runAction(() => advanceQueueEntry(entry.qid ?? entry.id))
  }

  const openWalkInItr = (entry: QueueEntry) => {
    if (isPending) return
    startTransition(async () => {
      const result = await getWalkInItrAppointment(entry.qid ?? entry.id)
      if (result.success && result.appointment) {
        setRecordFor(result.appointment)
      } else {
        toast.error(result.message)
      }
    })
  }

  const isEntryActive = (entry: QueueEntry) => entry?.status !== 'DONE'

  // Applies the DB-derived lane: senior (60+) or PWD (profile.isPwd) go PRIORITY.
  const applyPatientLookup = (p: PatientLookup) => {
    setPatient(p)
    setSearchState('found')
    if (p.isSenior) {
      setLane('PRIORITY')
      setPriority('SENIOR')
      setIsPwd(false)
    } else if (p.isPwd) {
      setLane('PRIORITY')
      setPriority('PWD')
      setIsPwd(true)
    } else {
      // Reset to walk-in if not senior/PWD
      setLane('WALKIN')
      setIsPwd(false)
    }
  }

  // One field for both lookup styles: a PTN-#### (or bare digits) verifies a
  // single patient, anything else returns a name shortlist to select from.
  const handleSearch = () => {
    const q = search.trim()
    if (isPending) return
    if (q.length < 2) {
      if (q) toast.error('Type at least 2 characters of the name or ID.')
      return
    }
    startTransition(async () => {
      if (PATIENT_ID_QUERY.test(q)) {
        const res = await searchPatientById(q)
        setMatches([])
        if (res.success && res.patient) {
          applyPatientLookup(res.patient)
        } else {
          setPatient(null)
          setSearchState('notfound')
        }
        return
      }
      const res = await searchPatientsByName(q)
      if (res.success && res.patients.length > 0) {
        setPatient(null)
        setMatches(res.patients)
        setSearchState('matches')
      } else {
        setPatient(null)
        setMatches([])
        setSearchState('notfound')
      }
    })
  }

  // Selecting a shortlist row is equivalent to a verified ID lookup. Candidates
  // that have no patient record yet keep the typed name in the box, since there
  // is no PTN-#### to show until they are queued.
  const pickMatch = (p: PatientLookup) => {
    setMatches([])
    setSearch(p.patientId || p.name)
    applyPatientLookup(p)
  }

  // Switching tabs clears the other flow's inputs so a stale lookup or a
  // half-typed walk-in can never leak into the submitted form.
  const switchMode = (next: 'existing' | 'new') => {
    if (next === mode) return
    setMode(next)
    setLane('WALKIN')
    setPriority('SENIOR')
    setIsPwd(false)
    setSearch('')
    setPatient(null)
    setMatches([])
    setSearchState('idle')
    setNewInfo({ ...EMPTY_NEW_INFO })
    setWalkInResult(null)
  }

  // registerWalkIn assigns the lane itself (60+ or PWD => priority), so a new
  // walk-in only needs the patient's details and a service.
  const emailLooksValid =
    !newInfo.email.trim() || /^\S+@\S+\.\S+$/.test(newInfo.email.trim())
  // Phone is optional, but when entered it must be a valid PH mobile number.
  const phoneLooksValid =
    !newInfo.phoneNumber.trim() || isValidPhone(newInfo.phoneNumber.trim())
  const canRegister =
    !isPending &&
    !!serviceId &&
    newInfo.firstName.trim().length >= 2 &&
    newInfo.lastName.trim().length >= 2 &&
    !!newInfo.birthdate &&
    !!newInfo.sex &&
    !!newInfo.purok &&
    emailLooksValid &&
    phoneLooksValid

  const submitNewWalkIn = () => {
    if (!canRegister) return
    const fd = new FormData()
    Object.entries(newInfo).forEach(([key, value]) => fd.set(key, value.trim()))
    fd.set('serviceId', serviceId)
    startTransition(async () => {
      const res = await registerWalkIn(null, fd)
      if (res.success) {
        toast.success(res.message)
        refresh()
        const p = (res.payload ?? {}) as {
          patientId?: string
          email?: string
          credentialsEmailed?: boolean
        }
        setWalkInResult({
          patientId: p.patientId ?? '',
          email: p.email,
          credentialsEmailed: p.credentialsEmailed,
        })
      } else {
        toast.error(res.message)
      }
    })
  }

  const resetAdd = () => {
    setShowAdd(false)
    setMode('existing')
    setLane('WALKIN')
    setPriority('SENIOR')
    setIsPwd(false)
    setServiceId('')
    setSearch('')
    setPatient(null)
    setMatches([])
    setSearchState('idle')
    setNewInfo({ ...EMPTY_NEW_INFO })
    setWalkInResult(null)
  }

  const submitAdd = () => {
    if (!patient) return
    const fd = new FormData()
    if (patient.patientId) {
      fd.set('patientId', patient.patientId)
    } else {
      // No patient record yet — queue by account identity and let the server
      // generate the PTN-####.
      fd.set('userId', patient.userId ?? '')
      if (patient.familyMemberId)
        fd.set('familyMemberId', patient.familyMemberId)
    }

    const qualifiesForPriority = patient.isSenior || patient.isPwd || isPwd

    if (qualifiesForPriority) {
      fd.set('lane', 'PRIORITY')
      fd.set('priority', patient.isSenior ? 'SENIOR' : 'PWD')
    } else {
      fd.set('lane', lane)
      if (lane === 'PRIORITY') fd.set('priority', priority)
    }

    if (serviceId) fd.set('serviceId', serviceId)
    runAction(() => addToQueue(null, fd), resetAdd)
  }

  const fieldLabel = `mb-1.5 block text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-700'}`
  const fieldInput = `min-h-11 w-full rounded-xl border px-3.5 py-2.5 text-[15px] outline-none transition focus-visible:border-[#4E69D3] focus-visible:ring-4 focus-visible:ring-[#4E69D3]/15 aria-invalid:border-red-500 ${darkMode ? 'border-white/15 bg-[#0f1438] text-slate-50 placeholder:text-slate-500' : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'}`
  const panelClass = darkMode
    ? 'border-white/10 bg-[#2d1b4e] shadow-[0_8px_24px_rgba(0,0,0,0.18)]'
    : 'border-slate-200 bg-white shadow-sm'
  const titleClass = darkMode ? 'text-slate-50' : 'text-slate-900'
  const mutedClass = darkMode ? 'text-slate-400' : 'text-slate-500'

  const activePriority = safeQueues.priority.filter(
    (q) =>
      (q.priority === 'SENIOR' || q.priority === 'PWD') && isEntryActive(q),
  )
  const activeScheduled = safeQueues.scheduled.filter(isEntryActive)
  const activeWalkins = safeQueues.walkins.filter(isEntryActive)
  const patientRequiresPriority = Boolean(patient?.isSenior || patient?.isPwd)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={`mt-1 text-sm ${mutedClass}`}>
            Manage today&rsquo;s appointments and walk-in patients.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0f588b] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b4670] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0f588b]/25"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="w-4 h-4"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add to Queue
        </button>
      </div>

      {/* Priority lane - Only displays Senior Citizens & PWD patients */}
      <div
        className={`rounded-2xl border p-4 sm:p-5 ${panelClass}`}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              className={`m-0 text-base font-semibold ${titleClass}`}
            >
              Priority Queue
            </h2>
            <p className={`m-0 mt-1 text-sm ${mutedClass}`}>
              Senior Citizens & Persons with Disabilities
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${darkMode ? 'bg-amber-400/15 text-amber-200' : 'bg-amber-50 text-amber-700'}`}
          >
            {activePriority.length} {activePriority.length === 1 ? 'patient' : 'patients'}
          </span>
        </div>
        <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1">
          {activePriority.length === 0 ? (
            <p
              className={`m-0 rounded-xl border border-dashed py-8 text-center text-sm ${darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}
            >
              No priority patients in queue
            </p>
          ) : (
            activePriority.map((q) => (
              <QueueRow
                key={q.id}
                darkMode={darkMode}
                item={{
                  ...q,
                  status: q.id.startsWith('APT-')
                    ? scheduledStatus(q)
                    : q.status,
                }}
                busy={isPending}
                onAdvance={() => advanceQueued(q)}
                onCompleteItr={
                  !q.id.startsWith('APT-') && q.status === 'IN_CONSULTATION'
                    ? () => openWalkInItr(q)
                    : undefined
                }
                onRemove={() =>
                  runAction(() =>
                    q.id.startsWith('APT-')
                      ? cancelAppointment(q.appointmentId ?? q.id)
                      : removeQueueEntry(q.qid ?? q.id),
                  )
                }
              />
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Scheduled appointments */}
        <div
          className={`rounded-2xl border p-4 sm:p-5 ${panelClass}`}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                className={`m-0 text-base font-semibold ${titleClass}`}
              >
                Today&rsquo;s Schedule
              </h2>
              <p
                className={`m-0 mt-1 text-sm ${mutedClass}`}
              >
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${darkMode ? 'bg-blue-400/15 text-blue-200' : 'bg-blue-50 text-blue-700'}`}
            >
              {activeScheduled.length} {activeScheduled.length === 1 ? 'patient' : 'patients'}
            </span>
          </div>
          <div className="flex max-h-[380px] flex-col gap-2 overflow-y-auto pr-1">
            {activeScheduled.length === 0 ? (
              <p
                className={`m-0 rounded-xl border border-dashed py-8 text-center text-sm ${darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}
              >
                No scheduled patients today
              </p>
            ) : (
              activeScheduled.map((q) => (
                <QueueRow
                  key={q.id}
                  darkMode={darkMode}
                  item={{ ...q, status: scheduledStatus(q) }}
                  busy={isPending}
                  onAdvance={() => advanceScheduled(q)}
                  onRemove={() =>
                    runAction(() =>
                      cancelAppointment(q.appointmentId ?? q.id),
                    )
                  }
                />
              ))
            )}
          </div>
        </div>

        {/* Walk-in lane */}
        <div
          className={`rounded-2xl border p-4 sm:p-5 ${panelClass}`}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                className={`m-0 text-base font-semibold ${titleClass}`}
              >
                Walk-ins
              </h2>
              <p className={`m-0 mt-1 text-sm ${mutedClass}`}>
                Patients without appointment
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${darkMode ? 'bg-violet-400/15 text-violet-200' : 'bg-violet-50 text-violet-700'}`}
            >
              {activeWalkins.length} {activeWalkins.length === 1 ? 'patient' : 'patients'}
            </span>
          </div>
          <div className="flex max-h-[380px] flex-col gap-2 overflow-y-auto pr-1">
            {activeWalkins.length === 0 ? (
              <p
                className={`m-0 rounded-xl border border-dashed py-8 text-center text-sm ${darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}
              >
                No walk-ins yet
              </p>
            ) : (
              activeWalkins.map((q) => (
                <QueueRow
                  key={q.id}
                  darkMode={darkMode}
                  item={q}
                  busy={isPending}
                  onAdvance={() => advanceQueued(q)}
                  onCompleteItr={
                    q.status === 'IN_CONSULTATION'
                      ? () => openWalkInItr(q)
                      : undefined
                  }
                  onRemove={() =>
                    runAction(() =>
                      q.id.startsWith('APT-')
                        ? cancelAppointment(q.appointmentId ?? q.id)
                        : removeQueueEntry(q.qid ?? q.id),
                    )
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add to queue modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={resetAdd}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="queue-dialog-title"
            aria-describedby="queue-dialog-description"
            onKeyDown={(event) => {
              if (event.key === 'Escape') resetAdd()
            }}
            className={`${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} flex max-h-[calc(100dvh_-_1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.28)] sm:max-h-[calc(100dvh_-_3rem)]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`sticky top-0 z-10 flex items-start justify-between gap-4 border-b px-4 py-4 sm:px-6 ${darkMode ? 'border-white/10 bg-[#2d1b4e]' : 'border-slate-200 bg-white'}`}
            >
              <div>
                <h2
                  id="queue-dialog-title"
                  className={`m-0 text-xl font-semibold tracking-tight sm:text-2xl ${titleClass}`}
                >
                  Add Patient to Queue
                </h2>
                <p
                  id="queue-dialog-description"
                  className={`m-0 mt-1.5 max-w-xl text-sm leading-5 ${mutedClass}`}
                >
                  Verify an existing patient, or register a new walk-in — new
                  patients get an auto-generated ID
                </p>
              </div>
              <button
                type="button"
                aria-label="Close add patient dialog"
                onClick={resetAdd}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-2xl transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4E69D3]/25 ${darkMode ? 'border-white/10 bg-[#0f1438] text-slate-200 hover:bg-white/10' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
              {/* Mode toggle — the modal opens on the existing-patient flow */}
              <div
                role="group"
                aria-label="Patient registration type"
                className={`mb-5 flex gap-1 rounded-xl border p-1 ${darkMode ? 'border-white/10 bg-[#0f1438]' : 'border-slate-200 bg-slate-50'}`}
              >
                <button
                  type="button"
                  aria-pressed={mode === 'existing'}
                  onClick={() => switchMode('existing')}
                  className={`min-h-10 flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4E69D3]/25 ${mode === 'existing' ? 'bg-[#0f588b] text-white shadow-sm' : darkMode ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-white'}`}
                >
                  Existing Patient
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'new'}
                  onClick={() => switchMode('new')}
                  className={`min-h-10 flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4E69D3]/25 ${mode === 'new' ? 'bg-[#0f588b] text-white shadow-sm' : darkMode ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-white'}`}
                >
                  New Walk-in
                </button>
              </div>

              {walkInResult ? (
                /* Success panel — confirms the queue add and the emailed login details */
                <div className="flex flex-col items-center text-center gap-2 py-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="w-6 h-6 text-green-600"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p
                    className={`m-0 text-lg font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#166534]'}`}
                  >
                    Walk-in registered
                  </p>
                  <p
                    className={`m-0 text-[14px] font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
                  >
                    Patient{' '}
                    <span className="font-bold">{walkInResult.patientId}</span>{' '}
                    was added to today&rsquo;s queue.
                  </p>
                  {walkInResult.email && (
                    <div
                      className={`mt-2 w-full rounded-xl border p-4 text-left ${darkMode ? 'bg-[#0f1438] border-[#4E69D3]/40' : 'bg-[#F0FDF4] border-green-200'}`}
                    >
                      <p
                        className={`m-0 mb-1 text-[13px] font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#166534]'}`}
                      >
                        Login account created for {walkInResult.email}
                      </p>
                      <p
                        className={`m-0 text-[13px] font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
                      >
                        {walkInResult.credentialsEmailed
                          ? 'A link to set their password has been emailed to the patient.'
                          : 'The email could not be sent — ask the patient to use “Forgot password” on the login page to set their own.'}
                      </p>
                    </div>
                  )}
                </div>
              ) : mode === 'new' ? (
                /* New walk-in — the PTN-#### and the lane are assigned on save */
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="wq-first" className={fieldLabel}>
                        First Name *
                      </label>
                      <input
                        id="wq-first"
                        required
                        value={newInfo.firstName}
                        onChange={setNewField('firstName')}
                        placeholder="Juan"
                        autoFocus
                        maxLength={MAX.NAME}
                        className={fieldInput}
                      />
                    </div>
                    <div>
                      <label htmlFor="wq-last" className={fieldLabel}>
                        Last Name *
                      </label>
                      <input
                        id="wq-last"
                        required
                        value={newInfo.lastName}
                        onChange={setNewField('lastName')}
                        placeholder="Dela Cruz"
                        maxLength={MAX.NAME}
                        className={fieldInput}
                      />
                    </div>
                    <div>
                      <label htmlFor="wq-birth" className={fieldLabel}>
                        Birthday *
                      </label>
                      <input
                        id="wq-birth"
                        type="date"
                        required
                        value={newInfo.birthdate}
                        onChange={setNewField('birthdate')}
                        max={toISO(now)}
                        className={fieldInput}
                      />
                    </div>
                    <div>
                      <label htmlFor="wq-sex" className={fieldLabel}>
                        Sex *
                      </label>
                      <select
                        id="wq-sex"
                        required
                        value={newInfo.sex}
                        onChange={setNewField('sex')}
                        className={`${fieldInput} cursor-pointer`}
                      >
                        <option value="" disabled>
                          Select sex
                        </option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="wq-mobile" className={fieldLabel}>
                        Mobile Number
                      </label>
                      <input
                        id="wq-mobile"
                        type="tel"
                        autoComplete="tel"
                        aria-invalid={!!newInfo.phoneNumber.trim() && !phoneLooksValid}
                        aria-describedby="wq-mobile-hint"
                        value={newInfo.phoneNumber}
                        onChange={setNewField('phoneNumber')}
                        placeholder="0917 123 4567"
                        maxLength={MAX.PHONE}
                        className={fieldInput}
                      />
                      <p
                        id="wq-mobile-hint"
                        className={`m-0 mt-1 text-xs ${phoneLooksValid ? mutedClass : darkMode ? 'text-red-300' : 'text-red-600'}`}
                      >
                        {phoneLooksValid
                          ? 'Optional. Use a valid Philippine mobile number.'
                          : 'Enter a valid Philippine mobile number.'}
                      </p>
                    </div>
                    <div>
                      <label htmlFor="wq-email" className={fieldLabel}>
                        Email (optional)
                      </label>
                      <input
                        id="wq-email"
                        type="email"
                        autoComplete="email"
                        aria-invalid={!!newInfo.email.trim() && !emailLooksValid}
                        aria-describedby="wq-email-hint"
                        value={newInfo.email}
                        onChange={setNewField('email')}
                        placeholder="Creates a login account"
                        maxLength={MAX.EMAIL}
                        className={fieldInput}
                      />
                      <p
                        id="wq-email-hint"
                        className={`m-0 mt-1 text-xs ${emailLooksValid ? mutedClass : darkMode ? 'text-red-300' : 'text-red-600'}`}
                      >
                        {emailLooksValid
                          ? 'Optional. Adds a login account for the patient.'
                          : 'Enter a valid email address.'}
                      </p>
                    </div>
                    <div>
                      <label htmlFor="wq-house" className={fieldLabel}>
                        Street / House No.
                      </label>
                      <input
                        id="wq-house"
                        value={newInfo.houseNumber}
                        onChange={setNewField('houseNumber')}
                        placeholder="123 Mabini Street"
                        maxLength={MAX.SHORT_NAME}
                        className={fieldInput}
                      />
                    </div>
                    <div>
                      <label htmlFor="wq-purok" className={fieldLabel}>
                        Purok *
                      </label>
                      <select
                        id="wq-purok"
                        required
                        value={newInfo.purok}
                        onChange={setNewField('purok')}
                        className={`${fieldInput} cursor-pointer`}
                      >
                        <option value="" disabled>
                          Select purok
                        </option>
                        {PUROKS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {/* Only the street + purok are captured — a walk-in is a resident of this barangay. */}
                  <div
                    className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 ${darkMode ? 'bg-[#0f1438] border-[rgba(255,255,255,0.15)]' : 'bg-[#f8fbff] border-[rgba(15,60,95,0.08)]'}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`w-3.5 h-3.5 shrink-0 ${darkMode ? 'text-[#8ea2ff]' : 'text-[#4E69D3]'}`}
                    >
                      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    <span
                      className={`text-[12px] font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
                    >
                      {FIXED_ADDRESS.barangay}, {FIXED_ADDRESS.municipality},{' '}
                      {FIXED_ADDRESS.province} {FIXED_ADDRESS.zipCode}
                    </span>
                  </div>
                  <p
                    className={`m-0 text-[13px] font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    A new patient ID (PTN-####) is generated on save
                    {newInfo.email.trim() ? ', along with a login account' : ''}
                    . Seniors (60+) and PWDs are routed to the priority lane
                    automatically.
                  </p>
                </div>
              ) : (
                <>
                  {/* Verify patient */}
                  <label
                    htmlFor="wq-patient-search"
                    className={`${fieldLabel} mb-2`}
                  >
                    1. Verify patient
                  </label>
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      id="wq-patient-search"
                      autoFocus
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value)
                        setSearchState('idle')
                        setPatient(null)
                        setMatches([])
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearch()
                      }}
                      placeholder="Patient ID (e.g., PTN-1002) or name"
                      className={`${fieldInput} min-w-0 flex-1`}
                    />
                    <button
                      type="button"
                      onClick={handleSearch}
                      disabled={isPending}
                      className="min-h-11 rounded-xl bg-[#0f588b] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b4670] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0f588b]/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPending ? 'Searching…' : 'Search'}
                    </button>
                  </div>
                  {searchState === 'matches' && matches.length > 0 && (
                    <div
                      className={`rounded-xl border mb-4 overflow-hidden ${darkMode ? 'bg-[#0f1438] border-[rgba(255,255,255,0.15)]' : 'bg-white border-gray-200'}`}
                    >
                      <p
                        className={`m-0 px-3.5 pt-3 text-[12px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                      >
                        {matches.length} matching{' '}
                        {matches.length > 1 ? 'patients' : 'patient'} — select
                        the right one
                      </p>
                      <div className="max-h-[220px] overflow-y-auto p-2">
                        {matches.map((m, i) => (
                          <button
                            key={
                              m.patientId ||
                              `${m.userId ?? 'u'}-${m.familyMemberId ?? 'self'}-${i}`
                            }
                            type="button"
                            onClick={() => pickMatch(m)}
                            className={`flex w-full flex-wrap items-center gap-3 rounded-lg p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4E69D3] ${darkMode ? 'hover:bg-[#1a2050]' : 'hover:bg-slate-50'}`}
                          >
                            <span className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[14px] bg-[#E8EAF6] text-[#4E69D3]">
                              {(m.name || m.patientId).charAt(0)}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span
                                className={`block text-[14px] font-bold truncate ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
                              >
                                {m.name || m.patientId}
                              </span>
                              <span
                                className={`block text-[12px] font-semibold truncate ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}`}
                              >
                                {m.patientId ? (
                                  <>
                                    {m.patientId}
                                    {m.hasAccount ? '' : ' \u00B7 No account'}
                                    {m.barangay ? ` \u00B7 ${m.barangay}` : ''}
                                  </>
                                ) : (
                                  <>
                                    Account registered
                                    {m.familyMemberId
                                      ? ' \u00B7 Family member'
                                      : ''}{' '}
                                    \u00B7 ID generated on add
                                  </>
                                )}
                              </span>
                            </span>
                            {m.isSenior && (
                              <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${darkMode ? 'bg-rose-500/20 text-rose-200' : 'bg-rose-500/10 text-rose-600'}`}>
                                Senior
                              </span>
                            )}
                            {m.isPwd && (
                              <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${darkMode ? 'bg-violet-500/20 text-violet-200' : 'bg-violet-500/10 text-violet-600'}`}>
                                PWD
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {searchState === 'found' && patient && (
                    <div
                      className={`mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border p-3.5 ${darkMode ? 'border-green-500/30 bg-[#0f1438]' : 'border-green-200 bg-green-50'}`}
                    >
                      <span
                        className={`text-[15px] font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#166534]'}`}
                      >
                        {patient.name || patient.patientId}
                      </span>
                      <span
                        className={`ml-2 text-[13px] font-semibold ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}`}
                      >
                        {patient.patientId
                          ? `${patient.patientId}${patient.hasAccount ? '' : ' \u00B7 No account'}`
                          : `Account registered${patient.familyMemberId ? ' \u00B7 Family member' : ''} \u00B7 Patient ID will be generated`}
                      </span>
                    </div>
                  )}
                  {searchState === 'notfound' && (
                    <p
                      role="alert"
                      className={`m-0 mb-4 text-sm font-medium ${darkMode ? 'text-red-300' : 'text-red-600'}`}
                    >
                      No patient found for &ldquo;{search.trim()}&rdquo;.
                    </p>
                  )}

                  {/* Choose lane */}
                  <p className={`${fieldLabel} mb-2`}>
                    2. Choose lane
                  </p>
                  <div
                    role="group"
                    aria-label="Queue lane"
                    className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
                  >
                    <button
                      type="button"
                      aria-pressed={lane === 'WALKIN'}
                      disabled={patientRequiresPriority}
                      onClick={() => setLane('WALKIN')}
                      className={`min-h-20 rounded-xl border p-3.5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4E69D3]/20 disabled:cursor-not-allowed disabled:opacity-60 ${lane === 'WALKIN' ? darkMode ? 'border-sky-400 bg-sky-400/10' : 'border-[#0f588b] bg-[#0f588b]/5' : darkMode ? 'border-white/15 bg-[#0f1438]' : 'border-slate-200 bg-white'}`}
                    >
                      <span
                        className={`block text-sm font-semibold ${lane === 'WALKIN' ? darkMode ? 'text-sky-200' : 'text-[#0f588b]' : titleClass}`}
                      >
                        Regular Walk-in
                      </span>
                      <span
                        className={`mt-1 block text-sm ${mutedClass}`}
                      >
                        {patientRequiresPriority
                          ? 'Priority is assigned automatically for this patient'
                          : 'Standard queue'}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={lane === 'PRIORITY'}
                      onClick={() => setLane('PRIORITY')}
                      className={`min-h-20 rounded-xl border p-3.5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/20 ${lane === 'PRIORITY' ? 'border-amber-500 bg-amber-500/5' : darkMode ? 'border-white/15 bg-[#0f1438]' : 'border-slate-200 bg-white'}`}
                    >
                      <span
                        className={`block text-sm font-semibold ${lane === 'PRIORITY' ? 'text-amber-500' : titleClass}`}
                      >
                        Priority Lane
                      </span>
                      <span
                        className={`mt-1 block text-sm ${mutedClass}`}
                      >
                        Seniors & PWDs
                      </span>
                    </button>
                  </div>

                  {lane === 'PRIORITY' && (
                    <div className="mb-4">
                      <p className={`${fieldLabel} mb-2`}>
                        Priority reason
                      </p>
                      {patient?.isSenior ? (
                        // Auto-detected senior - show badge
                        <div
                          className={`rounded-xl border p-3 border-amber-500 bg-amber-500/10`}
                        >
                          <span
                            className={`text-[15px] font-bold text-amber-500`}
                          >
                            Senior Citizen (Auto-detected)
                          </span>
                          <p
                            className={`text-[12px] mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                          >
                            Patient is 60 years or older
                          </p>
                        </div>
                      ) : patient?.isPwd ? (
                        // Auto-detected PWD from DB (UserProfile.isPwd)
                        <div
                          className={`rounded-xl border p-3 border-amber-500 bg-amber-500/10`}
                        >
                          <span
                            className={`text-[15px] font-bold text-amber-500`}
                          >
                            PWD (Auto-detected)
                          </span>
                          <p
                            className={`text-[12px] mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                          >
                            Declared in account signup records
                          </p>
                        </div>
                      ) : (
                        // Not senior - show PWD selection
                        <div>
                          <p
                            className={`text-[12px] mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                          >
                            Is this patient a Person with Disability (PWD)?
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              aria-pressed={isPwd}
                              onClick={() => {
                                setIsPwd(true)
                                setPriority('PWD')
                              }}
                              className={`min-h-11 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/20 ${isPwd ? 'border-amber-500 bg-amber-500/10' : darkMode ? 'border-white/15 bg-[#0f1438]' : 'border-slate-200 bg-white'}`}
                            >
                              <span
                                className={`text-[15px] font-bold ${isPwd ? 'text-amber-500' : darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
                              >
                                Yes, PWD
                              </span>
                            </button>
                            <button
                              type="button"
                              aria-pressed={!isPwd}
                              onClick={() => {
                                setIsPwd(false)
                                setLane('WALKIN')
                              }}
                              className={`min-h-11 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 ${!isPwd ? 'border-blue-500 bg-blue-500/10' : darkMode ? 'border-white/15 bg-[#0f1438]' : 'border-slate-200 bg-white'}`}
                            >
                              <span
                                className={`text-[15px] font-bold ${!isPwd ? 'text-blue-500' : darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
                              >
                                No, Walk-in
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Service — required when registering a new walk-in. Hidden once the
                  walk-in is registered: the patient is already queued, so the
                  picker is dead weight on the confirmation panel. */}
              {!walkInResult && (
                <>
                  <label
                    htmlFor="wq-service"
                    className={`${fieldLabel} mb-2`}
                  >
                    {mode === 'new' ? 'Service *' : '3. Service (optional)'}
                  </label>
                  <select
                    id="wq-service"
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    required={mode === 'new'}
                    className={`${fieldInput} cursor-pointer`}
                  >
                    <option value="" disabled={mode === 'new'}>
                      {mode === 'new'
                        ? 'Select service'
                        : 'Unspecified / Triage on arrival'}
                    </option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <div
              className={`sticky bottom-0 flex flex-col-reverse gap-2 border-t px-4 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 ${darkMode ? 'border-white/10 bg-[#2d1b4e]' : 'border-slate-200 bg-white'}`}
            >
              {walkInResult ? (
                <button
                  type="button"
                  onClick={resetAdd}
                  className={`min-h-11 w-full rounded-xl px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4E69D3]/25 sm:w-auto ${darkMode ? 'bg-[#0f1438] text-slate-100 hover:bg-[#1a2050]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  Close
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={resetAdd}
                    className={`min-h-11 w-full rounded-xl px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4E69D3]/25 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${darkMode ? 'bg-[#0f1438] text-slate-100 hover:bg-[#1a2050]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    Cancel
                  </button>
                  {mode === 'new' ? (
                    <button
                      type="button"
                      disabled={!canRegister}
                      onClick={submitNewWalkIn}
                      className="min-h-11 w-full rounded-xl bg-[#0f588b] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b4670] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0f588b]/25 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      {isPending ? 'Registering…' : 'Register Walk-in'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!patient || isPending}
                      onClick={submitAdd}
                      className="min-h-11 w-full rounded-xl bg-[#0f588b] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b4670] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0f588b]/25 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      {isPending ? 'Adding…' : 'Add to Queue'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {recordFor && (
        <MedicalRecordModal
          appointment={recordFor}
          darkMode={darkMode}
          onClose={() => setRecordFor(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}

function QueueRow({
  darkMode,
  item,
  busy,
  onAdvance,
  onRemove,
  onCompleteItr,
}: {
  darkMode: boolean
  item: QueueEntry
  busy: boolean
  onAdvance: () => void
  onRemove: () => void
  onCompleteItr?: () => void
}) {
  const statusLabel =
    item.status === 'DONE'
      ? 'Done'
      : item.status === 'IN_CONSULTATION'
        ? 'In Consultation'
        : 'Waiting'
  const statusStyle =
    item.status === 'DONE'
      ? darkMode
        ? 'bg-green-500/20 text-green-400'
        : 'bg-green-500/20 text-green-600'
      : item.status === 'IN_CONSULTATION'
        ? darkMode
          ? 'bg-blue-500/20 text-blue-300'
          : 'bg-[#E8EAF6] text-[#4E69D3]'
        : darkMode
          ? 'bg-amber-500/20 text-amber-300'
          : 'bg-amber-500/20 text-amber-600'
  const priorityBadge =
    item.priority === 'SENIOR'
      ? darkMode
        ? 'bg-rose-500/20 text-rose-300'
        : 'bg-rose-500/10 text-rose-600'
      : item.priority === 'PWD'
        ? darkMode
          ? 'bg-violet-500/20 text-violet-300'
          : 'bg-violet-500/10 text-violet-600'
        : null
  const avatarClass = item.priority
    ? darkMode
      ? 'bg-amber-500/20 text-amber-300'
      : 'bg-amber-500/15 text-amber-600'
    : item.status === 'DONE'
      ? 'bg-green-500/20 text-green-500'
      : darkMode
        ? 'bg-[#2d1b4e] text-blue-300'
        : 'bg-[#E8EAF6] text-[#4E69D3]'

  // Default ID visual component
  const DefaultIdVisual = () => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )

  return (
    <div
      className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-xl border p-3 transition-colors sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:gap-3 sm:p-3.5 ${item.status === 'DONE' ? 'opacity-60' : ''} ${item.priority ? (darkMode ? 'border-amber-500/30' : 'border-amber-200') : ''} ${darkMode ? 'bg-[#0f1438] border-white/10' : 'bg-white border-slate-200'}`}
    >
      {/* ID Image - Show uploaded ID or default visual */}
      {item.uploadedId ? (
        <div
          className={`h-10 w-11 shrink-0 overflow-hidden rounded-lg border ${darkMode ? 'border-white/20' : 'border-slate-200'}`}
        >
          <img
            src={item.uploadedId}
            alt={`${item.name} identification`}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <span
          aria-hidden="true"
          className={`flex h-10 w-11 shrink-0 items-center justify-center rounded-lg ${avatarClass}`}
        >
          <DefaultIdVisual />
        </span>
      )}
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span
            className={`truncate text-sm font-semibold sm:text-[15px] ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}
            title={item.name}
          >
            {item.name}
          </span>
          {priorityBadge && (
            <span
              className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${priorityBadge}`}
            >
              {item.priority === 'SENIOR' ? 'Senior' : 'PWD'}
            </span>
          )}
        </div>
        <div
          className={`mt-0.5 truncate text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
        >
          {item.time} &middot; {item.service}
        </div>
      </div>
      <span
        role="status"
        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold sm:text-xs ${statusStyle}`}
      >
        {statusLabel}
      </span>
      <div className="col-span-2 col-start-2 flex items-center justify-end gap-2 sm:col-span-1 sm:col-start-4">
        {item.status !== 'DONE' && (
          <>
            {item.status === 'WAITING' && (
              <button
                type="button"
                onClick={onAdvance}
                disabled={busy}
                title="Start consultation"
                aria-label={`Start consultation for ${item.name}`}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4E69D3]/25 disabled:cursor-not-allowed disabled:opacity-50 ${darkMode ? 'border-white/10 bg-[#2d1b4e] text-blue-300 hover:bg-[#141a45]' : 'border-slate-200 bg-white text-[#0f588b] hover:bg-slate-50'}`}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            )}
            {onCompleteItr && (
              <button
                type="button"
                onClick={onCompleteItr}
                disabled={busy}
                title="Complete visit and record treatment (ITR)"
                aria-label={`Complete visit and record treatment for ${item.name}`}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-500/25 disabled:cursor-not-allowed disabled:opacity-50 ${darkMode ? 'border-white/10 bg-[#2d1b4e] text-green-300 hover:bg-[#141a45]' : 'border-slate-200 bg-white text-green-700 hover:bg-green-50'}`}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                  <polyline points="9 6 9 17" />
                </svg>
              </button>
            )}
          </>
        )}
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          title="Remove from queue"
          aria-label={`Remove ${item.name} from queue`}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${darkMode ? 'border-white/10 bg-[#2d1b4e] text-red-300 hover:bg-[#141a45]' : 'border-slate-200 bg-white text-red-600 hover:bg-red-50'}`}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
