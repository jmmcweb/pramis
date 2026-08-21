'use client'

import { useState } from 'react'
import { useDarkMode } from '@/app/admin/DarkModeContext'

type Category = { label: string; color: string }

const serviceShareConfig: Category[] = [
  { label: 'Vaccination', color: '#4E69D3' },
  { label: 'Basic Consultation', color: '#0EA5E9' },
  { label: 'Check-up', color: '#10B981' },
  { label: 'Pre-natal Care', color: '#F59E0B' },
  { label: 'Family Planning', color: '#EC4899' },
  { label: 'Dental Care', color: '#8B5CF6' },
]

const serviceSharePcts: Record<string, number[]> = {
  '7D': [38.6, 35.2, 14.8, 6.0, 3.3, 2.1],
  '1M': [41.2, 32.4, 15.6, 5.9, 3.1, 1.8],
  '3M': [39.8, 33.5, 15.1, 6.2, 3.0, 2.4],
  '6M': [42.5, 31.1, 14.9, 5.7, 3.4, 2.4],
  '9M': [40.4, 32.9, 15.3, 6.4, 3.0, 2.0],
  '12M': [43.1, 30.8, 14.6, 5.6, 3.2, 2.7],
}

const appointmentReasonsConfig: Category[] = [
  { label: 'Immunization / Vaccination', color: '#4E69D3' },
  { label: 'Fever', color: '#EF4444' },
  { label: 'Cough & Colds', color: '#0EA5E9' },
  { label: 'Routine Check-up', color: '#10B981' },
  { label: 'Prenatal Care', color: '#F59E0B' },
  { label: 'Hypertension Management', color: '#EC4899' },
  { label: 'Others', color: '#8B5CF6' },
]

const appointmentReasonsPcts: Record<string, number[]> = {
  '7D': [35.5, 24.2, 18.9, 9.8, 6.2, 3.1, 2.3],
  '1M': [41.2, 18.6, 15.6, 12.2, 5.9, 4.1, 2.4],
  '3M': [39.4, 20.3, 16.8, 11.4, 6.1, 3.6, 2.4],
  '6M': [43.0, 17.2, 14.9, 13.1, 5.8, 3.9, 2.1],
  '9M': [40.8, 19.1, 15.7, 12.6, 6.0, 3.7, 2.1],
  '12M': [44.5, 16.4, 14.2, 13.4, 5.7, 3.6, 2.2],
}

const appointmentOutcomesConfig: Category[] = [
  { label: 'Completed', color: '#16A34A' },
  { label: 'Cancelled', color: '#DC2626' },
  { label: 'No Show', color: '#CA8A04' },
]

const appointmentOutcomesPcts: Record<string, number[]> = {
  '7D': [62.4, 21.3, 16.3],
  '1M': [58.3, 25.2, 16.5],
  '3M': [60.1, 23.8, 16.1],
  '6M': [56.9, 26.4, 16.7],
  '9M': [59.0, 24.6, 16.4],
  '12M': [55.7, 27.8, 16.5],
}

const peakHoursConfig: Category[] = [
  { label: '7:00am - 8:00am', color: '#4E69D3' },
  { label: '9:00am - 10:00am', color: '#0EA5E9' },
  { label: '1:00pm - 2:00pm', color: '#10B981' },
  { label: '10:00am - 11:00am', color: '#F59E0B' },
  { label: '2:00pm - 3:00pm', color: '#EC4899' },
]

const peakHoursPcts: Record<string, number[]> = {
  '7D': [28.4, 26.1, 19.6, 14.7, 11.2],
  '1M': [31.5, 24.8, 18.2, 15.3, 10.2],
  '3M': [29.8, 25.6, 19.1, 14.9, 10.6],
  '6M': [32.2, 23.9, 17.8, 15.7, 10.4],
  '9M': [30.6, 25.1, 18.6, 15.1, 10.6],
  '12M': [33.4, 23.2, 17.4, 15.9, 10.1],
}

const walkInRates: Record<string, number> = { '7D': 0.246, '1M': 0.181, '3M': 0.203, '6M': 0.169, '9M': 0.188, '12M': 0.157 }
const repeatRates: Record<string, number> = { '7D': 0.265, '1M': 0.290, '3M': 0.276, '6M': 0.304, '9M': 0.283, '12M': 0.318 }

const timeRanges = [
  { key: '7D', label: 'Past 7 Days', total: 324 },
  { key: '1M', label: 'Past 1 Month', total: 1180 },
  { key: '3M', label: 'Past 3 Months', total: 3428 },
  { key: '6M', label: 'Past 6 Months', total: 6615 },
  { key: '9M', label: 'Past 9 Months', total: 9852 },
  { key: '12M', label: 'Past 12 Months', total: 12940 },
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
  const [rangeKey, setRangeKey] = useState('1M')
  const range = timeRanges.find(r => r.key === rangeKey) || timeRanges[1]
  const fmt = (n: number) => n.toLocaleString()
  const buildData = (config: Category[], pcts: number[]) => config.map((c, i) => ({ ...c, pct: pcts[i], count: Math.round((range.total * pcts[i]) / 100) }))
  const serviceShareData = buildData(serviceShareConfig, serviceSharePcts[rangeKey])
  const appointmentReasonsData = buildData(appointmentReasonsConfig, appointmentReasonsPcts[rangeKey])
  const appointmentOutcomesData = buildData(appointmentOutcomesConfig, appointmentOutcomesPcts[rangeKey])
  const peakHoursData = buildData(peakHoursConfig, peakHoursPcts[rangeKey])

  const walkInRate = walkInRates[rangeKey]
  const repeatRate = repeatRates[rangeKey]
  const walkIns = Math.round(range.total * walkInRate)
  const summary = [
    { label: 'Total Appointments', value: fmt(range.total), sub: range.label.toLowerCase(), color: '#4E69D3', svg: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></> },
    { label: 'Walk-ins Registered', value: fmt(walkIns), sub: `${(walkInRate * 100).toFixed(1)}% of total`, color: '#16A34A', svg: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></> },
    { label: 'Resident Appointments', value: fmt(range.total - walkIns), sub: `${((1 - walkInRate) * 100).toFixed(1)}% of total`, color: '#F59E0B', svg: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></> },
    { label: 'Repeat Visits', value: fmt(Math.round(range.total * repeatRate)), sub: `${(repeatRate * 100).toFixed(0)}% return rate`, color: '#EC4899', svg: <><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></> },
  ]

  const rangeBtn = (r: typeof timeRanges[number]) => `px-4 py-2.5 rounded-lg text-[14px] font-semibold font-poppins cursor-pointer border transition-colors ${r.key === rangeKey ? 'bg-[#4E69D3] text-white border-[#4E69D3]' : `${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:border-[#4E69D3]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#4E69D3] hover:text-[#4E69D3]'}`}`

  return (
    <div className="mb-7">
      <div className="flex flex-wrap items-center gap-2 mb-[22px]">
        {timeRanges.map(r => (
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
          <p className={`m-0 mb-4 text-[14px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Share of patients who chose each service in the {range.label.toLowerCase()}</p>
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
          <p className={`m-0 mb-4 text-[14px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Most common reasons patients scheduled their appointments in the {range.label.toLowerCase()}</p>
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
          <p className={`m-0 mb-4 text-[14px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completion and cancellation rates in the {range.label.toLowerCase()}</p>
          <div className="flex items-center justify-center gap-8">
            <OutcomesDonut darkMode={darkMode} data={appointmentOutcomesData} total={range.total} />
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
          <p className={`m-0 mb-4 text-[14px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Busiest time slots in the {range.label.toLowerCase()}</p>
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
