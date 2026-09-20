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

const AGE_COLORS: Record<string, string> = {
  '0–4': '#0EA5E9',
  '5–14': '#10B981',
  '15–24': '#F59E0B',
  '25–34': '#4E69D3',
  '35–44': '#8B5CF6',
  '45–54': '#EC4899',
  '55–64': '#EF4444',
  '65+': '#14B8A6',
}

export default function AnalyticsPage() {
  const { darkMode } = useDarkMode()

  return (
    <div>
      <h1
        className={`text-[30px] sm:text-[38px] lg:text-[45px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'} my-0 mb-[14px] text-left font-bold`}
      >
        Analytics
      </h1>
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
      pct: parseFloat(((r.count / denom) * 100).toFixed(1)),
    }))
  }

  const serviceShareData = buildData(stats?.serviceShare ?? [])
  const appointmentReasonsData = buildData(stats?.reasons ?? [])
  const appointmentOutcomesData = buildData(stats?.outcomes ?? [])
  const peakHoursData = buildData(stats?.peakHours ?? [])

  const diseaseCases = stats?.diseaseCases ?? 0
  const diseasesData = (stats?.diseases ?? []).map((r, i) => ({
    label: r.label,
    color: COLORS[i % COLORS.length],
    count: r.count,
    pct: parseFloat(
      ((r.count / (diseaseCases || 1)) * 100).toFixed(1),
    ),
  }))

  const walkIns = stats?.walkIns ?? 0
  const walkInRate = total ? walkIns / total : 0
  const repeatRate = total ? (stats?.repeatVisits ?? 0) / total : 0

  const ageGroupsTotal = (stats?.ageGroups ?? []).reduce(
    (sum, group) => sum + group.count,
    0,
  )

  const ageGroupsData = (stats?.ageGroups ?? []).map((g) => ({
    label: g.label,
    count: g.count,
    color: AGE_COLORS[g.label] ?? '#4E69D3',
    pct:
      ageGroupsTotal > 0
        ? parseFloat(((g.count / ageGroupsTotal) * 100).toFixed(1))
        : 0,
  }))

  const summary = [
    {
      label: 'Total Appointments',
      value: fmt(total),
      sub: rangeLabel,
      color: '#4E69D3',
    },
    {
      label: 'Completed',
      value: `${stats?.completionRate ?? 0}%`,
      sub: 'completion rate',
      color: '#10B981',
    },
    {
      label: 'No-Shows',
      value: `${stats?.noShowRate ?? 0}%`,
      sub: 'of appointments',
      color: '#EF4444',
    },
    {
      label: 'Repeat Visits',
      value: fmt(stats?.repeatVisits ?? 0),
      sub: `${(repeatRate * 100).toFixed(0)}% return rate`,
      color: '#EC4899',
    },
  ]

  const card = `rounded-[18px] border ${
    darkMode
      ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]'
      : 'bg-white border-[rgba(15,60,95,0.10)]'
  }`

  const title = `text-xl font-bold m-0 ${
    darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'
  }`

  const sub = `m-0 text-[14px] ${
    darkMode ? 'text-gray-400' : 'text-gray-500'
  }`

  const rangeBtn = (r: (typeof ANALYTICS_RANGES)[number]) =>
    `px-4 py-2.5 rounded-lg text-[14px] font-semibold font-poppins cursor-pointer border transition-colors ${
      r.key === rangeKey
        ? 'bg-[#4E69D3] text-white border-[#4E69D3]'
        : darkMode
          ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:border-[#4E69D3]'
          : 'bg-white text-gray-600 border-gray-200 hover:border-[#4E69D3] hover:text-[#4E69D3]'
    }`

  return (
    <div className="mb-8">
      {/* Header / Date Range */}
      <div className="flex items-end justify-end gap-4 flex-wrap mb-6">

        <div className="flex flex-wrap gap-2">
          {ANALYTICS_RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRangeKey(r.key)}
              className={rangeBtn(r)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div
          className={`flex flex-col items-center justify-center p-12 rounded-[18px] border ${
            darkMode
              ? 'bg-[#2d1b4e] border-white/10 text-gray-300'
              : 'bg-white border-gray-200 text-gray-600'
          }`}
        >
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-base font-semibold">
            Loading analytics data...
          </span>
        </div>
      ) : (
        <>
          {total === 0 && (
            <div
              className={`p-4 rounded-xl mb-6 border ${
                darkMode
                  ? 'bg-amber-900/20 border-amber-500/30 text-amber-300'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <p className="m-0 text-sm font-medium">
                No appointments found for{' '}
                <strong>{stats?.rangeLabel ?? rangeKey}</strong>. Try{' '}
                <strong>All Time</strong> to view historical analytics.
              </p>
            </div>
          )}

          {/* 1. Key Performance Indicators */}
          <section className="mb-6">
            <SectionHeading
              darkMode={darkMode}
              title=""
              subtitle={`Appointment activity for the ${rangeLabel}`}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {summary.map((item) => (
                <div
                  key={item.label}
                  className={`${card} p-5 shadow-sm`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {item.label}
                      </p>
                      <p className={`text-3xl font-extrabold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>
                        {item.value}
                      </p>
                      <p
                        className="text-xs font-semibold mt-2 m-0"
                        style={{ color: item.color }}
                      >
                        {item.sub}
                      </p>
                    </div>
                    <span
                      className="w-2.5 h-2.5 rounded-full mt-1"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 2. Decision Support */}
          <DecisionSupport
            darkMode={darkMode}
            stats={stats}
            rangeLabel={rangeLabel}
            total={total}
          />

          {/* 3. Appointment Operations */}
          <section className="mb-6">
            <SectionHeading
              darkMode={darkMode}
              title="Appointment operations"
              subtitle=""
            />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className={`${card} p-6`}>
                <h3 className={title}>Appointment outcomes</h3>

                {appointmentOutcomesData.length > 0 ? (
                  <div className="flex justify-center">
                    <OutcomesDonut
                      darkMode={darkMode}
                      data={appointmentOutcomesData}
                      total={total}
                      centerLabel="Appointments"
                    />
                  </div>
                ) : (
                  <EmptyState text="No appointment outcome data available." />
                )}
              </div>

              <div className={`${card} p-6`}>
                <h3 className={title}>Top appointment reasons</h3>

                {appointmentReasonsData.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {appointmentReasonsData.slice(0, 7).map((r) => (
                      <BarRow
                        key={r.label}
                        darkMode={darkMode}
                        label={r.label}
                        count={r.count}
                        pct={r.pct}
                        color={r.color}
                        labelWidth="w-36"
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState text="No appointment reason data available." />
                )}
              </div>

              <div className={`${card} p-6`}>
                <h3 className={title}>Peak hours</h3>

                {peakHoursData.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {peakHoursData.slice(0, 7).map((h) => (
                      <BarRow
                        key={h.label}
                        darkMode={darkMode}
                        label={h.label}
                        count={h.count}
                        pct={h.pct}
                        color={h.color}
                        labelWidth="w-32"
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState text="No peak-hour data available." />
                )}
              </div>
            </div>
          </section>

          {/* 4. Service & Patient Profile */}
          <section className="mb-6">
            <SectionHeading
              darkMode={darkMode}
              title="Services & patient profile"
              subtitle=""
            />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className={`${card} p-6`}>
                <h3 className={title}>Service utilization</h3>

                {serviceShareData.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {serviceShareData.slice(0, 8).map((s) => (
                      <BarRow
                        key={s.label}
                        darkMode={darkMode}
                        label={s.label}
                        count={s.count}
                        pct={s.pct}
                        color={s.color}
                        labelWidth="w-40"
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState text="No service data available." />
                )}
              </div>

              <div className={`${card} p-6`}>
                <h3 className={title}>Age group distribution</h3>

                {ageGroupsData.some((g) => g.count > 0) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-4">
                    {ageGroupsData.map((g) => (
                      <div key={g.label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-sm font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>
                            {g.label}
                          </span>
                          <span className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {g.count.toLocaleString()} · {g.pct}%
                          </span>
                        </div>
                        <div
                          className={`h-2.5 rounded-full overflow-hidden ${
                            darkMode ? 'bg-[#0f1438]' : 'bg-[#E8EAF6]'
                          }`}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${g.pct}%`,
                              background: g.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text="No age-group data available." />
                )}
              </div>
            </div>
          </section>

          {/* 5. Health Monitoring */}
          <section className="mb-6">
            <SectionHeading
              darkMode={darkMode}
              title="Health monitoring"
              subtitle=""
            />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className={`${card} p-6`}>
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <h3 className={title}>Disease / case reports</h3>
                    <p className={`${sub} mt-1`}>
                      Most commonly recorded cases in the {rangeLabel}.
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                    darkMode
                      ? 'bg-white/10 text-gray-300'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {fmt(diseaseCases)} cases
                  </span>
                </div>

                {diseasesData.length > 0 ? (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-7">
                    <OutcomesDonut
                      darkMode={darkMode}
                      data={diseasesData}
                      total={diseaseCases}
                      centerLabel="Cases"
                    />

                    <div className="flex flex-col gap-3 w-full sm:w-auto">
                      {diseasesData.slice(0, 7).map((d) => (
                        <div key={d.label} className="flex items-center gap-3">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ background: d.color }}
                          />
                          <span className={`text-sm font-semibold flex-1 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>
                            {d.label}
                          </span>
                          <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {d.count.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState text="No medical case data available." />
                )}
              </div>

              {stats?.pwdStats ? (
                <div className={`${card} p-6`}>
                  <h3 className={title}>PWD & senior citizen overview</h3>
                  <br /><br />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ProfileStat
                      darkMode={darkMode}
                      label="PWD Registered"
                      value={stats.pwdStats.total}
                      pct={`${stats.pwdStats.pct}% of users`}
                      color="#4E69D3"
                    />
                    <ProfileStat
                      darkMode={darkMode}
                      label="Senior Citizens"
                      value={stats.pwdStats.seniorCitizens}
                      pct={`${stats.pwdStats.seniorPct}% of users`}
                      color="#F59E0B"
                    />
                  </div>
                </div>
              ) : (
                <div className={`${card} p-6`}>
                  <h3 className={title}>Patient demographics</h3>
                  <p className={`${sub} mt-1 mb-5`}>
                    Additional demographic indicators.
                  </p>
                  <EmptyState text="No demographic data available." />
                </div>
              )}
            </div>
          </section>

          {/* 6. Additional Patient Indicators */}
          <section>
            <SectionHeading
              darkMode={darkMode}
              title=""
              subtitle=""
            />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Sex by Service */}
              <div className={`${card} p-6`}>
                <h3 className={title}>Sex by service</h3>

                {(stats?.sexByService ?? []).length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {stats!.sexByService.slice(0, 6).map((s) => {
                      const serviceTotal = s.male + s.female || 1
                      const malePct = Math.round((s.male / serviceTotal) * 100)
                      const femalePct = 100 - malePct

                      return (
                        <div key={s.service}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>
                              {s.service}
                            </span>
                            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {serviceTotal.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex justify-between text-[11px] font-semibold mb-1.5">
                            <span className="text-sky-500">Male {malePct}%</span>
                            <span className="text-indigo-400">Female {femalePct}%</span>
                          </div>

                          <div className={`h-2.5 rounded-full overflow-hidden flex ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                            <div
                              className="h-full bg-sky-500"
                              style={{ width: `${malePct}%` }}
                            />
                            <div
                              className="h-full bg-indigo-400"
                              style={{ width: `${femalePct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState
                    darkMode={darkMode}
                    icon="users"
                    title="No sex data available"
                    text="There are no patient sex records for the selected period."
                  />
                )}
              </div>

              {/* Immunization */}
              <div className={`${card} p-6`}>
                <h3 className={title}>Immunization activity</h3>

                {(stats?.immunization ?? []).length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {stats!.immunization.slice(0, 8).map((imm, i) => {
                      const maxCount = Math.max(
                        ...(stats!.immunization.map((item) => item.count)),
                        1,
                      )
                      const pct = parseFloat(
                        ((imm.count / maxCount) * 100).toFixed(1),
                      )

                      return (
                        <BarRow
                          key={imm.label}
                          darkMode={darkMode}
                          label={imm.label}
                          count={imm.count}
                          pct={pct}
                          color={COLORS[i % COLORS.length]}
                          labelWidth="w-28"
                        />
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState
                    darkMode={darkMode}
                    icon="syringe"
                    title="No immunization data"
                    text="No immunization activity has been recorded for the selected period."
                  />
                )}
              </div>

              {/* Blood Type */}
              <div className={`${card} p-6`}>
                <h3 className={title}>Blood type distribution</h3>

                {(stats?.bloodTypes ?? []).length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {stats!.bloodTypes.map((bt, i) => {
                      const totalBt = stats!.bloodTypes.reduce(
                        (sum, b) => sum + b.count,
                        0,
                      )

                      const pct =
                        totalBt > 0
                          ? ((bt.count / totalBt) * 100).toFixed(1)
                          : '0'

                      return (
                        <div
                          key={bt.label}
                          className={`flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl border ${
                            darkMode
                              ? 'bg-[#1e1438] border-white/10'
                              : 'bg-gray-50 border-gray-100'
                          }`}
                        >
                          <span
                            className="text-xl font-extrabold"
                            style={{ color: COLORS[i % COLORS.length] }}
                          >
                            {bt.label}
                          </span>
                          <span className={`text-base font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>
                            {bt.count.toLocaleString()}
                          </span>
                          <span className={`text-[10px] font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {pct}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState
                    darkMode={darkMode}
                    icon="droplet"
                    title="No blood type data"
                    text="Blood type information has not been recorded for the available patients."
                  />
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function SectionHeading({
  darkMode,
  title,
  subtitle,
}: {
  darkMode: boolean
  title: string
  subtitle: string
}) {
  return (
    <div className="mb-3.5">
      <h3 className={`text-lg font-bold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>
        {title}
      </h3>
      <p className={`text-xs mt-1 mb-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        {subtitle}
      </p>
    </div>
  )
}

function EmptyState({
  darkMode,
  title,
  text,
  icon = 'chart',
}: {
  darkMode: boolean
  title: string
  text: string
  icon?: 'chart' | 'users' | 'syringe' | 'droplet'
}) {
  const iconPath = {
    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 16v-5" />
        <path d="M12 16V8" />
        <path d="M16 16v-9" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    syringe: (
      <>
        <path d="m18 2 4 4" />
        <path d="m17 7 3 3" />
        <path d="m19 5-7.5 7.5" />
        <path d="m14 10-8 8" />
        <path d="m3 21 3-3" />
        <path d="M8 21H3v-5" />
      </>
    ),
    droplet: (
      <>
        <path d="M12 2.7S5 10 5 14.5a7 7 0 0 0 14 0C19 10 12 2.7 12 2.7Z" />
        <path d="M9 16a3.5 3.5 0 0 0 3 2" />
      </>
    ),
  }[icon]

  return (
    <div
      className={`min-h-[190px] flex flex-col items-center justify-center text-center rounded-2xl border border-dashed px-6 py-8 ${
        darkMode
          ? 'bg-[#1e1438]/70 border-white/10'
          : 'bg-gray-50/80 border-gray-200'
      }`}
    >
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
          darkMode
            ? 'bg-white/5 text-gray-500'
            : 'bg-white text-gray-400 shadow-sm'
        }`}
      >
        <svg
          width="23"
          height="23"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {iconPath}
        </svg>
      </div>

      <p
        className={`text-sm font-bold mb-1 ${
          darkMode ? 'text-gray-200' : 'text-gray-700'
        }`}
      >
        {title}
      </p>

      <p
        className={`text-xs leading-relaxed max-w-[250px] m-0 ${
          darkMode ? 'text-gray-500' : 'text-gray-500'
        }`}
      >
        {text}
      </p>
    </div>
  )
}

function ProfileStat({
  darkMode,
  label,
  value,
  pct,
  color,
}: {
  darkMode: boolean
  label: string
  value: number
  pct: string
  color: string
}) {
  return (
    <div className={`rounded-2xl border p-5 ${
      darkMode ? 'bg-[#1e1438] border-white/10' : 'bg-gray-50 border-gray-100'
    }`}>
      <span
        className="inline-block w-2.5 h-2.5 rounded-full mb-3"
        style={{ backgroundColor: color }}
      />
      <div className={`text-3xl font-extrabold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>
        {value.toLocaleString()}
      </div>
      <div className={`text-sm font-semibold mt-1 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>
        {label}
      </div>
      <div className="text-xs font-semibold mt-1" style={{ color }}>
        {pct}
      </div>
    </div>
  )
}

// ── Decision-support indicators ──
// These indicators summarize existing analytics data and flag values that
// may require administrative attention. They are not medical diagnoses.
function DecisionSupport({
  darkMode,
  stats,
  rangeLabel,
  total,
}: {
  darkMode: boolean
  stats: AnalyticsStats | null
  rangeLabel: string
  total: number
}) {
  const noShowRate = stats?.noShowRate ?? 0
  const cancellationRate = stats?.cancellationRate ?? 0
  const completionRate = stats?.completionRate ?? 0
  const walkIns = stats?.walkIns ?? 0
  const repeatVisits = stats?.repeatVisits ?? 0

  const topService = [...(stats?.serviceShare ?? [])].sort(
    (a, b) => b.count - a.count,
  )[0]

  const topReason = [...(stats?.reasons ?? [])].sort(
    (a, b) => b.count - a.count,
  )[0]

  const topDisease = [...(stats?.diseases ?? [])].sort(
    (a, b) => b.count - a.count,
  )[0]

  const topHour = [...(stats?.peakHours ?? [])].sort(
    (a, b) => b.count - a.count,
  )[0]

  type Indicator = {
    label: string
    value: string
    detail: string
    status: "attention" | "watch" | "normal"
  }

  const indicators: Indicator[] = [
    {
      label: "No-show rate",
      value: `${noShowRate.toFixed(1)}%`,
      detail:
        noShowRate >= 15
          ? "High missed-appointment level; review reminder and scheduling practices."
          : noShowRate >= 8
            ? "Monitor missed appointments and consider improving reminders."
            : "Within the current monitoring threshold.",
      status:
        noShowRate >= 15
          ? "attention"
          : noShowRate >= 8
            ? "watch"
            : "normal",
    },
    {
      label: "Cancellation rate",
      value: `${cancellationRate.toFixed(1)}%`,
      detail:
        cancellationRate >= 15
          ? "High cancellation level; review cancellation reasons and slot utilization."
          : cancellationRate >= 8
            ? "Monitor cancellations for recurring scheduling issues."
            : "Within the current monitoring threshold.",
      status:
        cancellationRate >= 15
          ? "attention"
          : cancellationRate >= 8
            ? "watch"
            : "normal",
    },
    {
      label: "Completion rate",
      value: `${completionRate.toFixed(1)}%`,
      detail:
        completionRate < 70
          ? "Low completion level; review pending, cancelled, and missed appointments."
          : completionRate < 85
            ? "Monitor appointment completion and follow-up."
            : "Appointment completion is currently high.",
      status:
        completionRate < 70
          ? "attention"
          : completionRate < 85
            ? "watch"
            : "normal",
    },
    {
      label: "Walk-in share",
      value: `${(total ? (walkIns / total) * 100 : 0).toFixed(1)}%`,
      detail:
        total && walkIns / total >= 0.4
          ? "Large walk-in share; review whether appointment capacity matches demand."
          : "Walk-in activity is within the current monitoring threshold.",
      status:
        total && walkIns / total >= 0.4
          ? "watch"
          : "normal",
    },
  ]

  const statusClass = (status: Indicator["status"]) => {
    if (status === "attention") {
      return darkMode
        ? "bg-red-950/30 border-red-500/30"
        : "bg-red-50 border-red-200"
    }
    if (status === "watch") {
      return darkMode
        ? "bg-amber-950/30 border-amber-500/30"
        : "bg-amber-50 border-amber-200"
    }
    return darkMode
      ? "bg-emerald-950/20 border-emerald-500/20"
      : "bg-emerald-50 border-emerald-200"
  }

  const statusText = (status: Indicator["status"]) => {
    if (status === "attention") return "Attention"
    if (status === "watch") return "Monitor"
    return "Normal"
  }

  const statusTextClass = (status: Indicator["status"]) => {
    if (status === "attention")
      return darkMode ? "text-red-300" : "text-red-700"
    if (status === "watch")
      return darkMode ? "text-amber-300" : "text-amber-700"
    return darkMode ? "text-emerald-300" : "text-emerald-700"
  }

  return (
    <div className={`${darkMode ? "bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]" : "bg-white border-[rgba(15,60,95,0.10)]"} p-6 rounded-[18px] border mb-[22px]`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className={`rounded-2xl border p-4 ${darkMode ? "bg-[#1e1438] border-white/10" : "bg-gray-50 border-gray-100"}`}>
          <h4 className={`text-sm font-bold m-0 mb-3 ${darkMode ? "text-[#F9FAFB]" : "text-[#2A2E43]"}`}>
            Demand signals
          </h4>
          <div className="space-y-3">
            <DecisionRow
              darkMode={darkMode}
              label="Most used service"
              value={topService ? `${topService.label} (${topService.count.toLocaleString()})` : "No data"}
            />
            <DecisionRow
              darkMode={darkMode}
              label="Most common appointment reason"
              value={topReason ? `${topReason.label} (${topReason.count.toLocaleString()})` : "No data"}
            />
            <DecisionRow
              darkMode={darkMode}
              label="Busiest time"
              value={topHour ? `${topHour.label} (${topHour.count.toLocaleString()})` : "No data"}
            />
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${darkMode ? "bg-[#1e1438] border-white/10" : "bg-gray-50 border-gray-100"}`}>
          <h4 className={`text-sm font-bold m-0 mb-3 ${darkMode ? "text-[#F9FAFB]" : "text-[#2A2E43]"}`}>
            Health monitoring signals
          </h4>
          <div className="space-y-3">
            <DecisionRow
              darkMode={darkMode}
              label="Most recorded condition"
              value={
                topDisease
                  ? `${topDisease.label} (${topDisease.count.toLocaleString()})`
                  : "No case data"
              }
            />
            <DecisionRow
              darkMode={darkMode}
              label="Recorded cases"
              value={`${(stats?.diseaseCases ?? 0).toLocaleString()}`}
            />
            <DecisionRow
              darkMode={darkMode}
              label="Repeat visits"
              value={`${repeatVisits.toLocaleString()}`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function DecisionRow({
  darkMode,
  label,
  value,
}: {
  darkMode: boolean
  label: string
  value: string
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
        {label}
      </span>
      <span className={`text-xs font-bold text-right ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
        {value}
      </span>
    </div>
  )
}


// ── Shared bar row component ──
function BarRow({
  darkMode,
  label,
  count,
  pct,
  color,
  labelWidth,
}: {
  darkMode: boolean
  label: string
  count: number
  pct: number
  color: string
  labelWidth: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-3.5 h-3.5 rounded-full flex-shrink-0"
        style={{ background: color }}
      />
      <span
        className={`${labelWidth} flex-shrink-0 text-[15px] font-semibold truncate ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
      >
        {label}
      </span>
      <div
        className={`flex-1 h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-[#0f1438]' : 'bg-[#E8EAF6]'}`}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span
        className={`w-32 flex-shrink-0 text-right text-[15px] whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
      >
        {pct}% &middot; {count}
      </span>
    </div>
  )
}

// ── Donut chart ──
function OutcomesDonut({
  darkMode,
  data,
  total,
  centerLabel = 'Appointments',
}: {
  darkMode: boolean
  data: Array<Category & { pct: number; count: number }>
  total: number
  centerLabel?: string
}) {
  const r = 80
  const C = 2 * Math.PI * r
  const [hovered, setHovered] = useState<string | null>(null)
  const active = hovered ? data.find((o) => o.label === hovered) : null
  let acc = 0

  return (
    <div className="relative w-[260px] h-[260px] flex-shrink-0">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke={darkMode ? '#0f1438' : '#E8EAF6'}
          strokeWidth="30"
        />
        {data.map((o) => {
          const len = (o.pct / 100) * C
          const seg = (
            <circle
              key={o.label}
              cx="100"
              cy="100"
              r={r}
              fill="none"
              stroke={o.color}
              strokeWidth="30"
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
            <span
              className="text-xl font-bold whitespace-nowrap"
              style={{ color: active.color }}
            >
              {active.label}
            </span>
            <span
              className={`text-4xl leading-none font-bold mt-1.5 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
            >
              {active.count.toLocaleString()}
            </span>
            <span
              className={`text-sm font-semibold mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
            >
              {active.pct}% of total
            </span>
          </>
        ) : (
          <>
            <span
              className={`text-4xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
            >
              {total.toLocaleString()}
            </span>
            <span
              className={`text-sm font-semibold uppercase tracking-[1px] mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
            >
              {centerLabel}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
