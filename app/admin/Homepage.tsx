'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useDarkMode } from '@/app/admin/DarkModeContext'
import { now, fmtLong } from '@/src/lib/dateUtils'

type PatientCardData = {
  name: string
  ptn: string
  ref: string
  service: string
  date: string
  time: string
  relativeOf?: string
}

const todayPatients: PatientCardData[] = [
  { name: 'RICHARDS, Alden P.', ptn: 'PTN-2610204', ref: '1020410', service: 'Basic Consultation', date: fmtLong(now), time: '7:00am to 8:00am' },
  { name: 'CRUZ, Dodong C.', ptn: 'PTN-2610215', ref: '1021503', service: 'Basic Consultation', date: fmtLong(now), time: '7:00am to 8:00am' },
  { name: 'SANTOS, Judith A.', ptn: 'PTN-2610205', ref: '1020502', service: 'Vaccination', date: fmtLong(now), time: '7:00am to 8:00am' },
]

const POPULATION = {
  barangay: 'Sumapang Matanda',
  location: 'Malolos, Bulacan',
  total: 8908,
  households: 1913,
  avgHouseholdSize: 4.66,
  male: 4481,
  female: 4427,
  ageGroups: [
    { label: '0-4', value: 1424, color: '#4E69D3' },
    { label: '5-14', value: 1738, color: '#7C3AED' },
    { label: '15-24', value: 1692, color: '#0EA5E9' },
    { label: '25-34', value: 1268, color: '#10B981' },
    { label: '35-44', value: 1104, color: '#F59E0B' },
    { label: '45-54', value: 812, color: '#EF4444' },
    { label: '55-64', value: 534, color: '#8B5CF6' },
    { label: '65+', value: 336, color: '#EC4899' },
  ],
}

const CENSUS_PER_PUROK = {
  total: 8481,
  puroks: [
    { label: 'Purok 1A', value: 660, color: '#4E69D3' },
    { label: 'Purok 1B', value: 555, color: '#8B5CF6' },
    { label: 'Purok 2A & 2B', value: 1142, color: '#0EA5E9' },
    { label: 'Purok 3A', value: 630, color: '#10B981' },
    { label: 'Purok 3B', value: 459, color: '#F59E0B' },
    { label: 'Purok 4', value: 1318, color: '#EF4444' },
    { label: 'Purok 5A', value: 510, color: '#EC4899' },
    { label: 'Purok 5B', value: 466, color: '#14B8A6' },
    { label: 'Purok 6', value: 1253, color: '#7C3AED' },
    { label: 'Purok 7', value: 988, color: '#F97316' },
    { label: 'Purok 8', value: 500, color: '#6366F1' },
  ],
}

const PATIENT_RECORDS = 5432

