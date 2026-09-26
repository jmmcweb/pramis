'use client'

import { useState, useTransition, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useDarkMode } from '@/app/admin/DarkModeContext'
import {
  advanceQueueEntry,
  markQueueDone,
  removeQueueEntry,
  addToQueue,
  type QueueEntry,
  type TodayQueues,
} from '@/lib/actions/queue'
import {
  cancelAppointment,
  updateAppointmentStatus,
} from '@/lib/actions/appointment'
import {
  getWalkInAppointmentView,
  registerWalkIn,
  searchPatientById,
  searchPatientsByName,
  type PatientLookup,
} from '@/lib/actions/appointmentManagement'
import MedicalRecordModal from '@/components/ui/MedicalRecordModal'
import type { ScheduleAppointmentView } from '@/config/appointment'
import { now, toISO } from '@/src/lib/dateUtils'
import { FIXED_ADDRESS, PUROKS } from '@/src/data/patientInfo'

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

  const [inConsultation, setInConsultation] = useState(new Set<string>())

  const [recordFor, setRecordFor] = useState<ScheduleAppointmentView | null>(null)
  const [pendingDoneQid, setPendingDoneQid] = useState<string | null>(null)

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
  const [searchState, setSearchState] = useState<'idle' | 'found' | 'notfound' | 'matches'>('idle')

  // Walk-in registration. The modal opens on the existing-patient flow; the
  // "New Walk-in" tab collects the details and lets the server generate the
  // PTN-#### (plus a login account when an email is entered).
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [newInfo, setNewInfo] = useState({ ...EMPTY_NEW_INFO })
  const [walkInResult, setWalkInResult] = useState<{
    patientId: string
    email?: string
    tempPassword?: string
  } | null>(null)

  const setNewField =
    (key: keyof typeof newInfo) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setNewInfo(prev => ({ ...prev, [key]: e.target.value }))

  const refresh = () => router.refresh()

  const runAction = (action: () => Promise<{ success: boolean; message: string }>, onDone?: () => void) => {
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

  const advanceScheduled = (entry: QueueEntry) => {
    if (inConsultation.has(entry.id)) {
      setInConsultation(prev => {
        const next = new Set(prev)
        next.delete(entry.id)
        return next
      })
      runAction(() => updateAppointmentStatus(entry.id, 'COMPLETED'))
    } else {
      setInConsultation(prev => new Set(prev).add(entry.id))
      toast.success('Consultation started.')
    }
  }

  const scheduledStatus = (entry: QueueEntry): QueueEntry['status'] =>
    entry.status === 'DONE' ? 'DONE' : inConsultation.has(entry.id) ? 'IN_CONSULTATION' : 'WAITING'

  const advanceQueued = (entry: QueueEntry) => {
    if (entry.status === 'WAITING') {
      if (entry.id.startsWith('APT-')) { advanceScheduled(entry); return; }
      runAction(() => advanceQueueEntry(entry.id))
      return
    }
    if (isPending || entry.status !== 'IN_CONSULTATION') return
    startTransition(async () => {
      const res = await getWalkInAppointmentView(entry.id)
      if (res.success && res.appointment) {
        setPendingDoneQid(entry.id)
        setRecordFor(res.appointment)
      } else {
        toast.error(res.message)
      }
    })
  }

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

  // Selecting a shortlist row is equivalent to a verified ID lookup.
  const pickMatch = (p: PatientLookup) => {
    setMatches([])
    setSearch(p.patientId)
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
  const canRegister =
    !isPending &&
    !!serviceId &&
    newInfo.firstName.trim().length >= 2 &&
    newInfo.lastName.trim().length >= 2 &&
    !!newInfo.birthdate &&
    !!newInfo.sex &&
    !!newInfo.purok &&
    emailLooksValid

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
        // Stay open on the result panel so the generated login credentials
        // can be handed to the patient.
        const p = (res.payload ?? {}) as {
          patientId?: string
          email?: string
          tempPassword?: string
        }
        setWalkInResult({
          patientId: p.patientId ?? '',
          email: p.email,
          tempPassword: p.tempPassword,
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
    fd.set('patientId', patient.patientId)
    
    // DB-verified senior/PWD always goes to priority (senior wins the tie).
    const qualifiesForPriority =
      patient.isSenior || (patient as any).isPwd || isPwd
    
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

  const fieldLabel = `block text-[13px] font-bold mb-1.5 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`
  const fieldInput = `w-full px-3.5 py-2.5 rounded-lg text-[15px] outline-none transition-colors border ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] placeholder-gray-500 border-[rgba(255,255,255,0.15)] focus:border-[#4E69D3]' : 'bg-white text-gray-800 placeholder-gray-400 border-gray-200 focus:border-[#4E69D3]'}`

  return (
    <div>
      <div className="flex items-center justify-between mb-[14px]">
        <h1 className={`text-[30px] sm:text-[38px] lg:text-[45px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'} my-0 text-left`}>Queueing</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold border-none cursor-pointer transition-colors bg-green-600 text-white hover:bg-green-700"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add to Queue
        </button>
      </div>

      {/* Priority lane - Only displays Senior Citizens & PWD patients */}
      <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.08)]'} border p-4 rounded-[24px] ${darkMode ? 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]'} mb-4`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className={`font-poppins text-[18px] font-bold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Priority Queue</h2>
            <p className={`text-[12px] font-semibold m-0 mt-0.5 text-gray-400`}>Senior Citizens & Persons with Disabilities</p>
          </div>
          <span className={`text-[13px] font-bold px-3 py-1.5 rounded-full ${darkMode ? 'bg-[#0f1438] text-amber-300' : 'bg-amber-500/20 text-amber-600'}`}>{queues.priority.filter(q => q.status !== 'DONE').length} in priority queue</span>
        </div>
        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
          {queues.priority.filter(q => q.priority === 'SENIOR' || q.priority === 'PWD').length === 0 ? (
            <p className={`text-sm font-semibold text-center m-0 py-8 text-gray-400`}>No priority patients in queue</p>
          ) : (
            queues.priority
              .filter(q => q.priority === 'SENIOR' || q.priority === 'PWD')
              .map(q => (
                <QueueRow
                  key={q.id}
                  darkMode={darkMode}
                  item={{ ...q, status: q.id.startsWith('APT-') ? scheduledStatus(q) : q.status }}
                  busy={isPending}
                  onAdvance={() => advanceQueued(q)}
                  onRemove={() => runAction(() => q.id.startsWith('APT-') ? cancelAppointment(q.id) : removeQueueEntry(q.id))}
                />
              ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Scheduled appointments */}
        <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.08)]'} border p-4 rounded-[24px] ${darkMode ? 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]'}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className={`font-poppins text-[18px] font-bold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Today&rsquo;s Schedule</h2>
              <p className={`text-[12px] font-semibold m-0 mt-0.5 text-gray-400`}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <span className={`text-[13px] font-bold px-3 py-1.5 rounded-full ${darkMode ? 'bg-[#0f1438] text-blue-300' : 'bg-[#E8EAF6] text-[#4E69D3]'}`}>{queues.scheduled.filter(q => scheduledStatus(q) !== 'DONE').length} in queue</span>
          </div>
          <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
            {queues.scheduled.length === 0 ? (
              <p className={`text-sm font-semibold text-center m-0 py-8 text-gray-400`}>No scheduled patients today</p>
            ) : (
              queues.scheduled.map(q => (
                <QueueRow
                  key={q.id}
                  darkMode={darkMode}
                  item={{ ...q, status: scheduledStatus(q) }}
                  busy={isPending}
                  onAdvance={() => advanceScheduled(q)}
                  onRemove={() => runAction(() => cancelAppointment(q.id))}
                />
              ))
            )}
          </div>
        </div>

        {/* Walk-in lane */}
        <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.08)]'} border p-4 rounded-[24px] ${darkMode ? 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]'}`}>
          <div className="mb-3">
            <h2 className={`font-poppins text-[18px] font-bold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Walk-ins</h2>
            <p className={`text-[12px] font-semibold m-0 mt-0.5 text-gray-400`}>Patients without appointment</p>
          </div>
          <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
            {queues.walkins.length === 0 ? (
              <p className={`text-sm font-semibold text-center m-0 py-8 text-gray-400`}>No walk-ins yet</p>
            ) : (
              queues.walkins.map(q => (
                <QueueRow
                  key={q.id}
                  darkMode={darkMode}
                  item={q}
                  busy={isPending}
                  onAdvance={() => advanceQueued(q)}
                  onRemove={() => runAction(() => q.id.startsWith('APT-') ? cancelAppointment(q.id) : removeQueueEntry(q.id))}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Post-consultation record required to mark a queued visit DONE. */}
      {recordFor && (
        <MedicalRecordModal
          appointment={recordFor}
          darkMode={darkMode}
          onClose={() => { setRecordFor(null); setPendingDoneQid(null) }}
          onSaved={() => {
            if (pendingDoneQid) runAction(() => markQueueDone(pendingDoneQid))
            setPendingDoneQid(null)
          }}
        />
      )}

      {/* Add to queue modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-start z-[1000] p-3 sm:p-4 lg:p-10 overflow-y-auto">
          <div className={`${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-2xl w-full max-w-[720px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex flex-col max-h-[90vh]`} onClick={e => e.stopPropagation()}>
            <div className={`flex justify-between items-center px-7 py-5 border-b ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} sticky top-0 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-t-2xl z-10`}>
              <div>
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0`}>Add Patient to Queue</h2>
                <p className={`text-[12px] m-0 mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Verify an existing patient, or register a new walk-in — new patients get an auto-generated ID</p>
              </div>
              <button className={`w-9 h-9 border-none ${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'} rounded-full text-xl ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'} cursor-pointer flex items-center justify-center hover:bg-red-500 hover:text-white transition-all`} onClick={resetAdd}>&times;</button>
            </div>

            <div className="px-7 py-6 overflow-y-auto flex-1">
              {/* Mode toggle — the modal opens on the existing-patient flow */}
              <div className={`flex gap-1 p-1 rounded-xl border mb-5 ${darkMode ? 'bg-[#0f1438] border-[rgba(255,255,255,0.10)]' : 'bg-[#f8fbff] border-[rgba(15,60,95,0.08)]'}`}>
                <button
                  onClick={() => switchMode('existing')}
                  className={`flex-1 px-4 py-2 rounded-lg text-[13px] font-bold border-none cursor-pointer transition-colors ${mode === 'existing' ? 'bg-[#4E69D3] text-white shadow-[0_2px_6px_rgba(78,105,211,0.35)]' : darkMode ? 'bg-transparent text-gray-400 hover:text-[#F9FAFB]' : 'bg-transparent text-gray-500 hover:text-[#2A2E43]'}`}
                >
                  Existing Patient
                </button>
                <button
                  onClick={() => switchMode('new')}
                  className={`flex-1 px-4 py-2 rounded-lg text-[13px] font-bold border-none cursor-pointer transition-colors ${mode === 'new' ? 'bg-[#4E69D3] text-white shadow-[0_2px_6px_rgba(78,105,211,0.35)]' : darkMode ? 'bg-transparent text-gray-400 hover:text-[#F9FAFB]' : 'bg-transparent text-gray-500 hover:text-[#2A2E43]'}`}
                >
                  New Walk-in
                </button>
              </div>

              {walkInResult ? (
                /* Success panel — surfaces the generated login credentials */
                <div className="flex flex-col items-center text-center gap-2 py-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6 text-green-600">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className={`m-0 text-lg font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#166534]'}`}>Walk-in registered</p>
                  <p className={`m-0 text-[14px] font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Patient <span className="font-bold">{walkInResult.patientId}</span> was added to today&rsquo;s queue.
                  </p>
                  {walkInResult.tempPassword && (
                    <div className={`mt-2 w-full rounded-xl border p-4 text-left ${darkMode ? 'bg-[#0f1438] border-[#4E69D3]/40' : 'bg-[#F0FDF4] border-green-200'}`}>
                      <p className={`m-0 mb-1 text-[13px] font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#166534]'}`}>
                        Login account created{walkInResult.email ? ` for ${walkInResult.email}` : ''}
                      </p>
                      <p className={`m-0 text-[13px] font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Temporary password:{' '}
                        <span className={`font-mono font-bold text-[15px] ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}`}>{walkInResult.tempPassword}</span>
                      </p>
                      <p className={`m-0 mt-1 text-[12px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Give these to the patient — they can sign in and change their password anytime.
                      </p>
                    </div>
                  )}
                </div>
              ) : mode === 'new' ? (
                /* New walk-in — the PTN-#### and the lane are assigned on save */
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="wq-first" className={fieldLabel}>First Name *</label>
                      <input id="wq-first" value={newInfo.firstName} onChange={setNewField('firstName')} placeholder="Juan" autoFocus className={fieldInput} />
                    </div>
                    <div>
                      <label htmlFor="wq-last" className={fieldLabel}>Last Name *</label>
                      <input id="wq-last" value={newInfo.lastName} onChange={setNewField('lastName')} placeholder="Dela Cruz" className={fieldInput} />
                    </div>
                    <div>
                      <label htmlFor="wq-birth" className={fieldLabel}>Birthday *</label>
                      <input id="wq-birth" type="date" value={newInfo.birthdate} onChange={setNewField('birthdate')} max={toISO(now)} className={fieldInput} />
                    </div>
                    <div>
                      <label htmlFor="wq-sex" className={fieldLabel}>Sex *</label>
                      <select id="wq-sex" value={newInfo.sex} onChange={setNewField('sex')} className={`${fieldInput} cursor-pointer`}>
                        <option value="" disabled>Select sex</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="wq-mobile" className={fieldLabel}>Mobile Number</label>
                      <input id="wq-mobile" value={newInfo.phoneNumber} onChange={setNewField('phoneNumber')} placeholder="0917 123 4567" className={fieldInput} />
                    </div>
                    <div>
                      <label htmlFor="wq-email" className={fieldLabel}>Email (optional)</label>
                      <input id="wq-email" type="email" value={newInfo.email} onChange={setNewField('email')} placeholder="Creates a login account" className={fieldInput} />
                    </div>
                    <div>
                      <label htmlFor="wq-house" className={fieldLabel}>Street / House No.</label>
                      <input id="wq-house" value={newInfo.houseNumber} onChange={setNewField('houseNumber')} placeholder="123 Mabini Street" className={fieldInput} />
                    </div>
                    <div>
                      <label htmlFor="wq-purok" className={fieldLabel}>Purok *</label>
                      <select id="wq-purok" value={newInfo.purok} onChange={setNewField('purok')} className={`${fieldInput} cursor-pointer`}>
                        <option value="" disabled>Select purok</option>
                        {PUROKS.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {/* Only the street + purok are captured — a walk-in is a resident of this barangay. */}
                  <div className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 ${darkMode ? 'bg-[#0f1438] border-[rgba(255,255,255,0.15)]' : 'bg-[#f8fbff] border-[rgba(15,60,95,0.08)]'}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-3.5 h-3.5 shrink-0 ${darkMode ? 'text-[#8ea2ff]' : 'text-[#4E69D3]'}`}>
                      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    <span className={`text-[12px] font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {FIXED_ADDRESS.barangay}, {FIXED_ADDRESS.municipality}, {FIXED_ADDRESS.province} {FIXED_ADDRESS.zipCode}
                    </span>
                  </div>
                  <p className={`m-0 text-[13px] font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    A new patient ID (PTN-####) is generated on save
                    {newInfo.email.trim() ? ', along with a login account' : ''}
                    . Seniors (60+) and PWDs are routed to the priority lane
                    automatically.
                  </p>
                </div>
              ) : (
                <>
                {/* Verify patient */}
                <p className={`m-0 mb-2 text-[13px] font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>1. Verify patient</p>
                <div className="flex gap-3 mb-2">
                  <input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setSearchState('idle'); setPatient(null); setMatches([]) }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
                    placeholder="Patient ID (e.g., PTN-1002) or name"
                    className={`flex-1 min-w-0 px-3.5 py-2.5 rounded-lg text-[15px] outline-none transition-colors border ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] placeholder-gray-500 border-[rgba(255,255,255,0.15)] focus:border-[#4E69D3]' : 'bg-white text-gray-800 placeholder-gray-400 border-gray-200 focus:border-[#4E69D3]'}`}
                  />
                  <button onClick={handleSearch} disabled={isPending} className="px-6 py-2.5 rounded-lg border-none text-sm font-semibold cursor-pointer transition-colors bg-[#4E69D3] text-white hover:bg-[#3D56B8] whitespace-nowrap disabled:opacity-50">{isPending ? 'Searching…' : 'Search'}</button>
                </div>
                {searchState === 'matches' && matches.length > 0 && (
                  <div className={`rounded-xl border mb-4 overflow-hidden ${darkMode ? 'bg-[#0f1438] border-[rgba(255,255,255,0.15)]' : 'bg-white border-gray-200'}`}>
                    <p className={`m-0 px-3.5 pt-3 text-[12px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{matches.length} matching {matches.length > 1 ? 'patients' : 'patient'} — select the right one</p>
                    <div className="max-h-[220px] overflow-y-auto p-2">
                      {matches.map(m => (
                        <button
                          key={m.patientId}
                          type="button"
                          onClick={() => pickMatch(m)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-lg border-none text-left cursor-pointer transition-colors ${darkMode ? 'bg-transparent hover:bg-[#1a2050]' : 'bg-transparent hover:bg-[#f2f6ff]'}`}
                        >
                          <span className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[14px] bg-[#E8EAF6] text-[#4E69D3]">{(m.name || m.patientId).charAt(0)}</span>
                          <span className="flex-1 min-w-0">
                            <span className={`block text-[14px] font-bold truncate ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{m.name || m.patientId}</span>
                            <span className={`block text-[12px] font-semibold truncate ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}`}>{m.patientId}{m.hasAccount ? '' : ' \u00B7 No account'}{m.barangay ? ` \u00B7 ${m.barangay}` : ''}</span>
                          </span>
                          {m.isSenior && <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600">Senior</span>}
                          {m.isPwd && <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-500/10 text-violet-600">PWD</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {searchState === 'found' && patient && (
                  <div className={`rounded-xl border p-3.5 mb-4 ${darkMode ? 'bg-[#0f1438] border-green-500/30' : 'bg-[#F0FDF4] border-green-200'}`}>
                    <span className={`text-[15px] font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#166534]'}`}>{patient.name || patient.patientId}</span>
                    <span className={`ml-2 text-[13px] font-semibold ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}`}>{patient.patientId}{patient.hasAccount ? '' : ' \u00B7 No account'}</span>
                  </div>
                )}
                {searchState === 'notfound' && (
                  <p className={`m-0 mb-4 text-[13px] font-semibold text-red-500`}>No patient found for &ldquo;{search.trim()}&rdquo;.</p>
                )}

                {/* Choose lane */}
                <p className={`m-0 mb-2 text-[13px] font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>2. Choose lane</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => setLane('WALKIN')}
                    className={`rounded-xl border p-3.5 text-left cursor-pointer transition-all ${lane === 'WALKIN' ? 'border-[#4E69D3] bg-[#4E69D3]/5' : darkMode ? 'border-[rgba(255,255,255,0.15)] bg-[#0f1438]' : 'border-gray-200 bg-white'}`}
                  >
                    <span className={`block text-[15px] font-bold ${lane === 'WALKIN' ? 'text-[#4E69D3]' : darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Regular Walk-in</span>
                    <span className={`block text-[12px] mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Standard queue</span>
                  </button>
                  <button
                    onClick={() => setLane('PRIORITY')}
                    className={`rounded-xl border p-3.5 text-left cursor-pointer transition-all ${lane === 'PRIORITY' ? 'border-amber-500 bg-amber-500/5' : darkMode ? 'border-[rgba(255,255,255,0.15)] bg-[#0f1438]' : 'border-gray-200 bg-white'}`}
                  >
                    <span className={`block text-[15px] font-bold ${lane === 'PRIORITY' ? 'text-amber-500' : darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Priority Lane</span>
                    <span className={`block text-[12px] mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Seniors & PWDs</span>
                  </button>
                </div>

                {lane === 'PRIORITY' && (
                  <div className="mb-4">
                    <p className={`m-0 mb-2 text-[13px] font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Priority reason</p>
                    {patient?.isSenior ? (
                      // Auto-detected senior - show badge
                      <div className={`rounded-xl border p-3 border-amber-500 bg-amber-500/10`}>
                        <span className={`text-[15px] font-bold text-amber-500`}>Senior Citizen (Auto-detected)</span>
                        <p className={`text-[12px] mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Patient is 60 years or older</p>
                      </div>
                    ) : (patient as any)?.isPwd ? (
                      // Auto-detected PWD from DB (UserProfile.isPwd)
                      <div className={`rounded-xl border p-3 border-amber-500 bg-amber-500/10`}>
                        <span className={`text-[15px] font-bold text-amber-500`}>PWD (Auto-detected)</span>
                        <p className={`text-[12px] mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Declared in account signup records</p>
                      </div>
                    ) : (
                      // Not senior - show PWD selection
                      <div>
                        <p className={`text-[12px] mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Is this patient a Person with Disability (PWD)?</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => {
                              setIsPwd(true)
                              setPriority('PWD')
                            }}
                            className={`rounded-xl border p-3 text-left cursor-pointer transition-all ${isPwd ? 'border-amber-500 bg-amber-500/10' : darkMode ? 'border-[rgba(255,255,255,0.15)] bg-[#0f1438]' : 'border-gray-200 bg-white'}`}
                          >
                            <span className={`text-[15px] font-bold ${isPwd ? 'text-amber-500' : darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Yes, PWD</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsPwd(false)
                              setLane('WALKIN')
                            }}
                            className={`rounded-xl border p-3 text-left cursor-pointer transition-all ${!isPwd ? 'border-blue-500 bg-blue-500/10' : darkMode ? 'border-[rgba(255,255,255,0.15)] bg-[#0f1438]' : 'border-gray-200 bg-white'}`}
                          >
                            <span className={`text-[15px] font-bold ${!isPwd ? 'text-blue-500' : darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>No, Walk-in</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                </>
              )}

              {/* Service — required when registering a new walk-in */}
              <p className={`m-0 mb-2 text-[13px] font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{mode === 'new' ? 'Service *' : '3. Service (optional)'}</p>
              <select
                value={serviceId}
                onChange={e => setServiceId(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-lg text-[15px] outline-none transition-colors cursor-pointer border ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] border-[rgba(255,255,255,0.15)] focus:border-[#4E69D3]' : 'bg-white text-gray-800 border-gray-200 focus:border-[#4E69D3]'}`}
              >
                <option value="" disabled={mode === 'new'}>{mode === 'new' ? 'Select service' : 'Unspecified / Triage on arrival'}</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>

            <div className={`flex justify-end gap-3 px-7 py-4 border-t ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} sticky bottom-0 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-b-2xl`}>
              {walkInResult ? (
                <button className={`px-6 py-2.5 rounded-lg border-none text-sm font-semibold cursor-pointer transition-colors ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] hover:bg-[#1a2050]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} onClick={resetAdd}>Close</button>
              ) : (
                <>
                  <button disabled={isPending} className={`px-6 py-2.5 rounded-lg border-none text-sm font-semibold cursor-pointer transition-colors disabled:opacity-50 ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] hover:bg-[#1a2050]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} onClick={resetAdd}>Cancel</button>
                  {mode === 'new' ? (
                    <button
                      disabled={!canRegister}
                      onClick={submitNewWalkIn}
                      className="px-6 py-2.5 rounded-lg border-none text-sm font-semibold cursor-pointer transition-colors bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >{isPending ? 'Registering…' : 'Register Walk-in'}</button>
                  ) : (
                    <button
                      disabled={!patient || isPending}
                      onClick={submitAdd}
                      className="px-6 py-2.5 rounded-lg border-none text-sm font-semibold cursor-pointer transition-colors bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >{isPending ? 'Adding…' : 'Add to Queue'}</button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function QueueRow({ darkMode, item, busy, onAdvance, onRemove }: {
  darkMode: boolean
  item: QueueEntry
  busy: boolean
  onAdvance: () => void
  onRemove: () => void
}) {
  const statusLabel =
    item.status === 'DONE' ? 'Done' : item.status === 'IN_CONSULTATION' ? 'In Consultation' : 'Waiting'
  const statusStyle = item.status === 'DONE'
    ? (darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-500/20 text-green-600')
    : item.status === 'IN_CONSULTATION'
      ? (darkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-[#E8EAF6] text-[#4E69D3]')
      : (darkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-500/20 text-amber-600')
  const priorityBadge = item.priority === 'SENIOR'
    ? (darkMode ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-500/10 text-rose-600')
    : item.priority === 'PWD'
      ? (darkMode ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-500/10 text-violet-600')
      : null
  const avatarClass = item.priority
    ? (darkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-500/15 text-amber-600')
    : item.status === 'DONE'
      ? 'bg-green-500/20 text-green-500'
      : darkMode ? 'bg-[#2d1b4e] text-blue-300' : 'bg-[#E8EAF6] text-[#4E69D3]'
  
  // Default ID visual component
  const DefaultIdVisual = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  )
  
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${item.status === 'DONE' ? 'opacity-60' : ''} ${item.priority ? (darkMode ? 'border-amber-500/30' : 'border-amber-200') : ''} ${darkMode ? 'bg-[#0f1438] border-[rgba(255,255,255,0.10)]' : 'bg-white border-gray-100'}`}>
      {/* ID Image - Show uploaded ID or default visual */}
      {item.uploadedId ? (
        <div className={`w-12 h-9 flex-shrink-0 rounded overflow-hidden border ${darkMode ? 'border-[rgba(255,255,255,0.20)]' : 'border-gray-200'}`}>
          <img 
            src={item.uploadedId} 
            alt="ID" 
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <span className={`w-12 h-9 flex items-center justify-center flex-shrink-0 rounded ${avatarClass}`}>
          <DefaultIdVisual />
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`text-[16px] font-poppins font-semibold truncate ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`} title={item.name}>{item.name}</span>
          {priorityBadge && <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${priorityBadge}`}>{item.priority === 'SENIOR' ? 'Senior' : 'PWD'}</span>}
        </div>
        <div className={`text-[14px] font-semibold truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.time} &middot; {item.service}</div>
      </div>
      <span className={`text-[13px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${statusStyle}`}>{statusLabel}</span>
      {item.status !== 'DONE' && (
        <button onClick={onAdvance} disabled={busy} title={item.status === 'WAITING' ? 'Start consultation' : 'Mark as done'} className={`w-8 h-8 rounded-lg cursor-pointer border transition-all flex items-center justify-center flex-shrink-0 disabled:opacity-50 ${darkMode ? 'bg-[#2d1b4e] text-[#4E9FFF] border-[rgba(255,255,255,0.10)] hover:bg-[#141a45]' : 'bg-white text-[#4E69D3] border-[#4E69D3] hover:bg-[#E8EAF6]'}`}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
      )}
      <button onClick={onRemove} disabled={busy} title="Remove from queue" className={`w-8 h-8 rounded-lg cursor-pointer border transition-all flex items-center justify-center flex-shrink-0 disabled:opacity-50 ${darkMode ? 'bg-[#2d1b4e] text-red-400 border-[rgba(255,255,255,0.10)] hover:bg-[#141a45]' : 'bg-white text-red-500 border-red-300 hover:bg-red-50'}`}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  )
}
