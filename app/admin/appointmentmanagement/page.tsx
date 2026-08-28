'use client'

import { useEffect, useState } from 'react'
import { useDarkMode } from '@/app/admin/DarkModeContext'
import {
  getAnalyticsStats,
  type AnalyticsStats,
  type AnalyticsBreakdown,
} from '@/lib/actions/analytics'

import {
  ANALYTICS_RANGES,
  type AnalyticsRangeKey,
} from '@/lib/constants/analytics'

type Category = { label: string; color: string }

const COLORS = [
  '#4E69D3',
  '#0EA5E9',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#8B5CF6',
  '#EF4444',
  '#14B8A6',
]

export default function AnalyticsPage() {
  const { darkMode } = useDarkMode()

  return (
    <div>
      <h1 className={`text-[30px] sm:text-[38px] lg:text-[45px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'} my-0 mb-[14px] text-left`}>Analytics</h1>
      <AnalyticsSection darkMode={darkMode} />
    </div>
  )
}

function AnalyticsSection({ darkMode }: { darkMode: boolean }) {
  const [rangeKey, setRangeKey] = useState<AnalyticsRangeKey>('1M')
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    async function load() {
      try {
        const res = await getAnalyticsStats(rangeKey)
        if (!cancelled && res.success && res.stats) setStats(res.stats)
      } catch {
        if (!cancelled) setStats(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [rangeKey])

  const fmt = (n: number) => n.toLocaleString()
  const total = stats?.total ?? 0
  const rangeLabel =
    stats?.rangeLabel.toLowerCase() ??
    ANALYTICS_RANGES.find((r) => r.key === rangeKey)!.label.toLowerCase()

  const buildData = (
    rows: AnalyticsBreakdown[],
  ): Array<Category & { pct: number; count: number }> => {
    const denom = total || 1
    return rows.map((r, i) => ({
      label: r.label,
      color: COLORS[i % COLORS.length],
      count: r.count,
      pct: (r.count / denom) * 100,
    }))
  }

  const serviceShareData = buildData(stats?.serviceShare ?? [])
  const appointmentReasonsData = buildData(stats?.reasons ?? [])
  const appointmentOutcomesData = buildData(stats?.outcomes ?? [])
  const peakHoursData = buildData(stats?.peakHours ?? [])

  const walkInRate = total ? (stats?.walkIns ?? 0) / total : 0
  const repeatRate = total ? (stats?.repeatVisits ?? 0) / total : 0
  const walkIns = stats?.walkIns ?? 0

  const summary = [
    { label: 'Total Appointments', value: fmt(total), sub: rangeLabel, color: '#4E69D3', svg: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></> },
    { label: 'Walk-ins Registered', value: fmt(walkIns), sub: `${(walkInRate * 100).toFixed(1)}% of total`, color: '#16A34A', svg: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></> },
    { label: 'Resident Appointments', value: fmt(total - walkIns), sub: `${((1 - walkInRate) * 100).toFixed(1)}% of total`, color: '#F59E0B', svg: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></> },
    { label: 'Repeat Visits', value: fmt(stats?.repeatVisits ?? 0), sub: `${(repeatRate * 100).toFixed(0)}% return rate`, color: '#EC4899', svg: <><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></> },
  ]

  const rangeBtn = (r: (typeof ANALYTICS_RANGES)[number]) =>
    `px-4 py-2.5 rounded-lg text-[14px] font-semibold font-poppins cursor-pointer border transition-colors ${r.key === rangeKey ? 'bg-[#4E69D3] text-white border-[#4E69D3]' : `${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:border-[#4E69D3]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#4E69D3] hover:text-[#4E69D3]'}`}`

  return (
    <div className="mb-7">
      <div className="flex flex-wrap items-center gap-2 mb-[22px]">
        {ANALYTICS_RANGES.map((r) => (
          <button key={r.key} onClick={() => setRangeKey(r.key)} className={rangeBtn(r)}>{r.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-[22px] mb-[22px] max-[1100px]:grid-cols-2 max-[768px]:grid-cols-1">
        {summary.map(s => (
          <div key={s.label} className={`flex items-center gap-4 max-sm:gap-3 ${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'bg-white border-[rgba(15,60,95,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]'} p-[22px] max-sm:p-4 rounded-[18px] border`}>
            <div className={`w-14 h-14 max-sm:w-11 max-sm:h-11 rounded-xl ${darkMode ? 'bg-[#141a45]' : 'bg-[#E8EAF6]'} flex items-center justify-center flex-shrink-0`}>
              <svg viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">{s.svg}</svg>
            </div>
            <div className="flex flex-col">
              <span className={`text-4xl max-sm:text-3xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{s.value}</span>
              <span className={`text-lg leading-tight ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{s.label}</span>
              <span className={`text-[13px] font-semibold ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}`}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[22px] mb-[22px]">
        <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.10)]'} p-6 rounded-[18px] border`}>
          <h3 className={`text-xl font-bold m-0 mb-1 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Percentage of Patients per Service</h3>
          <p className={`m-0 mb-4 text-[14px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Share of patients who chose each service in the {rangeLabel}</p>
          <div className="flex flex-col gap-3">
            {serviceShareData.map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span className={`w-44 flex-shrink-0 text-[15px] font-semibold truncate ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{s.label}</span>
                <div className={`flex-1 h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-[#0f1438]' : 'bg-[#E8EAF6]'}`}>
                  <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                </div>
                <span className={`w-32 flex-shrink-0 text-right text-[15px] whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{s.pct}% &middot; {s.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.10)]'} p-6 rounded-[18px] border`}>
          <h3 className={`text-xl font-bold m-0 mb-1 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Reasons of Appointments</h3>
          <p className={`m-0 mb-4 text-[14px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Most common reasons patients scheduled their appointments in the {rangeLabel}</p>
          <div className="flex flex-col gap-3">
            {appointmentReasonsData.map(r => (
              <div key={r.label} className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                <span className={`w-48 flex-shrink-0 text-[15px] font-semibold truncate ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{r.label}</span>
                <div className={`flex-1 h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-[#0f1438]' : 'bg-[#E8EAF6]'}`}>
                  <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.color }} />
                </div>
                <span className={`w-32 flex-shrink-0 text-right text-[15px] whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{r.pct}% &middot; {r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[22px]">
        <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.10)]'} p-6 rounded-[18px] border`}>
          <h3 className={`text-xl font-bold m-0 mb-1 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Appointment Outcomes</h3>
          <p className={`m-0 mb-4 text-[14px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completion and cancellation rates in the {rangeLabel}</p>
          <div className="flex items-center justify-center gap-8">
            <OutcomesDonut darkMode={darkMode} data={appointmentOutcomesData} total={total} />
            <div className="flex flex-col gap-4">
              {appointmentOutcomesData.map(o => (
                <div key={o.label} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: o.color }} />
                  <span className={`text-lg font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{o.label}</span>
                  <span className={`text-lg font-bold whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{o.pct}% &middot; {o.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.10)]'} p-6 rounded-[18px] border`}>
          <h3 className={`text-xl font-bold m-0 mb-1 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Peak Appointment Hours</h3>
          <p className={`m-0 mb-4 text-[14px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Busiest time slots in the {rangeLabel}</p>
          <div className="flex flex-col gap-3">
            {peakHoursData.map(h => (
              <div key={h.label} className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: h.color }} />
                <span className={`w-40 flex-shrink-0 text-[15px] font-semibold whitespace-nowrap ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{h.label}</span>
                <div className={`flex-1 h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-[#0f1438]' : 'bg-[#E8EAF6]'}`}>
                  <div className="h-full rounded-full" style={{ width: `${h.pct}%`, background: h.color }} />
                </div>
                <span className={`w-32 flex-shrink-0 text-right text-[15px] whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{h.pct}% &middot; {h.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function OutcomesDonut({ darkMode, data, total }: { darkMode: boolean; data: Array<Category & { pct: number; count: number }>; total: number }) {
  const r = 80
  const C = 2 * Math.PI * r
  const [hovered, setHovered] = useState<string | null>(null)
  const active = hovered ? data.find(o => o.label === hovered) : null
  let acc = 0

  return (
    <div className="relative w-[300px] h-[300px] flex-shrink-0">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
        <circle cx="100" cy="100" r={r} fill="none" stroke={darkMode ? '#0f1438' : '#E8EAF6'} strokeWidth="30" />
        {data.map(o => {
          const len = (o.pct / 100) * C
          const seg = (
            <circle
              key={o.label}
              cx="100" cy="100" r={r} fill="none"
              stroke={o.color} strokeWidth="30"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-acc}
              opacity={hovered && hovered !== o.label ? 0.3 : 1}
              className="cursor-pointer transition-opacity duration-150"
              onMouseEnter={() => setHovered(o.label)}
              onMouseLeave={() => setHovered(null)}
            />
          )
          acc += len
          return seg
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {active ? (
          <>
            <span className="text-2xl font-bold whitespace-nowrap" style={{ color: active.color }}>{active.label}</span>
            <span className={`text-5xl leading-none font-bold mt-2 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{active.count.toLocaleString()}</span>
            <span className={`text-base font-semibold mt-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{active.pct}% of total</span>
          </>
        ) : (
          <>
            <span className={`text-5xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{total.toLocaleString()}</span>
            <span className={`text-base font-semibold uppercase tracking-[1px] mt-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Appointments</span>
          </>
        )}
      </div>
    </div>
  )
}
