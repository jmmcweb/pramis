'use client'

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useDarkMode } from '@/app/staff/DarkModeContext'
import { now, addDays, toISO, fmtLong } from '@/src/lib/dateUtils'
import {
  notifyAppointment,
  registerWalkIn,
  searchPatientById,
  type PatientLookup,
} from '@/lib/actions/appointmentManagement'
import {
  advanceQueueEntry,
  markQueueDone,
  removeQueueEntry,
  type QueueEntry,
  type TodayQueues,
} from '@/lib/actions/queue'
import MedicalRecordModal from '@/components/ui/MedicalRecordModal'
import type { ScheduleAppointmentView } from '@/config/appointment'

const ARCHIVE_STATUS: Record<string, string> = {
  COMPLETED: 'Done',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
}

const serviceColors: Record<string, { bg: string; color: string }> = {
  consultation: { bg: '#E0F2FE', color: '#0369A1' },
  vaccin: { bg: '#E8EAF6', color: '#4E69D3' },
  dental: { bg: '#FEFCBF', color: '#975A16' },
}

function serviceStyle(name: string) {
  const t = name.toLowerCase()
  for (const [key, style] of Object.entries(serviceColors)) {
    if (t.includes(key)) return style
  }
  return { bg: '#F7FAFC', color: '#718096' }
}

const statusColors: Record<string, { bg: string; color: string }> = {
  Done: { bg: '#DCFCE7', color: '#16A34A' },
  Cancelled: { bg: '#FEE2E2', color: '#DC2626' },
  'No Show': { bg: '#FEF9C3', color: '#CA8A04' },
}

// Blank details collected when registering a NEW walk-in patient.
const EMPTY_NEW_INFO = {
  firstName: '',
  lastName: '',
  birthdate: '',
  sex: '',
  phoneNumber: '',
  houseNumber: '',
  barangay: '',
  city: '',
  province: '',
  zipCode: '',
  email: '',
}

