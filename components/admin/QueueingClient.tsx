'use client'

import { useState, useTransition } from 'react'
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
  searchPatientById,
  type PatientLookup,
} from '@/lib/actions/appointmentManagement'
import MedicalRecordModal from '@/components/ui/MedicalRecordModal'
import type { ScheduleAppointmentView } from '@/config/appointment'

type Lane = 'WALKIN' | 'PRIORITY'

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
  const [searchState, setSearchState] = useState<'idle' | 'found' | 'notfound'>('idle')

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

  const handleSearch = () => {
    const q = search.trim()
    if (!q || isPending) return
    startTransition(async () => {
      const res = await searchPatientById(q)
      if (res.success && res.patient) {
        setPatient(res.patient)
        setSearchState('found')
        // Auto-detect from DB: senior (60+) or PWD (profile.isPwd) go PRIORITY.
        if (res.patient.isSenior) {
          setLane('PRIORITY')
          setPriority('SENIOR')
          setIsPwd(false)
        } else if ((res.patient as any).isPwd) {
          setLane('PRIORITY')
          setPriority('PWD')
          setIsPwd(true)
        } else {
          // Reset to walk-in if not senior/PWD
          setLane('WALKIN')
          setIsPwd(false)
        }
      } else {
        setPatient(null)
        setSearchState('notfound')
      }
    })
  }

  const resetAdd = () => {
    setShowAdd(false)
    setLane('WALKIN')
    setPriority('SENIOR')
    setIsPwd(false)
    setServiceId('')
    setSearch('')
    setPatient(null)
    setSearchState('idle')
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
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0`}>Add Patient to Queue</h2>
              <button className={`w-9 h-9 border-none ${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'} rounded-full text-xl ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'} cursor-pointer flex items-center justify-center hover:bg-red-500 hover:text-white transition-all`} onClick={resetAdd}>&times;</button>
            </div>

            <div className="px-7 py-6 overflow-y-auto flex-1">
              {/* Verify patient */}
              <p className={`m-0 mb-2 text-[13px] font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>1. Verify patient ID</p>
              <div className="flex gap-3 mb-2">
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setSearchState('idle'); setPatient(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
                  placeholder="Patient ID (e.g., PTN-1002)"
                  className={`flex-1 min-w-0 px-3.5 py-2.5 rounded-lg text-[15px] outline-none transition-colors border ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] placeholder-gray-500 border-[rgba(255,255,255,0.15)] focus:border-[#4E69D3]' : 'bg-white text-gray-800 placeholder-gray-400 border-gray-200 focus:border-[#4E69D3]'}`}
                />
                <button onClick={handleSearch} disabled={isPending} className="px-6 py-2.5 rounded-lg border-none text-sm font-semibold cursor-pointer transition-colors bg-[#4E69D3] text-white hover:bg-[#3D56B8] whitespace-nowrap disabled:opacity-50">{isPending ? 'Searching…' : 'Verify'}</button>
              </div>
              {searchState === 'found' && patient && (
                <div className={`rounded-xl border p-3.5 mb-4 ${darkMode ? 'bg-[#0f1438] border-green-500/30' : 'bg-[#F0FDF4] border-green-200'}`}>
                  <span className={`text-[15px] font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#166534]'}`}>{patient.name || patient.patientId}</span>
                  <span className={`ml-2 text-[13px] font-semibold ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}`}>{patient.patientId}{patient.hasAccount ? '' : ' \u00B7 No account'}</span>
                </div>
              )}
              {searchState === 'notfound' && (
                <p className={`m-0 mb-4 text-[13px] font-semibold text-red-500`}>No patient found for that ID.</p>
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

              {/* Service */}
              <p className={`m-0 mb-2 text-[13px] font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>3. Service (optional)</p>
              <select
                value={serviceId}
                onChange={e => setServiceId(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-lg text-[15px] outline-none transition-colors cursor-pointer border ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] border-[rgba(255,255,255,0.15)] focus:border-[#4E69D3]' : 'bg-white text-gray-800 border-gray-200 focus:border-[#4E69D3]'}`}
              >
                <option value="">Unspecified / Triage on arrival</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>

            <div className={`flex justify-end gap-3 px-7 py-4 border-t ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} sticky bottom-0 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-b-2xl`}>
              <button disabled={isPending} className={`px-6 py-2.5 rounded-lg border-none text-sm font-semibold cursor-pointer transition-colors disabled:opacity-50 ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] hover:bg-[#1a2050]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} onClick={resetAdd}>Cancel</button>
              <button
                disabled={!patient || isPending}
                onClick={submitAdd}
                className="px-6 py-2.5 rounded-lg border-none text-sm font-semibold cursor-pointer transition-colors bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >{isPending ? 'Adding…' : 'Add to Queue'}</button>
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