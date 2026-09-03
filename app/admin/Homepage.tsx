'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useDarkMode } from '@/app/admin/DarkModeContext'
import {
  getDashboardStats,
  getPopulationStats,
  type DashboardStats,
} from '@/lib/actions/dashboard'
import { toPopulationView, type PopulationView } from '@/src/data/population'

export default function Homepage() {
  const { darkMode } = useDarkMode()
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [population, setPopulation] = useState<PopulationView | null>(null)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)

  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getDashboardStats()
        if (!cancelled && res.success && res.stats) {
          setStats(res.stats)
        }
      } catch (err) {
        console.error('Failed to load dashboard stats:', err)
      }
      try {
        const res = await getPopulationStats()
        if (!cancelled && res.success && res.population) {
          setPopulation(toPopulationView(res.population))
        }
      } catch (err) {
        console.error('Failed to load population stats:', err)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 my-4 mb-7">
        <div>
          <h1
            className={`text-[36px] sm:text-[48px] lg:text-[56px] font-bold ${
              darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'
            } leading-tight text-left`}
          >
            {greeting}
          </h1>
          <p
            className={`text-base font-medium mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
          >
            Welcome back to your Meditrack Admin Dashboard
          </p>
        </div>

        {currentTime && (
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-sm self-start sm:self-auto ${
              darkMode
                ? 'bg-[#2d1b4e]/80 border-white/10 text-gray-200'
                : 'bg-white border-slate-200/80 text-slate-700'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl ${
                darkMode
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'bg-indigo-50 text-[#4E69D3]'
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                {currentTime.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="text-lg font-extrabold tracking-tight font-mono">
                {currentTime.toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true,
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-[22px] mb-7 max-[1100px]:grid-cols-2 max-[768px]:grid-cols-1">
        <div
          className={`flex items-center gap-4 max-sm:gap-3 ${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'bg-white border-[rgba(15,60,95,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]'} p-[22px] max-sm:p-4 rounded-[18px] border`}
        >
          <div
            className={`w-14 h-14 max-sm:w-11 max-sm:h-11 rounded-xl ${darkMode ? 'bg-[#141a45]' : 'bg-[#E8EAF6]'} flex items-center justify-center flex-shrink-0`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4E69D3"
              strokeWidth="2"
              className="w-7 h-7"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span
              className={`text-4xl max-sm:text-3xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
            >
              {stats ? stats.totalUsers.toLocaleString() : '—'}
            </span>
            <span
              className={`text-lg ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
            >
              Total Users
            </span>
          </div>
        </div>
        <div
          className={`flex items-center gap-4 max-sm:gap-3 ${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'bg-white border-[rgba(15,60,95,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]'} p-[22px] max-sm:p-4 rounded-[18px] border`}
        >
          <div
            className={`w-14 h-14 max-sm:w-11 max-sm:h-11 rounded-xl ${darkMode ? 'bg-[#141a45]' : 'bg-[#E8EAF6]'} flex items-center justify-center flex-shrink-0`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4E69D3"
              strokeWidth="2"
              className="w-7 h-7"
            >
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              <rect x="2" y="11" width="6" height="10" rx="1" />
              <path d="M8 15h8" />
              <path d="M16 21h2a2 2 0 0 0 2-2" />
              <path d="M2 15h6" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span
              className={`text-4xl max-sm:text-3xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
            >
              {stats ? stats.totalStaff.toLocaleString() : '—'}
            </span>
            <span
              className={`text-lg ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
            >
              Healthcare Staff
            </span>
          </div>
        </div>
        <div
          className={`flex items-center gap-4 max-sm:gap-3 ${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'bg-white border-[rgba(15,60,95,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]'} p-[22px] max-sm:p-4 rounded-[18px] border`}
        >
          <div
            className={`w-14 h-14 max-sm:w-11 max-sm:h-11 rounded-xl ${darkMode ? 'bg-[#141a45]' : 'bg-[#E8EAF6]'} flex items-center justify-center flex-shrink-0`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4E69D3"
              strokeWidth="2"
              className="w-7 h-7"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span
              className={`text-4xl max-sm:text-3xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
            >
              {stats ? stats.todaysSchedule.toLocaleString() : '—'}
            </span>
            <span
              className={`text-lg ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
            >
              Today's Schedule
            </span>
          </div>
        </div>
        <div
          className={`flex items-center gap-4 max-sm:gap-3 ${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'bg-white border-[rgba(15,60,95,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]'} p-[22px] max-sm:p-4 rounded-[18px] border`}
        >
          <div
            className={`w-14 h-14 max-sm:w-11 max-sm:h-11 rounded-xl ${darkMode ? 'bg-[#141a45]' : 'bg-[#E8EAF6]'} flex items-center justify-center flex-shrink-0`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4E69D3"
              strokeWidth="2"
              className="w-7 h-7"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span
              className={`text-4xl max-sm:text-3xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
            >
              {stats ? stats.pendingRequests.toLocaleString() : '—'}
            </span>
            <span
              className={`text-lg ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
            >
              Pending Requests
            </span>
          </div>
        </div>
      </div>

      {population && (
        <>
          <div
            className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.10)]'} p-6 rounded-[18px] border mb-7 shadow-sm`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <div>
                <h3
                  className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#2A2E43]'}`}
                >
                  Age Distribution
                </h3>
                <p
                  className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  Population distribution across age brackets
                </p>
              </div>
              <span
                className={`text-sm font-semibold px-3 py-1 rounded-full ${darkMode ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
              >
                {population.total.toLocaleString()} Total Records
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5">
              {population.ageGroups.map((g) => (
                <AgeBar
                  key={g.label}
                  label={g.label}
                  value={g.value}
                  total={population.total}
                  color={g.color}
                  darkMode={darkMode}
                />
              ))}
            </div>
          </div>

          <div
            className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.10)]'} p-6 rounded-[18px] border mb-7 shadow-sm`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h3
                  className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#2A2E43]'}`}
                >
                  Census per Purok
                </h3>
                <p
                  className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  Demographic breakdown by purok location
                </p>
              </div>
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${darkMode ? 'bg-[#1e1438] border-purple-500/30 text-[#C4B5FD]' : 'bg-indigo-50 border-indigo-100 text-[#4E69D3]'}`}
              >
                <span>Total Census:</span>
                <span className="text-base font-extrabold">
                  {population.purokTotal.toLocaleString()}
                </span>
                <span>residents</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.5">
              {population.puroks.map((p) => {
                const totalSex = p.male + p.female || p.residents || 1
                const malePct = (p.male / totalSex) * 100
                const femalePct = (p.female / totalSex) * 100
                return (
                  <div
                    key={p.label}
                    className={`group relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-1 ${
                      darkMode
                        ? 'bg-[#1e1438]/90 border-white/10 hover:border-purple-400/40 hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5)]'
                        : 'bg-white border-slate-200/80 hover:border-indigo-200 hover:shadow-xl'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full shadow-sm flex-shrink-0"
                            style={{ backgroundColor: p.color }}
                          />
                          <h4
                            className={`text-lg font-bold ${
                              darkMode ? 'text-white' : 'text-slate-800'
                            }`}
                          >
                            {p.label}
                          </h4>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            darkMode
                              ? 'bg-white/10 text-slate-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {p.households} {p.households === 1 ? 'HH' : 'HHs'}
                        </span>
                      </div>

                      <div className="my-3">
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={`text-3xl font-extrabold tracking-tight ${
                              darkMode ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {p.residents.toLocaleString()}
                          </span>
                          <span
                            className={`text-xs font-semibold uppercase tracking-wider ${
                              darkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            residents
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 pt-3 border-t border-slate-100 dark:border-white/10">
                      <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                        <span className="text-sky-500 font-semibold">
                          Male: {p.male} ({malePct.toFixed(0)}%)
                        </span>
                        <span className="text-indigo-400 font-semibold">
                          Female: {p.female} ({femalePct.toFixed(0)}%)
                        </span>
                      </div>
                      <div
                        className={`h-2 rounded-full overflow-hidden flex ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}
                      >
                        <div
                          className="h-full bg-sky-500 transition-all duration-300"
                          style={{ width: `${malePct}%` }}
                          title={`Male: ${p.male}`}
                        />
                        <div
                          className="h-full bg-indigo-500 transition-all duration-300"
                          style={{ width: `${femalePct}%` }}
                          title={`Female: ${p.female}`}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function AgeBar({
  label,
  value,
  total,
  color,
  darkMode,
}: {
  label: string
  value: number
  total: number
  color: string
  darkMode: boolean
}) {
  const pct = total ? (value / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-14 flex-shrink-0 text-sm font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
      >
        {label}
      </span>
      <div
        className={`flex-1 h-3.5 rounded-full overflow-hidden ${darkMode ? 'bg-[#0f1438]' : 'bg-[#E8EAF6]'}`}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span
        className={`w-28 flex-shrink-0 text-right text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
      >
        {value.toLocaleString()} ({pct.toFixed(1)}%)
      </span>
    </div>
  )
}
