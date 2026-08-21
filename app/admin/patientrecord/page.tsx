'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useDarkMode } from '@/app/admin/DarkModeContext'

type QueueItem = { id: number; name: string; time: string; service: string; status: 'Waiting' | 'In Consultation' | 'Done'; priority?: 'senior' | 'pwd' }

export default function PatientRecordPage() {
  const { darkMode } = useDarkMode()

  const [scheduledQueue, setScheduledQueue] = useState<QueueItem[]>([
    { id: 1, name: 'Maria Santos', time: '8:00 AM', service: 'Consultation', status: 'Waiting' },
    { id: 2, name: 'Juan Dela Cruz', time: '8:30 AM', service: 'Vaccination', status: 'Waiting' },
    { id: 3, name: 'Ana Reyes', time: '9:00 AM', service: 'Maternal Care', status: 'Waiting' },
    { id: 4, name: 'Pedro Garcia', time: '9:30 AM', service: 'Consultation', status: 'Waiting' },
    { id: 5, name: 'Liza Fernandez', time: '10:00 AM', service: 'Dental', status: 'Waiting' },
    { id: 6, name: 'Carlos Mendoza', time: '10:30 AM', service: 'Screening', status: 'Waiting' },
  ])
  const [walkInQueue, setWalkInQueue] = useState<QueueItem[]>([
    { id: 101, name: 'Rosa Lim', time: '7:45 AM', service: 'Consultation', status: 'Waiting' },
    { id: 102, name: 'Mark Villanueva', time: '8:10 AM', service: 'Vaccination', status: 'Waiting' },
    { id: 103, name: 'Grace Aquino', time: '8:25 AM', service: 'Family Planning', status: 'Waiting' },
  ])
  const [priorityQueue, setPriorityQueue] = useState<QueueItem[]>([
    { id: 201, name: 'Alfredo Cruz', time: '8:15 AM', service: 'Consultation', status: 'Waiting', priority: 'senior' },
    { id: 202, name: 'Teresa Ramos', time: '8:45 AM', service: 'Vaccination', status: 'Waiting', priority: 'pwd' },
    { id: 203, name: 'Rodolfo Mendoza', time: '9:15 AM', service: 'Blood Pressure Monitoring', status: 'Waiting', priority: 'senior' },
    { id: 204, name: 'Nena Villar', time: '9:45 AM', service: 'Consultation', status: 'Waiting', priority: 'pwd' },
  ])

  const advanceStatus = (s: QueueItem['status']): QueueItem['status'] => s === 'Waiting' ? 'In Consultation' : 'Done'

  return (
    <div>
      <h1 className={`text-[30px] sm:text-[38px] lg:text-[45px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'} my-0 text-left mb-[14px]`}>Queueing</h1>

      <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.08)]'} border p-4 rounded-[24px] ${darkMode ? 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]'} mb-4`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className={`font-poppins text-[18px] font-bold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Priority Queue</h2>
            <p className={`text-[12px] font-semibold m-0 mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>Senior Citizens &amp; Persons with Disabilities</p>
          </div>
          <span className={`text-[13px] font-bold px-3 py-1.5 rounded-full ${darkMode ? 'bg-[#0f1438] text-amber-300' : 'bg-amber-500/20 text-amber-600'}`}>{priorityQueue.filter(q => q.status !== 'Done').length} in priority queue</span>
        </div>
        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
          {priorityQueue.length === 0 ? (
            <p className={`text-sm font-semibold text-center m-0 py-8 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>No priority patients in queue</p>
          ) : (
            priorityQueue.map(q => (
              <QueueRow key={q.id} darkMode={darkMode} item={q} onAdvance={() => setPriorityQueue(prev => prev.map(x => x.id === q.id ? { ...x, status: advanceStatus(x.status) } : x))} onRemove={() => { setPriorityQueue(prev => prev.filter(x => x.id !== q.id)); toast.success('Removed from queue') }} />
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.08)]'} border p-4 rounded-[24px] ${darkMode ? 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]'}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className={`font-poppins text-[18px] font-bold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Today&rsquo;s Schedule</h2>
              <p className={`text-[12px] font-semibold m-0 mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <span className={`text-[13px] font-bold px-3 py-1.5 rounded-full ${darkMode ? 'bg-[#0f1438] text-blue-300' : 'bg-[#E8EAF6] text-[#4E69D3]'}`}>{scheduledQueue.filter(q => q.status !== 'Done').length} in queue</span>
          </div>
          <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
            {scheduledQueue.length === 0 ? (
              <p className={`text-sm font-semibold text-center m-0 py-8 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>No scheduled patients today</p>
            ) : (
              scheduledQueue.map(q => (
                <QueueRow key={q.id} darkMode={darkMode} item={q} onAdvance={() => setScheduledQueue(prev => prev.map(x => x.id === q.id ? { ...x, status: advanceStatus(x.status) } : x))} onRemove={() => { setScheduledQueue(prev => prev.filter(x => x.id !== q.id)); toast.success('Removed from queue') }} />
              ))
            )}
          </div>
        </div>

        <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.08)]'} border p-4 rounded-[24px] ${darkMode ? 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]'}`}>
          <div className="mb-3">
            <h2 className={`font-poppins text-[18px] font-bold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Walk-ins</h2>
            <p className={`text-[12px] font-semibold m-0 mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>Patients without appointment</p>
          </div>
          <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
            {walkInQueue.length === 0 ? (
              <p className={`text-sm font-semibold text-center m-0 py-8 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>No walk-ins yet</p>
            ) : (
              walkInQueue.map(q => (
                <QueueRow key={q.id} darkMode={darkMode} item={q} onAdvance={() => setWalkInQueue(prev => prev.map(x => x.id === q.id ? { ...x, status: advanceStatus(x.status) } : x))} onRemove={() => { setWalkInQueue(prev => prev.filter(x => x.id !== q.id)); toast.success('Removed from queue') }} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function QueueRow({ darkMode, item, onAdvance, onRemove }: { darkMode: boolean; item: QueueItem; onAdvance: () => void; onRemove: () => void }) {
  const statusStyle = item.status === 'Done'
    ? (darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-500/20 text-green-600')
    : item.status === 'In Consultation'
      ? (darkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-[#E8EAF6] text-[#4E69D3]')
      : (darkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-500/20 text-amber-600')
  const priorityBadge = item.priority === 'senior'
    ? (darkMode ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-500/10 text-rose-600')
    : item.priority === 'pwd'
      ? (darkMode ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-500/10 text-violet-600')
      : null
  const avatarClass = item.priority
    ? (darkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-500/15 text-amber-600')
    : item.status === 'Done'
      ? 'bg-green-500/20 text-green-500'
      : darkMode ? 'bg-[#2d1b4e] text-blue-300' : 'bg-[#E8EAF6] text-[#4E69D3]'
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${item.status === 'Done' ? 'opacity-60' : ''} ${item.priority ? (darkMode ? 'border-amber-500/30' : 'border-amber-200') : ''} ${darkMode ? 'bg-[#0f1438] border-[rgba(255,255,255,0.10)]' : 'bg-white border-gray-100'}`}>
      <span className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${avatarClass}`}>{item.name.charAt(0)}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`text-[16px] font-poppins font-semibold truncate ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{item.name}</span>
          {priorityBadge && <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${priorityBadge}`}>{item.priority === 'senior' ? 'Senior' : 'PWD'}</span>}
        </div>
        <div className={`text-[14px] font-semibold truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.time} &middot; {item.service}</div>
      </div>
      <span className={`text-[13px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${statusStyle}`}>{item.status}</span>
      {item.status !== 'Done' && (
        <button onClick={onAdvance} title={item.status === 'Waiting' ? 'Start consultation' : 'Mark as done'} className={`w-8 h-8 rounded-lg cursor-pointer border transition-all flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-[#2d1b4e] text-[#4E9FFF] border-[rgba(255,255,255,0.10)] hover:bg-[#141a45]' : 'bg-white text-[#4E69D3] border-[#4E69D3] hover:bg-[#E8EAF6]'}`}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
      )}
      <button onClick={onRemove} title="Remove from queue" className={`w-8 h-8 rounded-lg cursor-pointer border transition-all flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-[#2d1b4e] text-red-400 border-[rgba(255,255,255,0.10)] hover:bg-[#141a45]' : 'bg-white text-red-500 border-red-300 hover:bg-red-50'}`}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  )
}
