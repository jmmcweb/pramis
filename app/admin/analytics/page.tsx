'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { FileDown, Loader2, X } from 'lucide-react'
import { useDarkMode } from '@/app/admin/DarkModeContext'
import {
  getAnalyticsStats,
  getAnalyticsYears,
  getAnalyticsSectionRows,
  type AnalyticsStats,
  type AnalyticsBreakdown,
  type AnalyticsDetailRow,
  type AnalyticsDetailSection,
} from '@/lib/actions/analytics'
import {
  ANALYTICS_RANGES,
  ANALYTICS_REPORT_SECTIONS,
  ANALYTICS_DETAIL_COLUMNS,
  DEFAULT_ANALYTICS_DETAIL_COLUMNS,
  DEFAULT_ANALYTICS_REPORT_SECTIONS,
  isYearRangeKey,
  type AnalyticsRangeKey,
  type AnalyticsReportSectionKey,
} from '@/lib/constants/analytics'
import { generateAnalyticsReportPdf } from '@/lib/analyticsReportPdf'

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
  const currentYear = new Date().getFullYear()
  const [rangeKey, setRangeKey] = useState<AnalyticsRangeKey>('1M')
  const [year, setYear] = useState<number>(currentYear)
  const [years, setYears] = useState<number[]>([currentYear])
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportSections, setReportSections] = useState<AnalyticsReportSectionKey[]>(
    [...DEFAULT_ANALYTICS_REPORT_SECTIONS],
  )
  const { data: session } = useSession()

  const [detail, setDetail] = useState<{
    section: AnalyticsDetailSection
    label: string | null
    open: boolean
  } | null>(null)
  const [detailRows, setDetailRows] = useState<AnalyticsDetailRow[]>([])
  const [detailTotal, setDetailTotal] = useState(0)
  const [detailLoading, setDetailLoading] = useState(false)

  const byYear = isYearRangeKey(rangeKey)

  // Load the list of selectable years once, when the year view is first opened.
  useEffect(() => {
    if (!byYear) return
    let cancelled = false

    async function loadYears() {
      try {
        const res = await getAnalyticsYears()
        if (cancelled || !res.success || res.years.length === 0) return
        setYears(res.years)
        if (!res.years.includes(year)) setYear(res.years[0])
      } catch {
      }
    }

    loadYears()

    return () => {
      cancelled = true
    }
  }, [byYear])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load() {
      try {
        const res = await getAnalyticsStats(
          rangeKey,
          isYearRangeKey(rangeKey) ? year : null,
        )
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
  }, [rangeKey, year])

  // Loads the individual records behind a chart for the drill-down modal.
  const openDetails = async (section: AnalyticsDetailSection, label: string | null = null) => {
    setDetail({ section, label, open: true })
    setDetailLoading(true)
    setDetailRows([])
    setDetailTotal(0)

    try {
      const res = await getAnalyticsSectionRows(
        section,
        rangeKey,
        isYearRangeKey(rangeKey) ? year : null,
        label,
      )
      if (res.success) {
        setDetailRows(res.rows)
        setDetailTotal(res.totalMatched)
      } else {
        toast.error(res.message || 'Failed to load details.')
      }
    } catch {
      toast.error('Failed to load details. Please try again.')
    } finally {
      setDetailLoading(false)
    }
  }

  // Generates the PDF report for the filter that is currently selected. The
  // statistics are re-fetched at click time so the report always reflects the
  // active filter rather than a stale render.
  const handleGenerateReport = async (sections: AnalyticsReportSectionKey[]) => {
    if (generating) return

    if (sections.length === 0) {
      toast.error('Select at least one section to include in the report.')
      return
    }

    setGenerating(true)

    const selectedYear = isYearRangeKey(rangeKey) ? year : null
    const filterLabel =
      ANALYTICS_RANGES.find((r) => r.key === rangeKey)?.label ??
      (selectedYear ? `Year ${selectedYear}` : 'Analytics Report')

    try {
      const res = await getAnalyticsStats(rangeKey, selectedYear)

      if (!res.success || !res.stats) {
        toast.error(res.message || 'Failed to generate the report.')
        return
      }

      const name =
        (session?.user?.name as string | undefined)?.trim() || 'Administrator'

      let patientRows: AnalyticsDetailRow[] | undefined
      let patientRowsTruncated = false
      if (sections.includes('patientAppendix')) {
        try {
          const res = await getAnalyticsSectionRows(
            'serviceShare',
            rangeKey,
            selectedYear,
            null,
          )
          if (res.success) {
            patientRows = res.rows
            patientRowsTruncated = res.totalMatched > res.rows.length
          }
        } catch {
          toast.error('Could not load the patient appendix.')
        }
      }

      generateAnalyticsReportPdf(res.stats, {
        rangeKey,
        rangeLabel: res.stats.rangeLabel || filterLabel,
        year: selectedYear,
        generatedBy: name,
        sections,
        patientRows,
        patientRowsTruncated,
        appendixSection: 'serviceShare',
      })

      const count =
        sections.length === ANALYTICS_REPORT_SECTIONS.length
          ? 'all sections'
          : `${sections.length} section${sections.length === 1 ? '' : 's'}`

      toast.success(
        `Report generated for ${res.stats.rangeLabel || filterLabel} (${count}).`,
      )
      setReportOpen(false)
    } catch {
      toast.error('Failed to generate the report. Please try again.')
    } finally {
      setGenerating(false)
    }
  }


  const fmt = (n: number) => n.toLocaleString()
  const total = stats?.total ?? 0

  const rangeLabel =
    stats?.rangeLabel.toLowerCase() ??
    (isYearRangeKey(rangeKey)
      ? `year ${year}`
      : ANALYTICS_RANGES.find((r) => r.key === rangeKey)!.label.toLowerCase())

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

  const yearSelect = `px-4 py-2.5 rounded-lg text-[14px] font-semibold font-poppins cursor-pointer border transition-colors outline-none ${
    darkMode
      ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)]'
      : 'bg-white text-gray-600 border-gray-200'
  }`

  return (
    <div className="mb-8">
      {/* Header / Date Range */}
      <div className="flex flex-col items-end gap-2 mb-6">
        <div className="flex flex-wrap gap-2 items-center justify-end">
          {ANALYTICS_RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRangeKey(r.key)}
              className={rangeBtn(r)}
            >
              {r.label}
            </button>
          ))}

          {byYear && (
            <>
              <label
                htmlFor="analytics-year"
                className={`text-[14px] font-semibold ml-1 ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                Year
              </label>
              <select
                id="analytics-year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className={yearSelect}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </>
          )}

          <button
            type="button"
            onClick={() => setReportOpen(true)}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] font-semibold font-poppins cursor-pointer border border-[#4E69D3] bg-[#4E69D3] text-white transition-colors hover:bg-[#3F57B8] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {generating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileDown size={16} />
            )}
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>

        {stats && (
          <p
            className={`text-xs font-semibold ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            Report will cover:{' '}
            <span className="font-bold">
              {stats.rangeLabel ?? 'selected filter'}
            </span>
          </p>
        )}
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
                <strong>{stats?.rangeLabel ?? rangeLabel}</strong>. Try{' '}
                <strong>All Time</strong>
                {byYear ? ' or a different year' : ''} to view historical
                analytics.
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
                <CardHeader
                    darkMode={darkMode}
                    title="Appointment outcomes"
                    titleClass={title}
                    onView={() => openDetails('outcomes')}
                  />

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
                  <EmptyState
                    darkMode={darkMode}
                    icon="chart"
                    title="No outcome data"
                    text="No appointment outcome data available."
                  />
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
                        onClick={() => openDetails('reasons', r.label)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    darkMode={darkMode}
                    icon="chart"
                    title="No reasons recorded"
                    text="No appointment reason data available."
                  />
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
                        onClick={() => openDetails('peakHours', h.label)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    darkMode={darkMode}
                    icon="chart"
                    title="No peak-hour data"
                    text="No peak-hour data available."
                  />
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
                <CardHeader
                    darkMode={darkMode}
                    title="Service utilization"
                    titleClass={title}
                    onView={() => openDetails('serviceShare')}
                  />

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
                  <EmptyState
                    darkMode={darkMode}
                    icon="chart"
                    title="No service data"
                    text="No service data available."
                  />
                )}
              </div>

              <div className={`${card} p-6`}>
                <CardHeader
                    darkMode={darkMode}
                    title="Age group distribution"
                    titleClass={title}
                    onView={() => openDetails('ageGroups')}
                  />

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
                  <EmptyState
                    darkMode={darkMode}
                    icon="users"
                    title="No age-group data"
                    text="No age-group data available."
                  />
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
                    <CardHeader
                    darkMode={darkMode}
                    title="Disease / case reports"
                    titleClass={title}
                    onView={() => openDetails('diseases')}
                  />
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
                  <EmptyState
                    darkMode={darkMode}
                    icon="chart"
                    title="No medical case data"
                    text="No medical case data available."
                  />
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
                  <EmptyState
                    darkMode={darkMode}
                    icon="users"
                    title="No demographic data"
                    text="No demographic data available."
                  />
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
                <CardHeader
                    darkMode={darkMode}
                    title="Sex by service"
                    titleClass={title}
                    onView={() => openDetails('sexByService')}
                  />

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
                <CardHeader
                    darkMode={darkMode}
                    title="Immunization activity"
                    titleClass={title}
                    onView={() => openDetails('immunization')}
                  />

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
                <CardHeader
                    darkMode={darkMode}
                    title="Blood type distribution"
                    titleClass={title}
                    onView={() => openDetails('bloodTypes')}
                  />

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

      {detail?.open && (
        <DetailsModal
          darkMode={darkMode}
          title={
            detail.label
              ? `${detail.label}`
              : ANALYTICS_REPORT_SECTIONS.find((s) => s.key === detail.section)?.label ?? 'Details'
          }
          subtitle={rangeLabel}
          section={detail.section}
          rows={detailRows}
          total={detailTotal}
          loading={detailLoading}
          onClose={() => setDetail(null)}
        />
      )}

      {reportOpen && (
        <ReportSectionsDialog
          darkMode={darkMode}
          selected={reportSections}
          busy={generating}
          rangeLabel={stats?.rangeLabel ?? rangeLabel}
          onToggle={(key) =>
            setReportSections((prev) =>
              prev.includes(key)
                ? prev.filter((k) => k !== key)
                : [...prev, key],
            )
          }
          onSelectAll={() =>
            setReportSections([...DEFAULT_ANALYTICS_REPORT_SECTIONS])
          }
          onClear={() => setReportSections([])}
          onClose={() => setReportOpen(false)}
          onConfirm={() => handleGenerateReport(reportSections)}
        />
      )}
    </div>
  )
}