function Card({ patient, notified, onNotify, darkMode, onViewRecord }: {
  patient: ScheduleAppointmentView
  notified: boolean
  onNotify: (a: ScheduleAppointmentView) => void
  darkMode: boolean
  onViewRecord: (a: ScheduleAppointmentView) => void
}) {
  const sc = serviceStyle(patient.serviceName)
  return (
    <div className={`${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} p-[22px] rounded-[18px] border ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(15,60,95,0.10)]'} ${darkMode ? 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]'} flex flex-col gap-[18px]`}>
      <div className="flex gap-[18px] items-center">
        <div className={`w-[72px] h-[72px] rounded-full flex-shrink-0 flex items-center justify-center text-[28px] bg-[#dedede] text-gray-600`}>
          {patient.patientName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-[24px] font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#111]'} leading-[1] m-0 truncate`} title={patient.patientName}>{patient.patientName}</h3>
          <p className={`mt-[6px] text-base font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#111]'}`}>{patient.id}</p>
          {patient.patientReference && (
            <p className={`mt-[2px] text-[13px] font-semibold ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}`}>Ref No: {patient.patientReference}</p>
          )}
          <p className={`mt-[4px] text-[15px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#555]'}`}>{patient.serviceName}</p>
        </div>
      </div>
      <span style={{ background: sc.bg, color: sc.color }} className="self-start inline-block px-3 py-1 rounded-full text-[12px] font-bold">{patient.serviceName}</span>
      <div className={`flex flex-col gap-1.5 ${darkMode ? 'bg-[#0f1438]' : 'bg-[#f8fbff]'} px-4 py-[14px] rounded-xl border ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(15,60,95,0.08)]'} shadow-[0_2px_4px_rgba(0,0,0,0.04)] mt-[10px]`}>
        <span className={`flex items-center gap-2 text-[16px] font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#111]'}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[16px] h-[16px] flex-shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          {patient.dateLabel}
        </span>
        <span className={`flex items-center gap-2 text-[16px] font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#111]'}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[16px] h-[16px] flex-shrink-0"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          {patient.timeLabel}
        </span>
      </div>
      <div className="flex justify-between gap-[18px]">
        <button
          className={`bg-transparent ${darkMode ? 'text-[#F9FAFB] border-white/30 hover:bg-white/10' : 'text-[#4E69D3] border-[#4E69D3] hover:bg-[#EEF0FB]'} px-4 py-2 rounded-md text-xs font-semibold cursor-pointer transition-colors`}
          onClick={() => onViewRecord(patient)}
        >{patient.hasMedicalRecord ? 'View/Edit Record' : 'Fill Record'}</button>
        <button
          className={`px-5 py-2.5 rounded-md text-sm font-semibold border-none cursor-pointer transition-colors ${notified ? 'bg-green-600 text-white' : 'bg-[#4E69D3] text-white hover:bg-[#3D56B8]'}`}
          onClick={() => onNotify(patient)}
        >
          {notified ? 'Sent!' : 'Notify'}
        </button>
      </div>
    </div>
  )
}

function ListCard({ patient, darkMode, onViewRecord }: { patient: ScheduleAppointmentView; darkMode: boolean; onViewRecord: (a: ScheduleAppointmentView) => void }) {
  const sc = serviceStyle(patient.serviceName)
  return (
    <div className={`${darkMode ? 'bg-[#0f1438]' : 'bg-[#f8fbff]'} border ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(15,60,95,0.08)]'} rounded-xl p-4 flex flex-col gap-2.5`}>
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[15px] bg-[#E8EAF6] text-[#4E69D3]`}>{patient.patientName.charAt(0)}</div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-[16px] font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#111]'} m-0 truncate`} title={patient.patientName}>{patient.patientName}</h4>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[13px] font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#111]'}`}>{patient.id}</span>
        {patient.patientReference && (
          <span className={`text-[12px] font-semibold ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}`}>Ref No: {patient.patientReference}</span>
        )}
      </div>
      <span style={{ background: sc.bg, color: sc.color }} className="self-start inline-block px-3 py-1 rounded-full text-[12px] font-bold">{patient.serviceName}</span>
      <div className={`flex flex-col gap-1 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} px-3 py-2 rounded-lg border ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-100'}`}>
        <span className={`flex items-center gap-2 text-[14px] font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#111]'}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[14px] h-[14px] flex-shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          {patient.dateLabel}
        </span>
        <span className={`flex items-center gap-2 text-[14px] font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#111]'}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[14px] h-[14px] flex-shrink-0"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          {patient.timeLabel}
        </span>
      </div>
      <button
        className={`self-end bg-transparent ${darkMode ? 'text-[#F9FAFB] border-white/30 hover:bg-white/10' : 'text-[#4E69D3] border-[#4E69D3] hover:bg-[#EEF0FB]'} px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors`}
        onClick={() => onViewRecord(patient)}
      >{patient.hasMedicalRecord ? 'View/Edit Record' : 'Fill Record'}</button>
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

export default function AppointmentManagementClient({
  todays,
  upcoming,
  archive,
  queues,
  services,
}: {
  todays: ScheduleAppointmentView[]
  upcoming: ScheduleAppointmentView[]
  archive: ScheduleAppointmentView[]
  queues: TodayQueues
  services: { id: string; title: string }[]
}) {
  const { darkMode } = useDarkMode()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [notified, setNotified] = useState(new Set<string>())
  const [showArchive, setShowArchive] = useState(false)
  const [showList, setShowList] = useState(false)
  const [selectedDate, setSelectedDate] = useState(toISO(addDays(now, -1)))
  const [listDate, setListDate] = useState(toISO(now))
  const [recordFor, setRecordFor] = useState<ScheduleAppointmentView | null>(null)

  // Walk-in modal state. Opens on NEW-patient mode (name + service; the
  // PTN-#### is generated on save). Existing-patient mode looks up a
  // PTN-#### and auto-fetches their details.
  const [showWalkIn, setShowWalkIn] = useState(false)
  const [walkInMode, setWalkInMode] = useState<'new' | 'existing'>('new')
  const [walkInSearch, setWalkInSearch] = useState('')
  const [patient, setPatient] = useState<PatientLookup | null>(null)
  const [searchState, setSearchState] = useState<'idle' | 'found' | 'notfound'>('idle')
  const [serviceId, setServiceId] = useState('')
  // Details collected when registering a NEW walk-in patient. A login
  // account is only generated when an email is entered.
  const [newInfo, setNewInfo] = useState({ ...EMPTY_NEW_INFO })
  // Shown after a successful registration — includes the generated login
  // credentials when an account was created.
  const [walkInResult, setWalkInResult] = useState<{
    patientId: string
    email?: string
    tempPassword?: string
  } | null>(null)

  const setNewField =
    (key: keyof typeof newInfo) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setNewInfo(prev => ({ ...prev, [key]: e.target.value }))
  // The exact input that produced the verified patient. Registration is only
  // allowed when this still matches what is typed, so a stale or partial
  // lookup can never be submitted.
  const [verifiedFor, setVerifiedFor] = useState('')
  const latestQuery = useRef('')

  const tomorrowISO = toISO(addDays(now, 1))
  const upcomingTomorrow = upcoming.filter(a => a.dateISO === tomorrowISO)
  const listAppointments = [...todays, ...upcoming]
  const archiveForDate = archive.filter(a => a.dateISO === selectedDate)

  // Auto-fetch the account as soon as an ID is typed in (existing-patient
  // mode only). Results for older input are discarded so the shown account
  // always matches the field.
  useEffect(() => {
    if (walkInMode !== 'existing') {
      latestQuery.current = ''
      return
    }
    const q = walkInSearch.trim()
    latestQuery.current = q
    if (!q) {
      setSearchState('idle')
      setPatient(null)
      setVerifiedFor('')
      return
    }
    const timer = setTimeout(() => {
      startTransition(async () => {
        const res = await searchPatientById(q)
        if (latestQuery.current !== q) return // stale response, ignore
        if (res.success && res.patient) {
          setPatient(res.patient)
          setVerifiedFor(q)
          setSearchState('found')
        } else {
          setPatient(null)
          setVerifiedFor('')
          setSearchState('notfound')
        }
      })
    }, 400)
    return () => clearTimeout(timer)
  }, [walkInSearch, walkInMode])

  const resetWalkIn = () => {
    setShowWalkIn(false)
    setWalkInMode('new')
    setWalkInSearch('')
    setPatient(null)
    setSearchState('idle')
    setServiceId('')
    setVerifiedFor('')
    setNewInfo({ ...EMPTY_NEW_INFO })
    setWalkInResult(null)
  }

  // Switching modes clears the other flow's inputs so a stale lookup or
  // name can never leak into the submitted form.
  const switchWalkInMode = (mode: 'new' | 'existing') => {
    if (mode === walkInMode) return
    setWalkInMode(mode)
    setWalkInSearch('')
    setPatient(null)
    setSearchState('idle')
    setVerifiedFor('')
    latestQuery.current = ''
    setNewInfo({ ...EMPTY_NEW_INFO })
  }

  // New-patient mode needs at least a name, birthday and sex (the PTN-####
  // is generated on save); existing-patient mode needs a verified lookup
  // matching the typed ID.
  const emailLooksValid =
    !newInfo.email.trim() || /^\S+@\S+\.\S+$/.test(newInfo.email.trim())
  const canSubmit =
    !!serviceId &&
    !isPending &&
    (walkInMode === 'new'
      ? newInfo.firstName.trim().length >= 2 &&
        newInfo.lastName.trim().length >= 2 &&
        !!newInfo.birthdate &&
        !!newInfo.sex &&
        emailLooksValid
      : !!patient && verifiedFor === walkInSearch.trim())

  const handleWalkInSubmit = () => {
    if (!canSubmit) return
    const fd = new FormData()
    if (walkInMode === 'existing' && patient && verifiedFor === walkInSearch.trim()) {
      fd.set('patientId', patient.patientId)
    } else {
      Object.entries(newInfo).forEach(([key, value]) => fd.set(key, value.trim()))
    }
    fd.set('serviceId', serviceId)
    startTransition(async () => {
      const res = await registerWalkIn(null, fd)
      if (res.success) {
        toast.success(res.message)
        router.refresh()
        // Show the result panel instead of closing — surfaces the generated
        // login credentials when an account was created.
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

  const notify = (a: ScheduleAppointmentView) => {
    if (isPending) return
    startTransition(async () => {
      const res = await notifyAppointment(a.id)
      if (res.success) {
        setNotified(prev => new Set(prev).add(a.id))
        toast.success(`Reminder sent to ${a.patientName}`)
        setTimeout(() => setNotified(prev => { const next = new Set(prev); next.delete(a.id); return next }), 3000)
      } else {
        toast.error(res.message)
      }
    })
  }

  // Queue actions for staff
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

  const advanceQueued = (entry: QueueEntry) => {
    if (entry.status === 'WAITING') {
      runAction(() => advanceQueueEntry(entry.id))
      return
    }
    if (isPending || entry.status !== 'IN_CONSULTATION') return
    runAction(() => markQueueDone(entry.id))
  }

  useEffect(() => {
    document.body.style.overflow = showArchive || recordFor !== null || showList || showWalkIn ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showArchive, recordFor, showList, showWalkIn])

  const fieldLabel = `block text-[13px] font-bold mb-1.5 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`
  const fieldInput = `w-full px-3.5 py-2.5 rounded-lg text-[15px] outline-none transition-colors border ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] placeholder-gray-500 border-[rgba(255,255,255,0.15)] focus:border-[#4E69D3]' : 'bg-white text-gray-800 placeholder-gray-400 border-gray-200 focus:border-[#4E69D3]'}`

  return (
    <div>
      <div className="flex items-center justify-between mb-[14px]">
        <h1 className={`text-[30px] sm:text-[38px] lg:text-[45px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'} my-0 text-left`}>Appointment Management</h1>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowWalkIn(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold border-none cursor-pointer transition-colors bg-green-600 text-white hover:bg-green-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            Walk-ins
          </button>
          <button
            onClick={() => setShowArchive(!showArchive)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold border-none cursor-pointer transition-colors bg-[#4E69D3] text-white hover:bg-[#3D56B8]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M21 8v13H3V8" /><path d="M1 3h22v5H1z" /><line x1="10" y1="12" x2="14" y2="12" />
            </svg>
            Appointments Archive
          </button>
        </div>
      </div>

      {/* Queueing Section - Only today's appointments */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-7">
        {/* Priority lane - Only displays Senior Citizens & PWD patients */}
        <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.08)]'} border p-4 rounded-[24px] ${darkMode ? 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]'}`}>
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
                    item={q}
                    busy={isPending}
                    onAdvance={() => advanceQueued(q)}
                    onRemove={() => runAction(() => removeQueueEntry(q.id))}
                  />
                ))
            )}
          </div>
        </div>

        {/* Walk-in lane */}
        <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.08)]'} border p-4 rounded-[24px] ${darkMode ? 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]'}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className={`font-poppins text-[18px] font-bold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Walk-in Queue</h2>
              <p className={`text-[12px] font-semibold m-0 mt-0.5 text-gray-400`}>General walk-in patients</p>
            </div>
            <span className={`text-[13px] font-bold px-3 py-1.5 rounded-full ${darkMode ? 'bg-[#0f1438] text-blue-300' : 'bg-blue-500/20 text-blue-600'}`}>{queues.walkins.filter(q => q.status !== 'DONE').length} in walk-in queue</span>
          </div>
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            {queues.walkins.length === 0 ? (
              <p className={`text-sm font-semibold text-center m-0 py-8 text-gray-400`}>No walk-in patients in queue</p>
            ) : (
              queues.walkins.map(q => (
                <QueueRow
                  key={q.id}
                  darkMode={darkMode}
                  item={q}
                  busy={isPending}
                  onAdvance={() => advanceQueued(q)}
                  onRemove={() => runAction(() => removeQueueEntry(q.id))}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Archive browser */}
      {showArchive && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-start z-[1000] p-3 sm:p-4 lg:p-10 overflow-y-auto">
          <div className={`${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-2xl w-full max-w-[960px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex flex-col max-h-[90vh]`} onClick={e => e.stopPropagation()}>
            <div className={`flex justify-between items-center px-7 py-5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} border-b sticky top-0 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-t-2xl z-10`}>
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0`}>Archive Appointments</h2>
              <button className={`w-9 h-9 border-none ${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'} rounded-full text-xl ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'} cursor-pointer flex items-center justify-center hover:bg-red-500 hover:text-white transition-all`} onClick={() => setShowArchive(false)}>&times;</button>
            </div>

            <div className={`flex items-center justify-center gap-3 px-7 pt-5 pb-3 ${darkMode ? 'border-b border-[rgba(255,255,255,0.10)]' : 'border-b border-gray-200'}`}>
              <button onClick={() => {
                const d = new Date(selectedDate + 'T12:00:00')
                d.setDate(d.getDate() - 1)
                setSelectedDate(d.toISOString().split('T')[0])
              }} className={`bg-transparent border-none cursor-pointer p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-[#3d2768] text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <button onClick={() => (document.getElementById('archive-date-picker') as HTMLInputElement)?.showPicker()} className="flex flex-col items-center min-w-[180px] bg-transparent border-none cursor-pointer">
                <span className={`text-base font-bold leading-tight ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} hover:opacity-70 transition-opacity`}>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                <span className={`text-[11px] font-medium text-gray-400`}>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
                </span>
              </button>
              <input id="archive-date-picker" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-0 h-0 p-0 border-none opacity-0" />
              <button onClick={() => {
                const d = new Date(selectedDate + 'T12:00:00')
                d.setDate(d.getDate() + 1)
                setSelectedDate(d.toISOString().split('T')[0])
              }} className={`bg-transparent border-none cursor-pointer p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-[#3d2768] text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>

            <div className="px-7 py-6 overflow-y-auto flex-1 max-h-[70vh]">
              {archiveForDate.length === 0 ? (
                <p className={`text-center py-10 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No archived appointments found for this date.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[640px]" style={{ tableLayout: 'fixed' }}>
                    <thead>
                      <tr className={`${darkMode ? 'bg-[#0f1438]' : 'bg-[#ddd6fe]'}`}>
                        <th className={`px-6 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[15px] uppercase tracking-[0.5px] font-poppins border-b w-[34%]`}>Patient Name</th>
                        <th className={`px-6 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[15px] uppercase tracking-[0.5px] font-poppins border-b w-[18%]`}>ID</th>
                        <th className={`px-6 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[15px] uppercase tracking-[0.5px] font-poppins border-b w-[18%]`}>Service</th>
                        <th className={`px-6 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[15px] uppercase tracking-[0.5px] font-poppins border-b w-[16%]`}>Time</th>
                        <th className={`px-6 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[15px] uppercase tracking-[0.5px] font-poppins border-b w-[14%]`}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archiveForDate.map(p => {
                        const label = ARCHIVE_STATUS[p.status] ?? p.status
                        const st = statusColors[label] ?? { bg: '#F7FAFC', color: '#718096' }
                        return (
                          <tr key={p.id} className={`${darkMode ? 'hover:bg-[#0f1438]' : 'hover:bg-[#E8EAF6]'}`}>
                            <td className={`px-6 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${darkMode ? 'bg-[#0f1438] text-blue-300' : 'bg-[#E8EAF6] text-[#4E69D3]'}`}>{p.patientName.charAt(0)}</div>
                                <span className="text-[15px] truncate" title={p.patientName}>{p.patientName}</span>
                              </div>
                            </td>
                            <td className={`px-6 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b text-[15px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{p.id}</td>
                            <td className={`px-6 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b text-[15px] whitespace-nowrap ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{p.serviceName}</td>
                            <td className={`px-6 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b text-[15px] whitespace-nowrap ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{p.timeLabel}</td>
                            <td className={`px-6 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b`}>
                              <span style={{ background: st.bg, color: st.color }} className="inline-block px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap">{label}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className={`flex justify-end gap-3 px-7 py-4 border-t ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} sticky bottom-0 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-b-2xl`}>
              <button className={`px-6 py-2.5 rounded-lg border-none text-sm font-semibold cursor-pointer transition-colors ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] hover:bg-[#1a2050]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} onClick={() => setShowArchive(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* List of appointees */}
      {showList && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-start z-[1000] p-3 sm:p-4 lg:p-10 overflow-y-auto">
          <div className={`${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-2xl w-full max-w-[1000px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex flex-col max-h-[90vh]`} onClick={e => e.stopPropagation()}>
            <div className={`flex justify-between items-center px-7 py-5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} border-b sticky top-0 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-t-2xl z-10`}>
              <div>
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0`}>List of Appointees</h2>
                <p className={`text-[12px] m-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{listAppointments.length} scheduled appointment(s)</p>
              </div>
              <button className={`w-9 h-9 border-none ${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'} rounded-full text-xl ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'} cursor-pointer flex items-center justify-center hover:bg-red-500 hover:text-white transition-all`} onClick={() => setShowList(false)}>&times;</button>
            </div>

            <div className={`flex items-center justify-center gap-3 px-7 pt-5 pb-3 ${darkMode ? 'border-b border-[rgba(255,255,255,0.10)]' : 'border-b border-gray-200'}`}>
              <button onClick={() => {
                const d = new Date(listDate + 'T12:00:00')
                d.setDate(d.getDate() - 1)
                setListDate(d.toISOString().split('T')[0])
              }} className={`bg-transparent border-none cursor-pointer p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-[#3d2768] text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <button onClick={() => (document.getElementById('list-date-picker') as HTMLInputElement)?.showPicker()} className="flex flex-col items-center min-w-[180px] bg-transparent border-none cursor-pointer">
                <span className={`text-base font-bold leading-tight ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} hover:opacity-70 transition-opacity`}>
                  {new Date(listDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                <span className={`text-[11px] font-medium text-gray-400`}>
                  {new Date(listDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
                </span>
              </button>
              <input id="list-date-picker" type="date" value={listDate} onChange={e => setListDate(e.target.value)} className="w-0 h-0 p-0 border-none opacity-0" />
              <button onClick={() => {
                const d = new Date(listDate + 'T12:00:00')
                d.setDate(d.getDate() + 1)
                setListDate(d.toISOString().split('T')[0])
              }} className={`bg-transparent border-none cursor-pointer p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-[#3d2768] text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>

            <div className="px-7 py-6 overflow-y-auto flex-1 max-h-[70vh]">
              {listAppointments.filter(p => p.dateISO === listDate).length === 0 ? (
                <p className={`text-center py-10 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No appointments scheduled for this date.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 max-[768px]:grid-cols-1">
                  {listAppointments.filter(p => p.dateISO === listDate).map(p => (
                    <ListCard key={p.id} patient={p} darkMode={darkMode} onViewRecord={setRecordFor} />
                  ))}
                </div>
              )}
            </div>

            <div className={`flex justify-end gap-3 px-7 py-4 border-t ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} sticky bottom-0 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-b-2xl`}>
              <button className={`px-6 py-2.5 rounded-lg border-none text-sm font-semibold cursor-pointer transition-colors ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] hover:bg-[#1a2050]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} onClick={() => setShowList(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Today's Schedule */}
      <div className={`${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} border ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(15,60,95,0.08)]'} p-4 rounded-[24px] mb-7 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]`}>
        <h2 className={`text-[26px] sm:text-[32px] lg:text-[40px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'} m-0 mb-[18px] text-center`}>Today's Schedule</h2>
        {todays.length === 0 ? (
          <p className={`text-center py-10 text-[15px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No appointments scheduled for today yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-[22px] max-[1100px]:grid-cols-2 max-[768px]:grid-cols-1">
            {todays.map(p => (
              <Card key={p.id} patient={p} notified={notified.has(p.id)} onNotify={notify} darkMode={darkMode} onViewRecord={setRecordFor} />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Appointments */}
      <div className={`${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} border ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(15,60,95,0.08)]'} p-4 rounded-[24px] mb-7 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]`}>
        <h2 className={`text-[26px] sm:text-[32px] lg:text-[40px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'} m-0 mb-[18px] text-center`}>Upcoming Appointments</h2>
        <p className={`text-center text-[15px] m-0 -mt-3 mb-[18px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{fmtLong(addDays(now, 1))}</p>
        {upcomingTomorrow.length === 0 ? (
          <p className={`text-center py-10 text-[15px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No appointments scheduled for tomorrow.</p>
        ) : (
          <div className="grid grid-cols-3 gap-[22px] max-[1100px]:grid-cols-2 max-[768px]:grid-cols-1">
            {upcomingTomorrow.map(p => (
              <Card key={p.id} patient={p} notified={notified.has(p.id)} onNotify={notify} darkMode={darkMode} onViewRecord={setRecordFor} />
            ))}
          </div>
        )}
        <div className="flex justify-center mt-3">
          <button onClick={() => { setListDate(toISO(now)); setShowList(true) }} className="bg-[#4E69D3] text-white px-5 py-2.5 rounded-full border-none cursor-pointer hover:bg-[#3D56B8] transition-colors">View List of Appointees</button>
        </div>
      </div>

      {/* Post-consultation medical info form (also completes the visit). */}
      {recordFor && (
        <MedicalRecordModal
          appointment={recordFor}
          darkMode={darkMode}
          onClose={() => setRecordFor(null)}
        />
      )}

      {/* Walk-in registration: patient ID auto-fetches, pick a service. */}
      {showWalkIn && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-start z-[1000] p-3 sm:p-4 lg:p-10 overflow-y-auto">
          <div className={`${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-2xl w-full max-w-[560px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex flex-col max-h-[90vh]`} onClick={e => e.stopPropagation()}>
            <div className={`flex justify-between items-center px-7 py-5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} border-b sticky top-0 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-t-2xl z-10`}>
              <div>
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0`}>Register Walk-in</h2>
                <p className={`text-[12px] m-0 mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>New patients get an auto-generated ID — or look up an existing patient</p>
              </div>
              <button className={`w-9 h-9 border-none ${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'} rounded-full text-xl ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'} cursor-pointer flex items-center justify-center hover:bg-red-500 hover:text-white transition-all`} onClick={resetWalkIn}>&times;</button>
            </div>

            <div className="px-7 py-6 overflow-y-auto flex-1 flex flex-col gap-5">
              {/* Mode toggle — the modal always opens on New Patient */}
              <div className={`flex gap-1 p-1 rounded-xl border ${darkMode ? 'bg-[#0f1438] border-[rgba(255,255,255,0.10)]' : 'bg-[#f8fbff] border-[rgba(15,60,95,0.08)]'}`}>
                <button
                  onClick={() => switchWalkInMode('new')}
                  className={`flex-1 px-4 py-2 rounded-lg text-[13px] font-bold border-none cursor-pointer transition-colors ${walkInMode === 'new' ? 'bg-[#4E69D3] text-white shadow-[0_2px_6px_rgba(78,105,211,0.35)]' : darkMode ? 'bg-transparent text-gray-400 hover:text-[#F9FAFB]' : 'bg-transparent text-gray-500 hover:text-[#2A2E43]'}`}
                >New Patient</button>
                <button
                  onClick={() => switchWalkInMode('existing')}
                  className={`flex-1 px-4 py-2 rounded-lg text-[13px] font-bold border-none cursor-pointer transition-colors ${walkInMode === 'existing' ? 'bg-[#4E69D3] text-white shadow-[0_2px_6px_rgba(78,105,211,0.35)]' : darkMode ? 'bg-transparent text-gray-400 hover:text-[#F9FAFB]' : 'bg-transparent text-gray-500 hover:text-[#2A2E43]'}`}
                >Existing Patient</button>
              </div>

              {walkInResult ? (
                /* Success panel — surfaces the generated login credentials */
                <div className="flex flex-col items-center text-center gap-2 py-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6 text-green-600"><polyline points="20 6 9 17 4 12" /></svg>
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
              ) : walkInMode === 'new' ? (
                /* New patient: collect their details — PTN-#### auto-generated */
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
                    <div>
                      <label htmlFor="wi-first" className={fieldLabel}>First Name *</label>
                      <input id="wi-first" value={newInfo.firstName} onChange={setNewField('firstName')} placeholder="Juan" autoFocus className={fieldInput} />
                    </div>
                    <div>
                      <label htmlFor="wi-last" className={fieldLabel}>Last Name *</label>
                      <input id="wi-last" value={newInfo.lastName} onChange={setNewField('lastName')} placeholder="Dela Cruz" className={fieldInput} />
                    </div>
                    <div>
                      <label htmlFor="wi-birth" className={fieldLabel}>Birthday *</label>
                      <input id="wi-birth" type="date" value={newInfo.birthdate} onChange={setNewField('birthdate')} max={toISO(now)} className={fieldInput} />
                    </div>
                    <div>
                      <label htmlFor="wi-sex" className={fieldLabel}>Sex *</label>
                      <select id="wi-sex" value={newInfo.sex} onChange={setNewField('sex')} className={`${fieldInput} cursor-pointer`}>
                        <option value="" disabled>Select sex</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="wi-mobile" className={fieldLabel}>Mobile Number</label>
                      <input id="wi-mobile" value={newInfo.phoneNumber} onChange={setNewField('phoneNumber')} placeholder="0917 123 4567" className={fieldInput} />
                    </div>
                    <div>
                      <label htmlFor="wi-email" className={fieldLabel}>Email (optional)</label>
                      <input id="wi-email" type="email" value={newInfo.email} onChange={setNewField('email')} placeholder="Creates a login account" className={fieldInput} />
                    </div>
                    <div>
                      <label htmlFor="wi-house" className={fieldLabel}>House / Street</label>
                      <input id="wi-house" value={newInfo.houseNumber} onChange={setNewField('houseNumber')} placeholder="123 Rizal St." className={fieldInput} />
                    </div>
                    <div>
                      <label htmlFor="wi-barangay" className={fieldLabel}>Barangay</label>
                      <input id="wi-barangay" value={newInfo.barangay} onChange={setNewField('barangay')} placeholder="Barangay" className={fieldInput} />
                    </div>
                    <div>
                      <label htmlFor="wi-city" className={fieldLabel}>City / Municipality</label>
                      <input id="wi-city" value={newInfo.city} onChange={setNewField('city')} placeholder="City" className={fieldInput} />
                    </div>
                    <div>
                      <label htmlFor="wi-province" className={fieldLabel}>Province</label>
                      <input id="wi-province" value={newInfo.province} onChange={setNewField('province')} placeholder="Province" className={fieldInput} />
                    </div>
                    <div>
                      <label htmlFor="wi-zip" className={fieldLabel}>Zip Code</label>
                      <input id="wi-zip" value={newInfo.zipCode} onChange={setNewField('zipCode')} placeholder="Zip code" className={fieldInput} />
                    </div>
                  </div>
                  <p className={`m-0 text-[13px] font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    A new patient ID (PTN-####) will be generated automatically on save{newInfo.email.trim() ? ', along with a login account' : ''}.
                  </p>
                </div>
              ) : (
                /* Existing patient: ID auto-fetches their details */
                <div>
                  <label htmlFor="walkin-id" className={`block text-[13px] font-bold mb-1.5 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Patient ID *</label>
                  <input
                    id="walkin-id"
                    value={walkInSearch}
                    onChange={e => setWalkInSearch(e.target.value)}
                    placeholder="Patient ID (e.g., PTN-1002)"
                    autoFocus
                    className={`w-full px-3.5 py-2.5 rounded-lg text-[15px] outline-none transition-colors border ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] placeholder-gray-500 border-[rgba(255,255,255,0.15)] focus:border-[#4E69D3]' : 'bg-white text-gray-800 placeholder-gray-400 border-gray-200 focus:border-[#4E69D3]'}`}
                  />
                  {isPending && walkInSearch.trim() && (
                    <p className={`m-0 mt-2 text-[13px] font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Fetching patient details…</p>
                  )}
                  {!isPending && searchState === 'found' && patient && (
                    <div className={`mt-2.5 rounded-xl border p-3.5 ${darkMode ? 'bg-[#0f1438] border-green-500/30' : 'bg-[#F0FDF4] border-green-200'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[15px] bg-[#E8EAF6] text-[#4E69D3]`}>
                          {patient.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`m-0 text-[15px] font-bold truncate ${darkMode ? 'text-[#F9FAFB]' : 'text-[#166534]'}`}>{patient.name}</p>
                          <p className={`m-0 text-[13px] font-semibold ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}`}>
                            {patient.patientId}
                            {patient.hasAccount ? '' : ' \u00B7 No account'}
                            {patient.barangay ? ` \u00B7 ${patient.barangay}` : ''}
                          </p>
                        </div>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5 flex-shrink-0 text-green-600"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                    </div>
                  )}
                  {!isPending && searchState === 'notfound' && (
                    <div className="mt-2">
                      <p className={`m-0 mb-1.5 text-[13px] font-semibold text-amber-500`}>
                        {`No patient found for "${walkInSearch.trim()}".`}
                      </p>
                      <button
                        onClick={() => switchWalkInMode('new')}
                        className="p-0 bg-transparent border-none cursor-pointer text-[13px] font-bold text-[#4E69D3] hover:underline"
                      >Register as a new patient instead &rarr;</button>
                    </div>
                  )}
                </div>
              )}

              {/* Service only — no time slot for walk-ins */}
              <div>
                <label htmlFor="walkin-service" className={`block text-[13px] font-bold mb-1.5 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Type of Service *</label>
                <select
                  id="walkin-service"
                  value={serviceId}
                  onChange={e => setServiceId(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-lg text-[15px] outline-none transition-colors cursor-pointer border ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] border-[rgba(255,255,255,0.15)] focus:border-[#4E69D3]' : 'bg-white text-gray-800 border-gray-200 focus:border-[#4E69D3]'}`}
                >
                  <option value="" disabled>Select service</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
            </div>

            <div className={`flex justify-end gap-3 px-7 py-4 border-t ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} sticky bottom-0 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-b-2xl`}>
              {walkInResult ? (
                <button className={`px-6 py-2.5 rounded-lg border-none text-sm font-semibold cursor-pointer transition-colors ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] hover:bg-[#1a2050]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} onClick={resetWalkIn}>Close</button>
              ) : (
                <>
                  <button disabled={isPending} className={`px-6 py-2.5 rounded-lg border-none text-sm font-semibold cursor-pointer transition-colors disabled:opacity-50 ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] hover:bg-[#1a2050]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} onClick={resetWalkIn}>Cancel</button>
                  <button
                    disabled={!canSubmit}
                    onClick={handleWalkInSubmit}
                    className="px-6 py-2.5 rounded-lg border-none text-sm font-semibold cursor-pointer transition-colors bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >{isPending ? 'Registering…' : 'Register Walk-in'}</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}