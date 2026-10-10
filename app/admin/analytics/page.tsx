'use client'

import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { ChevronDown, Eye, FileDown, Loader2, X } from 'lucide-react'
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
  analyticsDetailSectionLabel,
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

  // The record count only makes sense for bounded filters (week / month /
  // year). "All Time" has no date window, so its number is hidden.
  const showRecordCount =
    byYear ||
    (ANALYTICS_RANGES.find((r) => r.key === rangeKey)?.days ?? 0) > 0

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
        if (cancelled) return
        if (res.success && res.stats) {
          setStats(res.stats)
        } else {
          setStats(null)
          toast.error(res.message || 'Failed to load analytics data.')
        }
      } catch {
        if (!cancelled) {
          setStats(null)
          toast.error('Failed to load analytics data. Please try again.')
        }
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
      let patientRowsTotal: number | undefined
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
            patientRowsTotal = res.totalMatched
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
        patientRowsTotal,
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
    const denom = rows.reduce((sum, r) => sum + r.count, 0) || 1

    return rows.map((r, i) => ({
      label: r.label,
      color: COLORS[i % COLORS.length],
      count: r.count,
      pct: parseFloat(((r.count / denom) * 100).toFixed(1)),
    }))
  }

  const sumCounts = (items: Array<{ count: number }>) =>
    items.reduce((sum, i) => sum + i.count, 0)

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

  const bloodTypesData = buildData(stats?.bloodTypes ?? [])
  const bloodTypesTotal = sumCounts(bloodTypesData)

  const immunizationData = buildData(stats?.immunization ?? [])
  const immunizationTotal = sumCounts(immunizationData)

  const sexTotals = (stats?.sexByService ?? []).reduce(
    (acc, s) => ({ male: acc.male + s.male, female: acc.female + s.female }),
    { male: 0, female: 0 },
  )
  const sexTotal = sexTotals.male + sexTotals.female
  const sexShare = (n: number) =>
    sexTotal > 0 ? parseFloat(((n / sexTotal) * 100).toFixed(1)) : 0
  const sexData: Array<Category & { pct: number; count: number }> = [
    { label: 'Male', color: '#0EA5E9', count: sexTotals.male, pct: sexShare(sexTotals.male) },
    {
      label: 'Female',
      color: '#818CF8',
      count: sexTotals.female,
      pct: sexShare(sexTotals.female),
    },
  ]

  const summary = [
    {
      label: 'Total Appointments',
      value: fmt(total),
      sub: rangeLabel,
      color: '#4E69D3',
      onView: () => openDetails('serviceShare'),
    },
    {
      label: 'Completed',
      value: `${stats?.completionRate ?? 0}%`,
      sub: 'completion rate',
      color: '#10B981',
      onView: () => openDetails('outcomes', 'Completed'),
    },
    {
      label: 'No-Shows',
      value: `${stats?.noShowRate ?? 0}%`,
      sub: 'of appointments',
      color: '#EF4444',
      onView: () => openDetails('outcomes', 'No Show'),
    },
    {
      label: 'Repeat Visits',
      value: fmt(stats?.repeatVisits ?? 0),
      sub: `${(repeatRate * 100).toFixed(0)}% return rate`,
      color: '#EC4899',
      onView: () => openDetails('repeatVisits'),
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
                  <button
                    type="button"
                    onClick={item.onView}
                    className="mt-3 text-[11px] font-bold hover:underline cursor-pointer text-left"
                    style={{ color: item.color }}
                  >
                    View details
                  </button>
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
            onView={(section, label) => openDetails(section, label ?? null)}
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
                  <PieBreakdown
                    darkMode={darkMode}
                    data={appointmentOutcomesData}
                    total={sumCounts(appointmentOutcomesData)}
                    centerLabel="Appointments"
                    onSelect={(item) => openDetails('outcomes', item.label)}
                  />
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
                <CardHeader
                  darkMode={darkMode}
                  title="Top appointment reasons"
                  titleClass={title}
                  onView={() => openDetails('reasons')}
                />

                {appointmentReasonsData.length > 0 ? (
                  <PieBreakdown
                    darkMode={darkMode}
                    data={appointmentReasonsData}
                    total={sumCounts(appointmentReasonsData)}
                    centerLabel="Appointments"
                    onSelect={(item) => openDetails('reasons', item.label)}
                  />
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
                <CardHeader
                  darkMode={darkMode}
                  title="Peak hours"
                  titleClass={title}
                  onView={() => openDetails('peakHours')}
                />

                {peakHoursData.length > 0 ? (
                  <PieBreakdown
                    darkMode={darkMode}
                    data={peakHoursData}
                    total={sumCounts(peakHoursData)}
                    centerLabel="Appointments"
                    onSelect={(item) => openDetails('peakHours', item.label)}
                  />
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
                  <PieBreakdown
                    darkMode={darkMode}
                    data={serviceShareData}
                    total={sumCounts(serviceShareData)}
                    centerLabel="Appointments"
                    onSelect={(item) => openDetails('serviceShare', item.label)}
                  />
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
                  <PieBreakdown
                    darkMode={darkMode}
                    data={ageGroupsData}
                    total={ageGroupsTotal}
                    centerLabel="Patients"
                    onSelect={(item) => openDetails('ageGroups', item.label)}
                  />
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
                  <PieBreakdown
                    darkMode={darkMode}
                    data={diseasesData}
                    total={diseaseCases}
                    centerLabel="Cases"
                    onSelect={(item) => openDetails('diseases', item.label)}
                  />
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
                  <CardHeader
                    darkMode={darkMode}
                    title="PWD & senior citizen overview"
                    titleClass={title}
                    onView={() => openDetails('pwd')}
                  />
                  <p className={`${sub} mt-1 mb-5`}>
                    Registered PWD and senior citizens accounted for in the{' '}
                    {rangeLabel}.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ProfileStat
                      darkMode={darkMode}
                      label="PWD Registered"
                      value={stats.pwdStats.total}
                      pct={`${stats.pwdStats.pct}% of users`}
                      color="#4E69D3"
                      onView={() => openDetails('pwd')}
                    />
                    <ProfileStat
                      darkMode={darkMode}
                      label="Senior Citizens"
                      value={stats.pwdStats.seniorCitizens}
                      pct={`${stats.pwdStats.seniorPct}% of users`}
                      color="#F59E0B"
                      onView={() => openDetails('senior')}
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
                  <PieBreakdown
                    darkMode={darkMode}
                    data={sexData}
                    total={sexTotal}
                    centerLabel="Patients"
                    onSelect={(item) => openDetails('sexByService', item.label)}
                    footer={
                      <div
                        className={`rounded-xl border p-3 ${
                          darkMode
                            ? 'bg-[#1e1438] border-white/10'
                            : 'bg-gray-50 border-gray-100'
                        }`}
                      >
                        <p
                          className={`text-[11px] font-bold uppercase tracking-wide m-0 mb-2 ${
                            darkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}
                        >
                          Patients by service
                        </p>
                        <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto pr-1">
                          {stats!.sexByService.map((s) => (
                            <button
                              key={s.service}
                              type="button"
                              onClick={() => openDetails('sexByService', s.service)}
                              title={`View patients for ${s.service}`}
                              className={`flex items-center justify-between gap-3 w-full text-left rounded-lg px-2 py-1.5 cursor-pointer transition-colors ${
                                darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                              }`}
                            >
                              <span
                                className={`text-[12px] font-semibold truncate flex-1 ${
                                  darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'
                                }`}
                              >
                                {s.service}
                              </span>
                              <span className="text-[11px] font-bold whitespace-nowrap text-sky-500">
                                M {s.male}
                                <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>
                                  {' '}
                                  ·{' '}
                                </span>
                                <span className="text-indigo-400">F {s.female}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    }
                  />
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

                {immunizationData.length > 0 ? (
                  <PieBreakdown
                    darkMode={darkMode}
                    data={immunizationData}
                    total={immunizationTotal}
                    centerLabel="Doses"
                    onSelect={(item) => openDetails('immunization', item.label)}
                  />
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

                {bloodTypesData.length > 0 ? (
                  <PieBreakdown
                    darkMode={darkMode}
                    data={bloodTypesData}
                    total={bloodTypesTotal}
                    centerLabel="Patients"
                    onSelect={(item) => openDetails('bloodTypes', item.label)}
                  />
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
          title={analyticsDetailSectionLabel(detail.section)}
          subtitle={
            detail.label ? `${rangeLabel} · ${detail.label}` : rangeLabel
          }
          section={detail.section}
          category={detail.label}
          rows={detailRows}
          total={detailTotal}
          loading={detailLoading}
          showCount={showRecordCount}
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

// ISO timestamp → "YYYY-MM-DD".
const fmtIsoDate = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10)
}

// Complete patient details for one drill-down row: who the patient is, how to
// reach them, and the visit that put them in the analytic being viewed.
function PatientDetailCard({
  darkMode,
  row,
  report,
  category,
}: {
  darkMode: boolean
  row: AnalyticsDetailRow
  report: string
  category: string | null
}) {
  const groups: { title: string; items: { label: string; value: string }[] }[] =
    [
      {
        title: 'Patient details',
        items: [
          { label: 'Full name', value: row.patientName },
          { label: 'Booked as', value: row.relation },
          { label: 'Date of birth', value: row.birthdate ?? '—' },
          { label: 'Age', value: row.age === null ? '—' : `${row.age}` },
          { label: 'Sex', value: row.sex },
          { label: 'Blood type', value: row.bloodType || '—' },
          { label: 'Patient ref.', value: row.patientRef },
        ],
      },
      {
        title: 'Contact & address',
        items: [
          { label: 'Address', value: row.address },
          { label: 'Contact number', value: row.contact },
          { label: 'PhilHealth', value: row.philHealth },
          { label: 'Religion', value: row.religion },
        ],
      },
      {
        title: `${report} record`,
        items: [
          ...(category ? [{ label: 'Matches', value: category }] : []),
          { label: 'Service', value: row.service },
          { label: 'Reason', value: row.reason },
          { label: 'Outcome', value: row.outcome },
          ...(row.disease && row.disease !== '—'
            ? [{ label: 'Condition', value: row.disease }]
            : []),
          ...(row.diagnosis ? [{ label: 'Diagnosis', value: row.diagnosis }] : []),
          { label: 'Visit date', value: fmtIsoDate(row.date) },
          { label: 'Time slot', value: row.slot },
          {
            label: 'Booked on',
            value: row.bookedOn ? fmtIsoDate(row.bookedOn) : '—',
          },
          {
            label: 'Source',
            value: row.source === 'WALK_IN' ? 'Walk-in' : 'Booking',
          },
          { label: 'Visits in range', value: String(row.visits ?? 1) },
          { label: 'Recorded by', value: row.checkedBy || '—' },
          { label: 'Appointment ref.', value: row.appointmentRef },
        ],
      },
    ]

  const panel = darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
  const label = darkMode ? 'text-gray-400' : 'text-gray-500'
  const value = darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'

  return (
    <div
      className={`px-4 py-4 border-t ${darkMode ? 'bg-white/[0.03]' : 'bg-gray-50'}`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {groups.map((g) => (
          <div
            key={g.title}
            className={`rounded-xl border overflow-hidden ${panel}`}
          >
            <div
              className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wide border-b ${
                darkMode
                  ? 'border-white/10 bg-white/5 text-gray-400'
                  : 'border-gray-200 bg-gray-100 text-gray-500'
              }`}
            >
              {g.title}
            </div>
            <table className="w-full border-collapse">
              <tbody>
                {g.items.map((it) => (
                  <tr
                    key={it.label}
                    className={`border-b last:border-b-0 ${
                      darkMode ? 'border-white/5' : 'border-gray-100'
                    }`}
                  >
                    <th
                      scope="row"
                      className={`px-3 py-1.5 text-left align-top whitespace-nowrap w-[42%] text-[12px] font-semibold font-normal ${label}`}
                    >
                      {it.label}
                    </th>
                    <td
                      className={`px-3 py-1.5 text-[12px] font-bold break-words ${value}`}
                    >
                      {it.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}

function DetailsModal({
  darkMode,
  title,
  subtitle,
  section,
  category,
  rows,
  total,
  loading,
  showCount,
  onClose,
}: {
  darkMode: boolean
  title: string
  subtitle: string
  section: AnalyticsDetailSection
  category: string | null
  rows: AnalyticsDetailRow[]
  total: number
  loading: boolean
  showCount: boolean
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => setExpanded(null), [rows])

  const columns =
    ANALYTICS_DETAIL_COLUMNS[section] ?? DEFAULT_ANALYTICS_DETAIL_COLUMNS

  const fmtDate = (iso: string) => fmtIsoDate(iso)

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
              {subtitle}
              {showCount &&
                ` · ${loading ? 'Loading records…' : `${total.toLocaleString()} record${total === 1 ? '' : 's'}`}`}
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
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                {showCount && total > rows.length && (
                  <p
                    className={`text-[11px] m-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    Showing the {rows.length.toLocaleString()} most recent of{' '}
                    {total.toLocaleString()} records.
                  </p>
                )}
                <p
                  className={`text-[11px] m-0 font-semibold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}
                >
                  Use the View button to see the complete patient details.
                </p>
              </div>
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
                    <th className={`${th} text-right`}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const isOpen = expanded === r.key
                    return (
                      <Fragment key={r.key}>
                        <tr
                          className={`border-b transition-colors ${
                            darkMode
                              ? 'border-white/5 hover:bg-white/5'
                              : 'border-gray-100 hover:bg-gray-50'
                          } ${isOpen ? (darkMode ? 'bg-white/5' : 'bg-gray-50') : ''}`}
                        >
                          {columns.map((c) => {
                            const raw = (r as unknown as Record<string, unknown>)[c.key]
                            const value =
                              raw === null || raw === undefined || raw === ''
                                ? '—'
                                : String(raw)
                            const isDate = c.key === 'date'
                            const isLong = c.key === 'diagnosis'
                            const isWide =
                              c.key === 'address' ||
                              c.key === 'philHealth' ||
                              c.key === 'relation'
                            return (
                              <td
                                key={c.key}
                                title={isLong || isWide ? value : undefined}
                                className={`${td} ${c.align === 'right' ? 'text-right' : ''} ${
                                  isLong
                                    ? 'max-w-[280px] truncate'
                                    : isWide
                                      ? 'max-w-[220px] truncate'
                                      : ''
                                } ${c.key === 'patientName' ? 'font-semibold' : ''}`}
                              >
                                {isDate ? fmtDate(value) : value}
                              </td>
                            )
                          })}
                          <td className={`${td} text-right whitespace-nowrap`}>
                            <button
                              type="button"
                              onClick={() => setExpanded(isOpen ? null : r.key)}
                              aria-expanded={isOpen}
                              aria-label={
                                isOpen
                                  ? `Hide details for ${String(
                                      (r as unknown as Record<string, unknown>)
                                        .patientName ?? 'patient',
                                    )}`
                                  : `View details for ${String(
                                      (r as unknown as Record<string, unknown>)
                                        .patientName ?? 'patient',
                                    )}`
                              }
                              title={isOpen ? 'Hide details' : 'View details'}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                                isOpen
                                  ? darkMode
                                    ? 'bg-[#4E69D3]/25 text-[#B9C6FF] hover:bg-[#4E69D3]/35'
                                    : 'bg-[#4E69D3]/10 text-[#4E69D3] hover:bg-[#4E69D3]/20'
                                  : darkMode
                                    ? 'bg-white/10 text-gray-200 hover:bg-white/20'
                                    : 'bg-gray-100 text-[#1d4662] hover:bg-gray-200'
                              }`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {isOpen ? 'Hide' : 'View'}
                              <ChevronDown
                                size={14}
                                className={`transition-transform ${
                                  isOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr
                            className={`border-b ${
                              darkMode ? 'border-white/5' : 'border-gray-100'
                            }`}
                          >
                            <td colSpan={columns.length + 1} className="p-0">
                              <PatientDetailCard
                                darkMode={darkMode}
                                row={r}
                                report={title}
                                category={category}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
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
  onView,
}: {
  darkMode: boolean
  label: string
  value: number
  pct: string
  color: string
  onView?: () => void
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
      {onView && (
        <button
          type="button"
          onClick={onView}
          className="mt-3 text-[11px] font-bold text-[#4E69D3] hover:underline cursor-pointer p-0 border-0 bg-transparent"
        >
          View details
        </button>
      )}
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
  onView,
}: {
  darkMode: boolean
  stats: AnalyticsStats | null
  rangeLabel: string
  total: number
  onView: (section: AnalyticsDetailSection, label?: string | null) => void
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
      onView: () => onView("outcomes", "No Show"),
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
      onView: () => onView("outcomes", "Cancelled"),
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
      onView: () => onView("outcomes", "Completed"),
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
      onView: () => onView("walkIns"),
    },
  ]

  const demandSignals: SignalRow[] = [
    {
      label: "Most used service",
      value: topService
        ? `${topService.label} (${topService.count.toLocaleString()})`
        : "No data",
      onView: topService
        ? () => onView("serviceShare", topService.label)
        : undefined,
    },
    {
      label: "Most common appointment reason",
      value: topReason
        ? `${topReason.label} (${topReason.count.toLocaleString()})`
        : "No data",
      onView: topReason ? () => onView("reasons", topReason.label) : undefined,
    },
    {
      label: "Busiest time",
      value: topHour
        ? `${topHour.label} (${topHour.count.toLocaleString()})`
        : "No data",
      onView: topHour ? () => onView("peakHours", topHour.label) : undefined,
    },
  ]

  const healthSignals: SignalRow[] = [
    {
      label: "Most recorded condition",
      value: topDisease
        ? `${topDisease.label} (${topDisease.count.toLocaleString()})`
        : "No case data",
      onView: topDisease ? () => onView("diseases", topDisease.label) : undefined,
    },
    {
      label: "Recorded cases",
      value: (stats?.diseaseCases ?? 0).toLocaleString(),
      onView:
        (stats?.diseaseCases ?? 0) > 0 ? () => onView("diseases") : undefined,
    },
    {
      label: "Repeat visits",
      value: repeatVisits.toLocaleString(),
      onView: repeatVisits > 0 ? () => onView("repeatVisits") : undefined,
    },
  ]

  return (
    <div className={`${darkMode ? "bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]" : "bg-white border-[rgba(15,60,95,0.10)]"} p-6 rounded-[18px] border mb-[22px]`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className={`text-xl font-bold m-0 ${darkMode ? "text-[#F9FAFB]" : "text-[#2A2E43]"}`}>
            Decision support
          </h3>
          <p className={`m-0 text-[14px] mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Automated indicators for the {rangeLabel}. These are not medical diagnoses.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onView("serviceShare")}
          className="flex-shrink-0 text-[11px] font-bold text-[#4E69D3] hover:underline cursor-pointer"
        >
          View details
        </button>
      </div>

      <div className="mb-4">
        <h4 className={`text-sm font-bold m-0 mb-3 ${darkMode ? "text-[#F9FAFB]" : "text-[#2A2E43]"}`}>
          Performance indicators
        </h4>
        <IndicatorTable darkMode={darkMode} rows={indicators} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`rounded-2xl border p-4 ${darkMode ? "bg-[#1e1438] border-white/10" : "bg-gray-50 border-gray-100"}`}>
          <h4 className={`text-sm font-bold m-0 mb-3 ${darkMode ? "text-[#F9FAFB]" : "text-[#2A2E43]"}`}>
            Demand signals
          </h4>
          <SignalTable darkMode={darkMode} rows={demandSignals} />
        </div>

        <div className={`rounded-2xl border p-4 ${darkMode ? "bg-[#1e1438] border-white/10" : "bg-gray-50 border-gray-100"}`}>
          <h4 className={`text-sm font-bold m-0 mb-3 ${darkMode ? "text-[#F9FAFB]" : "text-[#2A2E43]"}`}>
            Health monitoring signals
          </h4>
          <SignalTable darkMode={darkMode} rows={healthSignals} />
        </div>
      </div>
    </div>
  )
}

type SignalRow = {
  label: string
  value: string
  onView?: () => void
}

function SignalTable({
  darkMode,
  rows,
}: {
  darkMode: boolean
  rows: SignalRow[]
}) {
  const th = `px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide whitespace-nowrap ${
    darkMode ? "text-gray-400" : "text-gray-500"
  }`
  const td = `px-3 py-2.5 text-[13px] ${
    darkMode ? "text-gray-300" : "text-[#2A2E43]"
  }`

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className={`border-b ${darkMode ? "border-white/10" : "border-gray-200"}`}>
          <th className={th}>Signal</th>
          <th className={`${th} text-right`}>Value</th>
          <th className={`${th} text-right`}>
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.label}
            className={`border-b last:border-b-0 ${
              darkMode ? "border-white/5" : "border-gray-100"
            }`}
          >
            <td
              className={`${td} font-medium whitespace-nowrap ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {row.label}
            </td>
            <td className={`${td} text-right font-bold`}>{row.value}</td>
            <td className={`${td} text-right`}>
              {row.onView ? (
                <button
                  type="button"
                  onClick={row.onView}
                  className={`text-[11px] font-bold whitespace-nowrap hover:underline cursor-pointer p-0 border-0 bg-transparent ${
                    darkMode ? "text-[#8FA5F5]" : "text-[#4E69D3]"
                  }`}
                >
                  View details
                </button>
              ) : (
                <span className={`text-[11px] ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                  —
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
/** One row of the decision-support performance-indicator table. */
type Indicator = {
  label: string
  value: string
  detail: string
  status: "attention" | "watch" | "normal"
  /** Drill-down to the patients behind this indicator. */
  onView: () => void
}

function IndicatorTable({
  darkMode,
  rows,
}: {
  darkMode: boolean
  rows: Indicator[]
}) {
  const th = `px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide whitespace-nowrap ${
    darkMode ? "text-gray-400" : "text-gray-500"
  }`
  const td = `px-3 py-2.5 text-[13px] align-top ${
    darkMode ? "text-gray-300" : "text-[#2A2E43]"
  }`

  const statusBadge = (status: Indicator["status"]) => {
    const map = {
      attention: {
        text: "Attention",
        className: darkMode
          ? "bg-red-950/40 text-red-300 border-red-500/30"
          : "bg-red-50 text-red-700 border-red-200",
      },
      watch: {
        text: "Monitor",
        className: darkMode
          ? "bg-amber-950/40 text-amber-300 border-amber-500/30"
          : "bg-amber-50 text-amber-700 border-amber-200",
      },
      normal: {
        text: "Normal",
        className: darkMode
          ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
          : "bg-emerald-50 text-emerald-700 border-emerald-200",
      },
    }[status]
    return (
      <span
        className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${map.className}`}
      >
        {map.text}
      </span>
    )
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className={`border-b ${darkMode ? "border-white/10" : "border-gray-200"}`}>
          <th className={th}>Indicator</th>
          <th className={`${th} text-right`}>Value</th>
          <th className={th}>Status</th>
          <th className={th}>Assessment</th>
          <th className={`${th} text-right`}>
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.label}
            className={`border-b last:border-b-0 ${
              darkMode ? "border-white/5" : "border-gray-100"
            }`}
          >
            <td
              className={`${td} font-medium whitespace-nowrap ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {row.label}
            </td>
            <td className={`${td} text-right font-bold whitespace-nowrap`}>
              {row.value}
            </td>
            <td className={td}>{statusBadge(row.status)}</td>
            <td
              className={`${td} max-w-[420px] ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {row.detail}
            </td>
            <td className={`${td} text-right`}>
              <button
                type="button"
                onClick={row.onView}
                className={`text-[11px] font-bold whitespace-nowrap hover:underline cursor-pointer p-0 border-0 bg-transparent ${
                  darkMode ? "text-[#8FA5F5]" : "text-[#4E69D3]"
                }`}
              >
                View details
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}




function PieBreakdown({
  darkMode,
  data,
  total,
  centerLabel = 'Total',
  onSelect,
  footer,
}: {
  darkMode: boolean
  data: Array<Category & { pct: number; count: number }>
  total: number
  centerLabel?: string
  onSelect?: (item: Category & { pct: number; count: number }) => void
  footer?: ReactNode
}) {
  const r = 80
  const C = 2 * Math.PI * r
  const [hovered, setHovered] = useState<string | null>(null)
  const active = hovered ? data.find((o) => o.label === hovered) : null
  let acc = 0

  return (
    <div className="flex flex-col gap-4">
    <div className="relative w-[230px] h-[230px] flex-shrink-0 self-center">
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
              onClick={() => onSelect?.(o)}
            >
              <title>{`View patients for ${o.label}`}</title>
            </circle>
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

      <div className="flex flex-col gap-0.5 max-h-[260px] overflow-y-auto pr-1">
        {data.map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => onSelect?.(o)}
            disabled={!onSelect}
            title={onSelect ? `View patients for ${o.label}` : undefined}
            className={`flex items-center gap-2.5 w-full text-left rounded-lg px-2 py-1.5 transition-colors ${
              onSelect ? 'cursor-pointer' : 'cursor-default'
            } ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'} ${
              hovered === o.label
                ? darkMode
                  ? 'bg-white/10'
                  : 'bg-gray-100'
                : ''
            }`}
            onMouseEnter={() => setHovered(o.label)}
            onMouseLeave={() => setHovered(null)}
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: o.color }}
            />
            <span
              className={`flex-1 min-w-0 text-[13px] font-semibold truncate ${
                darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'
              }`}
            >
              {o.label}
            </span>
            <span
              className={`text-[13px] font-bold whitespace-nowrap ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              {o.count.toLocaleString()}
            </span>
            <span
              className={`w-12 text-right text-[12px] font-semibold whitespace-nowrap ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              {o.pct}%
            </span>
          </button>
        ))}
      </div>

      {footer}

      {onSelect && (
        <p
          className={`text-[11px] font-semibold m-0 ${
            darkMode ? 'text-gray-500' : 'text-gray-400'
          }`}
        >
          Select a slice or a category to view the patients behind it.
        </p>
      )}
    </div>
  )
}