function DetailsModal({
  darkMode,
  title,
  subtitle,
  section,
  rows,
  total,
  loading,
  onClose,
}: {
  darkMode: boolean
  title: string
  subtitle: string
  section: AnalyticsDetailSection
  rows: AnalyticsDetailRow[]
  total: number
  loading: boolean
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const columns =
    ANALYTICS_DETAIL_COLUMNS[section] ?? DEFAULT_ANALYTICS_DETAIL_COLUMNS

  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10)
  }

  const th = `px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide whitespace-nowrap ${
    darkMode ? 'text-gray-400' : 'text-gray-500'
  }`
  const td = `px-3 py-2 text-[13px] whitespace-nowrap ${darkMode ? 'text-gray-200' : 'text-[#2A2E43]'}`

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="analytics-details-title"
        className={`relative w-full max-w-5xl rounded-2xl border shadow-2xl flex flex-col max-h-[88vh] ${
          darkMode ? 'bg-[#2d1b4e] border-white/10' : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex items-start justify-between gap-3 p-5 sm:p-6 pb-3">
          <div>
            <h2
              id="analytics-details-title"
              className={`text-lg font-bold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'}`}
            >
              {title}
            </h2>
            <p
              className={`text-xs mt-1 mb-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
            >
              {subtitle} ·{' '}
              {loading
                ? 'Loading records…'
                : `${total.toLocaleString()} record${total === 1 ? '' : 's'}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`rounded-lg p-1.5 transition ${
              darkMode ? 'text-gray-400 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-100'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 sm:px-6 pb-5 sm:pb-6 overflow-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2">
              <Loader2 size={20} className="animate-spin text-[#4E69D3]" />
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Loading patient records…
              </span>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p
                className={`text-sm font-semibold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
              >
                No records found
              </p>
              <p
                className={`text-xs mt-1 mb-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
              >
                There are no patient records for this selection.
              </p>
            </div>
          ) : (
            <>
              {total > rows.length && (
                <p
                  className={`text-[11px] mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  Showing the {rows.length.toLocaleString()} most recent of{' '}
                  {total.toLocaleString()} records.
                </p>
              )}
              <table className="w-full border-collapse">
                <thead
                  className={`sticky top-0 z-10 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'}`}
                >
                  <tr className={`border-b ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
                    {columns.map((c) => (
                      <th
                        key={c.key}
                        className={`${th} ${c.align === 'right' ? 'text-right' : ''}`}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.key}
                      className={`border-b ${darkMode ? 'border-white/5' : 'border-gray-100'}`}
                    >
                      {columns.map((c) => {
                        const raw = (r as unknown as Record<string, unknown>)[c.key]
                        const value =
                          raw === null || raw === undefined || raw === '' ? '—' : String(raw)
                        const isDate = c.key === 'date'
                        const isLong = c.key === 'diagnosis'
                        return (
                          <td
                            key={c.key}
                            title={isLong ? value : undefined}
                            className={`${td} ${c.align === 'right' ? 'text-right' : ''} ${
                              isLong ? 'max-w-[280px] truncate' : ''
                            } ${c.key === 'patientName' ? 'font-semibold' : ''}`}
                          >
                            {isDate ? fmtDate(value) : value}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ReportSectionsDialog({
  darkMode,
  selected,
  busy,
  rangeLabel,
  onToggle,
  onSelectAll,
  onClear,
  onClose,
  onConfirm,
}: {
  darkMode: boolean
  selected: AnalyticsReportSectionKey[]
  busy: boolean
  rangeLabel: string
  onToggle: (key: AnalyticsReportSectionKey) => void
  onSelectAll: () => void
  onClear: () => void
  onClose: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    if (!busy) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const allSelected = selected.length === ANALYTICS_REPORT_SECTIONS.length

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="analytics-report-dialog-title"
        className={`relative w-full max-w-lg rounded-2xl border shadow-2xl ${
          darkMode ? 'bg-[#2d1b4e] border-white/10' : 'bg-white border-gray-200'
        }`}
      >
        <div className="p-5 sm:p-6 pb-0">
          <h2
            id="analytics-report-dialog-title"
            className={`text-lg font-bold m-0 ${
              darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'
            }`}
          >
            Generate analytics report
          </h2>
          <p
            className={`text-xs mt-1 mb-0 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            Choose which sections to include. The report will cover{' '}
            <span className="font-bold">{rangeLabel}</span>.
          </p>
        </div>

        <div className="px-5 sm:px-6 py-4 max-h-[52vh] overflow-y-auto">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span
              className={`text-xs font-semibold ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              {selected.length} of {ANALYTICS_REPORT_SECTIONS.length} selected
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onSelectAll}
                disabled={busy || allSelected}
                className="text-xs font-bold text-[#4E69D3] hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={onClear}
                disabled={busy || selected.length === 0}
                className="text-xs font-bold text-[#4E69D3] hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ANALYTICS_REPORT_SECTIONS.map((section) => {
              const checked = selected.includes(section.key)
              return (
                <label
                  key={section.key}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                    darkMode
                      ? checked
                        ? 'bg-[#1e1438] border-[#4E69D3]'
                        : 'bg-transparent border-white/10 hover:border-white/25'
                      : checked
                        ? 'bg-indigo-50 border-[#4E69D3]'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                  } ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={busy}
                    onChange={() => onToggle(section.key)}
                    className="w-4 h-4 accent-[#4E69D3] cursor-pointer flex-shrink-0"
                  />
                  <span
                    className={`text-[13px] font-semibold leading-tight ${
                      darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'
                    }`}
                  >
                    {section.label}
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        <div
          className={`flex items-center justify-end gap-3 p-5 sm:p-6 pt-4 border-t ${
            darkMode ? 'border-white/10' : 'border-gray-200'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={`px-4 py-2.5 rounded-lg text-[14px] font-semibold cursor-pointer border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              darkMode
                ? 'bg-[#1e1438] text-[#F9FAFB] border-white/10'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || selected.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] font-semibold cursor-pointer border border-[#4E69D3] bg-[#4E69D3] text-white transition-colors hover:bg-[#3F57B8] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileDown size={16} />
            )}
            {busy ? 'Generating...' : 'Generate PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Card title with an optional "View details" drill-down affordance.
function CardHeader({
  darkMode,
  title,
  titleClass,
  onView,
}: {
  darkMode: boolean
  title: string
  titleClass: string
  onView?: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-2 mb-1">
      <h3 className={titleClass}>{title}</h3>
      {onView && (
        <button
          type="button"
          onClick={onView}
          className="flex-shrink-0 text-[11px] font-bold text-[#4E69D3] hover:underline cursor-pointer"
        >
          View details
        </button>
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


function BarRow({
  darkMode,
  label,
  count,
  pct,
  color,
  labelWidth,
  onClick,
}: {
  darkMode: boolean
  label: string
  count: number
  pct: number
  color: string
  labelWidth: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      title={onClick ? `View patients for ${label}` : undefined}
      className={`flex items-center gap-3 ${
        onClick ? 'cursor-pointer hover:opacity-80 transition-opacity rounded-lg' : ''
      }`}
    >
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