export default function Homepage() {
  const { darkMode } = useDarkMode()
  const { data: session } = useSession()

  const role = session?.user?.role
  const firstName = (session?.user?.name || '').trim().split(/\s+/)[0] || ''

  let greeting: string
  if (role === 'SUPERADMIN' || role === 'ADMIN') {
    greeting = 'Hello, Admin!'
  } else if (firstName) {
    greeting = `Hello, ${firstName}!`
  } else {
    greeting = 'Hello, Admin!'
  }

  return (
    <div>
      <h1 className={`text-[40px] sm:text-[52px] lg:text-[68px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'} my-[14px] text-left`}>{greeting}</h1>

      <div className="grid grid-cols-4 gap-[22px] mb-7 max-[1100px]:grid-cols-2 max-[768px]:grid-cols-1">
        <div className={`flex items-center gap-4 max-sm:gap-3 ${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'bg-white border-[rgba(15,60,95,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]'} p-[22px] max-sm:p-4 rounded-[18px] border`}>
          <div className={`w-14 h-14 max-sm:w-11 max-sm:h-11 rounded-xl ${darkMode ? 'bg-[#141a45]' : 'bg-[#E8EAF6]'} flex items-center justify-center flex-shrink-0`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#4E69D3" strokeWidth="2" className="w-7 h-7"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </div>
          <div className="flex flex-col">
            <span className={`text-4xl max-sm:text-3xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>2,847</span>
            <span className={`text-lg ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Total Users</span>
          </div>
        </div>
        <div className={`flex items-center gap-4 max-sm:gap-3 ${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'bg-white border-[rgba(15,60,95,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]'} p-[22px] max-sm:p-4 rounded-[18px] border`}>
          <div className={`w-14 h-14 max-sm:w-11 max-sm:h-11 rounded-xl ${darkMode ? 'bg-[#141a45]' : 'bg-[#E8EAF6]'} flex items-center justify-center flex-shrink-0`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#4E69D3" strokeWidth="2" className="w-7 h-7"><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><rect x="2" y="11" width="6" height="10" rx="1" /><path d="M8 15h8" /><path d="M16 21h2a2 2 0 0 0 2-2" /><path d="M2 15h6" /></svg>
          </div>
          <div className="flex flex-col">
            <span className={`text-4xl max-sm:text-3xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>36</span>
            <span className={`text-lg ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Healthcare Staff</span>
          </div>
        </div>
        <div className={`flex items-center gap-4 max-sm:gap-3 ${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'bg-white border-[rgba(15,60,95,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]'} p-[22px] max-sm:p-4 rounded-[18px] border`}>
          <div className={`w-14 h-14 max-sm:w-11 max-sm:h-11 rounded-xl ${darkMode ? 'bg-[#141a45]' : 'bg-[#E8EAF6]'} flex items-center justify-center flex-shrink-0`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#4E69D3" strokeWidth="2" className="w-7 h-7"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          </div>
          <div className="flex flex-col">
            <span className={`text-4xl max-sm:text-3xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{todayPatients.length}</span>
            <span className={`text-lg ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Today's Schedule</span>
          </div>
        </div>
        <div className={`flex items-center gap-4 max-sm:gap-3 ${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'bg-white border-[rgba(15,60,95,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]'} p-[22px] max-sm:p-4 rounded-[18px] border`}>
          <div className={`w-14 h-14 max-sm:w-11 max-sm:h-11 rounded-xl ${darkMode ? 'bg-[#141a45]' : 'bg-[#E8EAF6]'} flex items-center justify-center flex-shrink-0`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#4E69D3" strokeWidth="2" className="w-7 h-7"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          </div>
          <div className="flex flex-col">
            <span className={`text-4xl max-sm:text-3xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>18</span>
            <span className={`text-lg ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Pending Requests</span>
          </div>
        </div>
      </div>

      <PopulationSection darkMode={darkMode} />
    </div>
  )
}

function PopulationSection({ darkMode }: { darkMode: boolean }) {
  const pctOf = (v: number) => ((v / POPULATION.total) * 100).toFixed(1)

  return (
    <div className={`${darkMode ? 'bg-[rgba(45,27,78,0.65)] border-[rgba(255,255,255,0.10)]' : 'bg-white/65 border-[rgba(15,60,95,0.08)]'} border p-4 sm:p-6 rounded-[24px] mb-7 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
        <h2 className={`text-[30px] sm:text-[38px] lg:text-[46px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'} m-0`}>Barangay Population</h2>
        <p className={`text-lg font-semibold m-0 ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}`}>{POPULATION.barangay} · {POPULATION.location}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Population" value={POPULATION.total.toLocaleString()} sub="Sumapang Matanda" color="#4E69D3" darkMode={darkMode} />
        <StatCard label="Total Patient Records" value={PATIENT_RECORDS.toLocaleString()} sub={`${((PATIENT_RECORDS / POPULATION.total) * 100).toFixed(1)}% of residents`} color="#10B981" darkMode={darkMode} />
        <StatCard label="Households" value={POPULATION.households.toLocaleString()} sub={`${POPULATION.avgHouseholdSize} avg members`} color="#F59E0B" darkMode={darkMode} />
        <StatCard label="Census Coverage" value={CENSUS_PER_PUROK.total.toLocaleString()} sub={`${((CENSUS_PER_PUROK.total / POPULATION.total) * 100).toFixed(1)}% of population`} color="#EC4899" darkMode={darkMode} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.10)]'} p-6 rounded-[18px] border`}>
          <h3 className={`text-xl font-bold m-0 mb-4 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Sex Distribution</h3>
          <div className="flex items-center justify-center gap-6">
            <DonutChart male={POPULATION.male} female={POPULATION.female} total={POPULATION.total} darkMode={darkMode} />
            <div className="flex flex-col gap-3">
              <LegendRow color="#4E69D3" label="Female" value={POPULATION.female} pct={pctOf(POPULATION.female)} darkMode={darkMode} />
              <LegendRow color="#0EA5E9" label="Male" value={POPULATION.male} pct={pctOf(POPULATION.male)} darkMode={darkMode} />
              <LegendRow color="#F59E0B" label="Total" value={POPULATION.total} pct="100.0" darkMode={darkMode} />
            </div>
          </div>
        </div>

        <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.10)]'} p-6 rounded-[18px] border`}>
          <h3 className={`text-xl font-bold m-0 mb-4 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Key Segments</h3>
          <div className="flex flex-col gap-3">
            <SegmentRow label="Children 0-4" value={POPULATION.ageGroups[0].value} color={POPULATION.ageGroups[0].color} darkMode={darkMode} />
            <SegmentRow label="School Age 5-14" value={POPULATION.ageGroups[1].value} color={POPULATION.ageGroups[1].color} darkMode={darkMode} />
            <SegmentRow label="Reproductive Age 15-44" value={1692 + 1268 + 1104} color="#10B981" darkMode={darkMode} />
            <SegmentRow label="Seniors 65+" value={POPULATION.ageGroups[7].value} color={POPULATION.ageGroups[7].color} darkMode={darkMode} />
          </div>
        </div>
      </div>

      <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.10)]'} p-6 rounded-[18px] border`}>
        <h3 className={`text-xl font-bold m-0 mb-4 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Age Distribution</h3>
        <div className="flex flex-col gap-2.5">
          {POPULATION.ageGroups.map(g => (
            <AgeBar key={g.label} label={g.label} value={g.value} total={POPULATION.total} color={g.color} darkMode={darkMode} />
          ))}
        </div>
      </div>

      <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.10)]'} p-6 rounded-[18px] border mt-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h3 className={`text-xl font-bold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Census per Purok</h3>
          <p className={`text-lg font-semibold m-0 ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}`}>
            Total: {CENSUS_PER_PUROK.total.toLocaleString()} residents
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <PurokDonutChart darkMode={darkMode} />
          <CensusCards darkMode={darkMode} />
        </div>
      </div>
    </div>
  )
}

function CensusCards({ darkMode }: { darkMode: boolean }) {
  const sorted = [...CENSUS_PER_PUROK.puroks].sort((a, b) => b.value - a.value)

  return (
    <div>
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 mb-3.5">
        {sorted.map((p, i) => {
          const pct = (p.value / CENSUS_PER_PUROK.total) * 100
          return (
            <div key={p.label} className={`group relative flex flex-col gap-3 ${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)] hover:border-[rgba(255,255,255,0.25)]' : 'bg-white border-[rgba(15,60,95,0.10)] hover:border-[#4E69D3]/40'} p-5 rounded-[16px] border transition-all duration-200 hover:-translate-y-0.5 ${darkMode ? 'hover:shadow-[0_8px_20px_rgba(0,0,0,0.35)]' : 'hover:shadow-[0_8px_20px_rgba(15,60,95,0.12)]'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold uppercase tracking-[1px] whitespace-nowrap ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}`}>{p.label}</span>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${darkMode ? 'bg-[#0f1438] text-gray-300' : 'bg-gray-100 text-gray-500'}`}>#{i + 1}</span>
              </div>
              <div>
                <p className={`text-[38px] leading-none font-bold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{p.value.toLocaleString()}</p>
                <p className={`text-sm font-medium m-0 mt-1.5 uppercase tracking-[0.5px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Residents</p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className={`h-2 rounded-full overflow-hidden flex-1 ${darkMode ? 'bg-[#0f1438]' : 'bg-[#E8EAF6]'}`}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(pct / 18) * 100}%`, background: p.color }} />
                </div>
                <span className="text-lg font-bold flex-shrink-0" style={{ color: p.color }}>{pct.toFixed(1)}%</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${darkMode ? 'bg-[#0f1438] border-[rgba(255,255,255,0.10)]' : 'bg-[#f8fbff] border-[rgba(15,60,95,0.08)]'} px-5 py-3.5 rounded-[14px] border`}>
        <span className={`text-lg font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Total Census</span>
        <div className="flex items-center gap-4">
          <span className={`text-2xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{CENSUS_PER_PUROK.total.toLocaleString()} residents</span>
          <span className={`text-base font-semibold px-3 py-1.5 rounded-full ${darkMode ? 'bg-[#2d1b4e] text-[#C4B5FD]' : 'bg-[#E8EAF6] text-[#4E69D3]'}`}>100%</span>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color, darkMode }: { label: string; value: string; sub: string; color: string; darkMode: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.10)]'} p-5 rounded-[18px] border`}>
      <p className={`text-sm font-semibold uppercase tracking-[1px] m-0 mb-2 ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}`}>{label}</p>
      <p className="text-[48px] leading-none font-bold m-0" style={{ color }}>{value}</p>
      <p className={`text-base m-0 mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{sub}</p>
    </div>
  )
}

function PurokDonutChart({ darkMode }: { darkMode: boolean }) {
  const r = 80
  const C = 2 * Math.PI * r
  const data = CENSUS_PER_PUROK.puroks
  const total = CENSUS_PER_PUROK.total
  const [hovered, setHovered] = useState<string | null>(null)
  const active = hovered ? data.find(d => d.label === hovered) : null
  let acc = 0

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
      <div className="relative w-[300px] h-[300px] flex-shrink-0">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
          <circle cx="100" cy="100" r={r} fill="none" stroke={darkMode ? '#0f1438' : '#E8EAF6'} strokeWidth="30" />
          {data.map(d => {
            const len = (d.value / total) * C
            const seg = (
              <circle
                key={d.label}
                cx="100" cy="100" r={r} fill="none"
                stroke={d.color} strokeWidth="30"
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-acc}
                opacity={hovered && hovered !== d.label ? 0.3 : 1}
                className="cursor-pointer transition-opacity duration-150"
                onMouseEnter={() => setHovered(d.label)}
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
              <span className={`text-2xl font-bold whitespace-nowrap ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`} style={{ color: active.color }}>{active.label}</span>
              <span className={`text-3xl leading-none font-bold mt-1 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{active.value.toLocaleString()}</span>
              <span className={`text-sm font-semibold mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{((active.value / total) * 100).toFixed(1)}% of census</span>
            </>
          ) : (
            <>
              <span className={`text-4xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{total.toLocaleString()}</span>
              <span className={`text-sm font-semibold uppercase tracking-[1px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Census Total</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 w-full sm:w-auto sm:min-w-[280px]">
        {[...data].sort((a, b) => b.value - a.value).map(d => {
          const pct = (d.value / total) * 100
          return (
            <div key={d.label} className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: d.color }} />
              <span className={`w-[140px] flex-shrink-0 text-lg font-semibold whitespace-nowrap ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{d.label}</span>
              <div className={`h-2.5 rounded-full overflow-hidden flex-1 min-w-[48px] ${darkMode ? 'bg-[#0f1438]' : 'bg-[#E8EAF6]'}`}>
                <div className="h-full rounded-full" style={{ width: `${(pct / 18) * 100}%`, background: d.color }} />
              </div>
              <span className={`w-24 flex-shrink-0 text-right text-lg whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {d.value.toLocaleString()} · {pct.toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DonutChart({ male, female, total, darkMode }: { male: number; female: number; total: number; darkMode: boolean }) {
  const r = 70
  const C = 2 * Math.PI * r
  const femalePct = female / total
  const malePct = male / total
  const [hovered, setHovered] = useState<'female' | 'male' | null>(null)

  return (
    <div className="relative w-[290px] h-[290px] flex-shrink-0">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
        <circle cx="100" cy="100" r={r} fill="none" stroke={darkMode ? '#0f1438' : '#E8EAF6'} strokeWidth="30" />
        <circle
          cx="100" cy="100" r={r} fill="none" stroke="#4E69D3" strokeWidth="30"
          strokeDasharray={`${femalePct * C} ${C}`}
          strokeLinecap="butt"
          opacity={hovered && hovered !== 'female' ? 0.3 : 1}
          className="cursor-pointer transition-opacity duration-150"
          onMouseEnter={() => setHovered('female')}
          onMouseLeave={() => setHovered(null)}
        />
        <circle
          cx="100" cy="100" r={r} fill="none" stroke="#0EA5E9" strokeWidth="30"
          strokeDasharray={`${malePct * C} ${C}`}
          strokeDashoffset={-femalePct * C}
          strokeLinecap="butt"
          opacity={hovered && hovered !== 'male' ? 0.3 : 1}
          className="cursor-pointer transition-opacity duration-150"
          onMouseEnter={() => setHovered('male')}
          onMouseLeave={() => setHovered(null)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {hovered === 'female' && (
          <>
            <span className="text-2xl font-bold text-[#4E69D3]">Female</span>
            <span className={`text-3xl leading-none font-bold mt-1 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{female.toLocaleString()}</span>
            <span className={`text-sm font-semibold mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{(femalePct * 100).toFixed(1)}% of population</span>
          </>
        )}
        {hovered === 'male' && (
          <>
            <span className="text-2xl font-bold text-[#0EA5E9]">Male</span>
            <span className={`text-3xl leading-none font-bold mt-1 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{male.toLocaleString()}</span>
            <span className={`text-sm font-semibold mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{(malePct * 100).toFixed(1)}% of population</span>
          </>
        )}
        {!hovered && (
          <>
            <span className={`text-4xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{total.toLocaleString()}</span>
            <span className={`text-sm font-semibold uppercase tracking-[1px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Residents</span>
          </>
        )}
      </div>
    </div>
  )
}

function LegendRow({ color, label, value, pct, darkMode }: { color: string; label: string; value: number; pct: string; darkMode: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className={`text-lg font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{label}</span>
      <span className={`text-lg whitespace-nowrap ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{value.toLocaleString()} · {pct}%</span>
    </div>
  )
}

function SegmentRow({ label, value, color, darkMode }: { label: string; value: number; color: string; darkMode: boolean }) {
  const pct = ((value / POPULATION.total) * 100).toFixed(1)
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-lg font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{label}</span>
      <span className="text-lg" style={{ color }}>
        {value.toLocaleString()} · {pct}%
      </span>
    </div>
  )
}

function AgeBar({ label, value, total, color, darkMode }: { label: string; value: number; total: number; color: string; darkMode: boolean }) {
  const pct = (value / total) * 100
  return (
    <div className="flex items-center gap-3">
      <span className={`w-14 flex-shrink-0 text-lg font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{label}</span>
      <div className={`flex-1 h-6 rounded-full overflow-hidden ${darkMode ? 'bg-[#0f1438]' : 'bg-[#E8EAF6]'}`}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className={`w-32 flex-shrink-0 text-right text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        {value.toLocaleString()} · {pct.toFixed(1)}%
      </span>
    </div>
  )
}
