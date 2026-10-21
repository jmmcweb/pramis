'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { getServices, getServiceStaffAvailability, setStaffDayAvailability } from '@/lib/actions/service'
import { useSession } from 'next-auth/react'

function todayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function StaffAvailabilityManager({ darkMode }: { darkMode: boolean }) {
  const { data: session } = useSession()
  const staffId = (session?.user as any)?.id as string | undefined
  const [services, setServices] = useState<{ id?: string; title: string }[]>([])
  const [serviceId, setServiceId] = useState('')
  const [dateISO, setDateISO] = useState(todayISO())
  const [status, setStatus] = useState<Record<string, 'AVAILABLE' | 'OFF'>>({})
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let live = true
    getServices().then((res: any) => {
      if (!live) return
      const list = (res.services ?? []).map((s: any) => ({ id: s.id, title: s.title }))
      setServices(list)
      if (list.length > 0) setServiceId((cur) => cur || list[0].id || '')
    })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    if (!serviceId || !staffId) return
    let live = true
    getServiceStaffAvailability(serviceId).then((res) => {
      if (live && res.success) setStatus(res.availability[staffId] ?? {})
    })
    return () => {
      live = false
    }
  }, [serviceId, staffId])

  const setDay = (next: 'AVAILABLE' | 'OFF' | 'CLEAR') => {
    if (!serviceId || !staffId || !dateISO) {
      toast.error('Pick a service and date first.')
      return
    }
    startTransition(async () => {
      const res = await setStaffDayAvailability({ serviceId, staffId, dateISO, status: next })
      if (!res.success) {
        toast.error(res.message)
        return
      }
      toast.success(next === 'OFF' ? 'You are OFF that date — appointment slots shrink.' : 'Availability updated — slots restored.')
      const items = await getServiceStaffAvailability(serviceId)
      if (items.success) setStatus(items.availability[staffId] ?? {})
    })
  }

  const selectClass = `w-full px-3.5 py-2.5 rounded-lg text-[15px] outline-none border cursor-pointer ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)]' : 'bg-white text-gray-800 border-gray-200'}`
  const inputClass = `w-full px-3.5 py-2.5 rounded-lg text-[15px] outline-none border ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)]' : 'bg-white text-gray-800 border-gray-200'}`
  const current = status[dateISO]

  return (
    <div className={`rounded-2xl border p-5 sm:p-6 shadow-sm ${darkMode ? 'bg-[#171a3d] border-white/[0.08]' : 'bg-white border-gray-200/80'}`}>
      <h2 className={`text-lg sm:text-xl font-bold ${darkMode ? 'text-white' : 'text-[#1D4662]'}`}>My Availability</h2>
      <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        Mark yourself OFF and patient appointment slots for that date shrink automatically.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <label className="flex flex-col gap-1.5">
          <span className={`text-[12px] font-semibold uppercase tracking-[0.5px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Service</span>
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={selectClass}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={`text-[12px] font-semibold uppercase tracking-[0.5px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Date</span>
          <input type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} className={inputClass} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <button disabled={isPending} onClick={() => setDay('AVAILABLE')} className="px-4 py-2.5 rounded-lg text-sm font-bold bg-emerald-600 text-white border-none cursor-pointer disabled:opacity-60">I am available</button>
        <button disabled={isPending} onClick={() => setDay('OFF')} className="px-4 py-2.5 rounded-lg text-sm font-bold bg-amber-600 text-white border-none cursor-pointer disabled:opacity-60">I am OFF</button>
        <button disabled={isPending} onClick={() => setDay('CLEAR')} className={`px-4 py-2.5 rounded-lg text-sm font-bold border cursor-pointer disabled:opacity-60 ${darkMode ? 'bg-transparent text-gray-200 border-white/15' : 'bg-white text-gray-700 border-gray-200'}`}>Clear</button>
        {current && (
          <span className={`text-xs font-bold px-2.5 py-1.5 rounded-full ${current === 'OFF' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
            {dateISO}: {current}
          </span>
        )}
      </div>
    </div>
  )
}

