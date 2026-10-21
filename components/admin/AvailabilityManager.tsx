'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { getServices, getServiceStaffAvailability, setStaffDayAvailability } from '@/lib/actions/service'
import { getStaffDirectory, type StaffDirectoryEntry } from '@/lib/actions/staff'

function todayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function AvailabilityManager({ darkMode }: { darkMode: boolean }) {
  const [services, setServices] = useState<{ id?: string; title: string }[]>([])
  const [staff, setStaff] = useState<StaffDirectoryEntry[]>([])
  const [serviceId, setServiceId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [dateISO, setDateISO] = useState(todayISO())
  const [overrides, setOverrides] = useState<Record<string, Record<string, 'AVAILABLE' | 'OFF'>>>({})
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let live = true
    getServices().then((res: any) => {
      if (!live) return
      const list = (res.services ?? []).map((s: any) => ({ id: s.id, title: s.title }))
      setServices(list)
      if (list.length > 0) setServiceId((cur) => cur || list[0].id || '')
    })
    getStaffDirectory().then((res) => {
      if (!live) return
      // Only midwives gate patient slots, so only they are selectable here.
      const midwives = res.staff.filter((s) => (s.position || '').toLowerCase() === 'midwife')
      setStaff(midwives)
    })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    if (!serviceId) return
    let live = true
    getServiceStaffAvailability(serviceId).then((res) => {
      if (live && res.success) setOverrides(res.availability)
    })
    return () => {
      live = false
    }
  }, [serviceId])

  const currentStatus = serviceId && staffId && dateISO ? overrides[staffId]?.[dateISO] : undefined

  const setStatus = (status: 'AVAILABLE' | 'OFF' | 'CLEAR') => {
    if (!serviceId || !staffId || !dateISO) {
      toast.error('Pick a service, midwife, and date first.')
      return
    }
    startTransition(async () => {
      const res = await setStaffDayAvailability({ serviceId, staffId, dateISO, status })
      if (!res.success) {
        toast.error(res.message)
        return
      }
      toast.success(res.message)
      const next = await getServiceStaffAvailability(serviceId)
      if (next.success) setOverrides(next.availability)
    })
  }

  const selectClass = `w-full px-3.5 py-2.5 rounded-lg text-[15px] outline-none border cursor-pointer ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)]' : 'bg-white text-gray-800 border-gray-200'}`
  const inputClass = `w-full px-3.5 py-2.5 rounded-lg text-[15px] outline-none border ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)]' : 'bg-white text-gray-800 border-gray-200'}`

  return (
    <div className={`rounded-2xl border p-5 sm:p-6 shadow-sm ${darkMode ? 'bg-[#171a3d] border-white/[0.08]' : 'bg-white border-gray-200/80'}`}>
      <h2 className={`text-lg sm:text-xl font-bold ${darkMode ? 'text-white' : 'text-[#1D4662]'}`}>Midwife Availability</h2>
      <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        Mark a midwife OFF and appointment slots for that date shrink automatically. Mark available to restore slots.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <label className="flex flex-col gap-1.5">
          <span className={`text-[12px] font-semibold uppercase tracking-[0.5px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Service</span>
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={selectClass}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={`text-[12px] font-semibold uppercase tracking-[0.5px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Midwife / Staff</span>
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={selectClass}>
            <option value="">Select…</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name} — {s.role}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={`text-[12px] font-semibold uppercase tracking-[0.5px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Date</span>
          <input type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} className={inputClass} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <button disabled={isPending} onClick={() => setStatus('AVAILABLE')} className="px-4 py-2.5 rounded-lg text-sm font-bold bg-emerald-600 text-white border-none cursor-pointer disabled:opacity-60">Mark available</button>
        <button disabled={isPending} onClick={() => setStatus('OFF')} className="px-4 py-2.5 rounded-lg text-sm font-bold bg-amber-600 text-white border-none cursor-pointer disabled:opacity-60">Mark OFF</button>
        <button disabled={isPending} onClick={() => setStatus('CLEAR')} className={`px-4 py-2.5 rounded-lg text-sm font-bold border cursor-pointer disabled:opacity-60 ${darkMode ? 'bg-transparent text-gray-200 border-white/15' : 'bg-white text-gray-700 border-gray-200'}`}>Clear</button>
        {currentStatus && (
          <span className={`text-xs font-bold px-2.5 py-1.5 rounded-full ${currentStatus === 'OFF' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
            {dateISO}: {currentStatus}
          </span>
        )}
      </div>
    </div>
  )
}

