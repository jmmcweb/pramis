// This file contains the logic for generating the Analytics Report PDF. It uses jsPDF to create a PDF document with various sections, including key performance indicators, service utilization, appointment reasons, outcomes, peak hours, age group distribution, disease/case reports, sex by service, immunization activity, blood type distribution, and average vital signs. The report is generated based on the provided statistics and metadata, and it can be downloaded by the user.

import { jsPDF } from 'jspdf'
import type { AnalyticsBreakdown, AnalyticsStats } from '@/lib/actions/analytics'
import {
  ANALYTICS_DETAIL_COLUMNS,
  DEFAULT_ANALYTICS_DETAIL_COLUMNS,
  DEFAULT_ANALYTICS_REPORT_SECTIONS,
  type AnalyticsRangeKey,
  type AnalyticsReportSectionKey,
} from '@/lib/constants/analytics'

const PAGE_W = 210 // A4 portrait
const PAGE_H = 297
const M = 14 // margin
const INNER = PAGE_W - M * 2 // usable width
const FOOT_Y = PAGE_H - 12 // footer baseline

type RGB = [number, number, number]

const INK: RGB = [29, 70, 98] // #1d4662 headings
const BODY: RGB = [42, 46, 67] // #2A2E43 body text
const MUTED: RGB = [107, 114, 128] // #6B7280
const BRAND: RGB = [78, 105, 211] // #4E69D3
const LINE: RGB = [226, 232, 240] // #E2E8F0
const TRACK: RGB = [232, 234, 246] // #E8EAF6 bar track
const SOFT: RGB = [241, 245, 249] // #F1F5F9 cell fill

// Same categorical palette used by the Analytics page charts.
const PALETTE: RGB[] = [
  [78, 105, 211],
  [14, 165, 233],
  [16, 185, 129],
  [245, 158, 11],
  [236, 72, 153],
  [139, 92, 246],
  [239, 68, 68],
  [20, 184, 166],
]

export type AnalyticsReportMeta = {
  rangeKey: AnalyticsRangeKey
  rangeLabel: string
  year?: number | null
  generatedBy?: string | null
  sections?: AnalyticsReportSectionKey[]
  patientRows?: Array<{
    patientName: string
    age: number | null
    sex: string
    service: string
    reason: string
    outcome: string
    date: string
    diagnosis: string
    bloodType?: string
    slot?: string
    disease?: string
    checkedBy?: string
  }>
  appendixSection?: string
  patientRowsTruncated?: boolean
}

const nf = (n: number) => (Number.isFinite(n) ? n.toLocaleString() : '0')

const pct = (count: number, denom: number) =>
  denom > 0 ? (count / denom) * 100 : 0

const stamp = (d: Date) =>
  d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

/**
 * Builds the Analytics Report PDF and triggers the browser download.
 * @param stats Statistics for the active filter, from `getAnalyticsStats`.
 * @param meta The filter that produced `stats`, plus the generating admin.
 */
export const generateAnalyticsReportPdf = (
  stats: AnalyticsStats,
  meta: AnalyticsReportMeta,
) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const chosen = new Set<AnalyticsReportSectionKey>(
    meta.sections?.length ? meta.sections : DEFAULT_ANALYTICS_REPORT_SECTIONS,
  )
  const has = (key: AnalyticsReportSectionKey) => chosen.has(key)

  let y = M

  const ensure = (h: number) => {
    if (y + h > FOOT_Y - 6) {
      doc.addPage()
      y = M
      return true
    }
    return false
  }

  const text = (
    t: string,
    x: number,
    yy: number,
    opts: {
      style?: 'normal' | 'bold' | 'italic'
      size?: number
      color?: RGB
      align?: 'left' | 'center' | 'right'
    } = {},
  ) => {
    const { style = 'normal', size = 9, color = BODY, align = 'left' } = opts
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(color[0], color[1], color[2])
    if (align === 'center') doc.text(t, x, yy, { align: 'center' })
    else if (align === 'right') doc.text(t, x, yy, { align: 'right' })
    else doc.text(t, x, yy)
  }

  const clip = (t: string, width: number, size = 8.5) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(t || '', width) as string[]
    if (lines.length <= 1) return t || ''
    let out = lines[0]
    while (out.length > 1 && doc.getTextWidth(`${out}...`) > width) {
      out = out.slice(0, -1)
    }
    return `${out.trimEnd()}...`
  }

  const sectionHeading = (t: string) => {
    ensure(16)
    text(t.toUpperCase(), M, y + 4, { style: 'bold', size: 11, color: INK })
    doc.setDrawColor(BRAND[0], BRAND[1], BRAND[2])
    doc.setLineWidth(0.8)
    doc.line(M, y + 6.6, M + 22, y + 6.6)
    doc.setDrawColor(LINE[0], LINE[1], LINE[2])
    doc.setLineWidth(0.25)
    doc.line(M + 24, y + 6.6, M + INNER, y + 6.6)
    y += 11
  }

  const noData = (note: string) => {
    ensure(10)
    doc.setFillColor(SOFT[0], SOFT[1], SOFT[2])
    doc.setDrawColor(LINE[0], LINE[1], LINE[2])
    doc.setLineWidth(0.25)
    doc.rect(M, y, INNER, 8, 'FD')
    text(note, M + 3, y + 5.2, { size: 8.5, color: MUTED, style: 'italic' })
    y += 12
  }

  const breakdown = (
    rows: AnalyticsBreakdown[],
    denom: number,
    limit = 10,
  ) => {
    const shown = rows.slice(0, limit)
    const LBL_W = 56
    const BAR_X = M + LBL_W + 2
    const BAR_W = 62
    const ROW_H = 7

    shown.forEach((r, i) => {
      ensure(ROW_H)
      const p = pct(r.count, denom)
      const color = PALETTE[i % PALETTE.length]

      text(
        clip(r.label, LBL_W),
        M,
        y + 4.6,
        { size: 8.5, color: BODY },
      )

      doc.setFillColor(TRACK[0], TRACK[1], TRACK[2])
      doc.roundedRect(BAR_X, y + 2.2, BAR_W, 3, 1.5, 1.5, 'F')
      const w = Math.max(p > 0 ? 1.5 : 0, (BAR_W * p) / 100)
      if (w > 0) {
        doc.setFillColor(color[0], color[1], color[2])
        doc.roundedRect(BAR_X, y + 2.2, w, 3, 1.5, 1.5, 'F')
      }

      text(`${p.toFixed(1)}%`, M + INNER, y + 4.6, {
        size: 8.5,
        align: 'right',
        color: MUTED,
      })
      text(nf(r.count), M + INNER + 16, y + 4.6, {
        size: 8.5,
        style: 'bold',
        align: 'right',
      })

      y += ROW_H
    })

    if (rows.length > shown.length) {
      ensure(6)
      text(
        `+ ${nf(rows.length - shown.length)} more not shown`,
        M,
        y + 4,
        { size: 7.5, color: MUTED, style: 'italic' },
      )
      y += 7
    }
    y += 2
  }

  const simpleTable = (
    headers: string[],
    rows: string[][],
    cols: Array<{ w: number; align?: 'left' | 'right' }>,
    opts: { zebra?: boolean } = {},
  ) => {
    const { zebra = true } = opts
    const HEAD_H = 7
    const ROW_H = 6.4

    const drawHead = () => {
      ensure(HEAD_H + ROW_H)
      doc.setFillColor(78, 105, 211)
      doc.rect(M, y, INNER, HEAD_H, 'F')
      let x = M
      headers.forEach((h, i) => {
        text(h.toUpperCase(), x + 2.5, y + 4.7, {
          size: 7.5,
          style: 'bold',
          color: [255, 255, 255],
          align: cols[i].align ?? 'left',
        })
        x += cols[i].w
      })
      y += HEAD_H
    }

    drawHead()

    rows.forEach((r, ri) => {
      if (y + ROW_H > FOOT_Y - 6) {
        doc.addPage()
        y = M
        drawHead()
      }
      if (zebra && ri % 2 === 1) {
        doc.setFillColor(SOFT[0], SOFT[1], SOFT[2])
        doc.rect(M, y, INNER, ROW_H, 'F')
      }
      doc.setDrawColor(LINE[0], LINE[1], LINE[2])
      doc.setLineWidth(0.2)
      doc.line(M, y + ROW_H, M + INNER, y + ROW_H)

      let x = M
      r.forEach((cell, ci) => {
        const col = cols[ci]
        const align = col.align ?? 'left'
        const avail = col.w - 5
        text(clip(cell, avail, 8.5), align === 'right' ? x + col.w - 2.5 : x + 2.5, y + 4.3, {
          size: 8.5,
          style: ci === 0 ? 'bold' : 'normal',
          color: BODY,
          align,
        })
        x += col.w
      })
      y += ROW_H
    })

    y += 4
  }

  const kpiGrid = (items: Array<{ label: string; value: string; sub: string; color: RGB }>) => {
    const COLS = 2
    const GAP = 3
    const CW = (INNER - GAP) / COLS
    const CH = 20

    for (let i = 0; i < items.length; i += COLS) {
      ensure(CH)
      items
        .slice(i, i + COLS)
        .forEach((it, ci) => {
          const cx = M + ci * (CW + GAP)
          doc.setFillColor(SOFT[0], SOFT[1], SOFT[2])
          doc.setDrawColor(LINE[0], LINE[1], LINE[2])
          doc.setLineWidth(0.25)
          doc.rect(cx, y, CW, CH, 'FD')
          // Colour chip on the left edge of the card.
          doc.setFillColor(it.color[0], it.color[1], it.color[2])
          doc.rect(cx, y, 1.6, CH, 'F')

          text(it.label.toUpperCase(), cx + 5, y + 5.4, {
            size: 7,
            style: 'bold',
            color: MUTED,
          })
          text(clip(it.value, CW - 10, 15), cx + 5, y + 12.4, {
            size: 15,
            style: 'bold',
            color: INK,
          })
          text(clip(it.sub, CW - 10, 7.5), cx + 5, y + 17, {
            size: 7.5,
            color: it.color,
            style: 'bold',
          })
        })
      y += CH + GAP
    }
    y += 1
  }

  const detailTable = (
    headers: string[],
    rows: string[][],
    cols: Array<{ w: number; align?: 'left' | 'right' }>,
  ) => {
    const HEAD_H = 7
    const ROW_H = 5.8

    const drawHead = () => {
      ensure(HEAD_H + ROW_H)
      doc.setFillColor(78, 105, 211)
      doc.rect(M, y, INNER, HEAD_H, 'F')
      let x = M
      headers.forEach((h, i) => {
        text(h.toUpperCase(), x + 2, y + 4.7, {
          size: 6.8,
          style: 'bold',
          color: [255, 255, 255],
          align: cols[i].align ?? 'left',
        })
        x += cols[i].w
      })
      y += HEAD_H
    }

    drawHead()

    rows.forEach((r, ri) => {
      if (y + ROW_H > FOOT_Y - 6) {
        doc.addPage()
        y = M
        drawHead()
      }
      if (ri % 2 === 1) {
        doc.setFillColor(SOFT[0], SOFT[1], SOFT[2])
        doc.rect(M, y, INNER, ROW_H, 'F')
      }
      doc.setDrawColor(LINE[0], LINE[1], LINE[2])
      doc.setLineWidth(0.15)
      doc.line(M, y + ROW_H, M + INNER, y + ROW_H)

      let x = M
      r.forEach((cell, ci) => {
        const col = cols[ci]
        const align = col.align ?? 'left'
        text(clip(cell, col.w - 4, 7.2), align === 'right' ? x + col.w - 2 : x + 2, y + 4, {
          size: 7.2,
          color: BODY,
          align,
        })
        x += col.w
      })
      y += ROW_H
    })

    y += 4
  }


  text('REPUBLIC OF THE PHILIPPINES', M, y + 2, { style: 'bold', size: 9 })
  text('DEPARTMENT OF HEALTH', M + INNER, y + 2, {
    style: 'bold',
    size: 9,
    align: 'right',
  })
  text('PROVINCE OF BULACAN', M, y + 8, { size: 9 })
  text('CITY OF MALOLOS', M + INNER, y + 8, { size: 9, align: 'right' })
  text('CITY HEALTH UNIT VII', PAGE_W / 2, y + 16, {
    style: 'bold',
    size: 11,
    align: 'center',
  })
  text('ANALYTICS REPORT', PAGE_W / 2, y + 25, {
    style: 'bold',
    size: 16,
    align: 'center',
    color: INK,
  })
  text(`Reporting period: ${meta.rangeLabel}`, PAGE_W / 2, y + 31.5, {
    size: 9.5,
    align: 'center',
    color: MUTED,
  })
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.6)
  doc.line(M, y + 35, M + INNER, y + 35)

  y += 41

  const metaRows: string[][] = [
    ['Applied filter', meta.rangeLabel],
    ['Range key', meta.rangeKey],
    [
      'Year',
      meta.rangeKey === 'YEAR' && meta.year ? String(meta.year) : 'Not applicable',
    ],
    ['Total appointments', nf(stats.total)],
    ['Generated by', meta.generatedBy?.trim() || 'Administrator'],
    ['Generated on', stamp(new Date())],
  ]

  const LBL_W = 46
  const VAL_W = INNER - LBL_W
  metaRows.forEach((r, i) => {
    const h = 7
    ensure(h)
    if (i % 2 === 1) {
      doc.setFillColor(SOFT[0], SOFT[1], SOFT[2])
      doc.rect(M, y, INNER, h, 'F')
    }
    doc.setFillColor(226, 230, 244)
    doc.rect(M, y, LBL_W, h, 'F')
    doc.setDrawColor(LINE[0], LINE[1], LINE[2])
    doc.setLineWidth(0.2)
    doc.rect(M, y, INNER, h, 'S')
    doc.line(M + LBL_W, y, M + LBL_W, y + h)
    text(clip(r[0], LBL_W - 4, 8), M + 2.5, y + 4.7, {
      size: 8,
      style: 'bold',
      color: MUTED,
    })
    text(clip(r[1], VAL_W - 4, 8), M + LBL_W + 2.5, y + 4.7, {
      size: 8,
      color: BODY,
    })
    y += h
  })

  y += 8

  if (has('summary')) {
    sectionHeading('Key performance indicators')

    const repeatRate = stats.total ? stats.repeatVisits / stats.total : 0
    const walkInRate = stats.total ? stats.walkIns / stats.total : 0

    kpiGrid([
      {
        label: 'Total appointments',
        value: nf(stats.total),
        sub: meta.rangeLabel,
        color: BRAND,
      },
      {
        label: 'Completion rate',
        value: `${stats.completionRate}%`,
        sub: 'of appointments',
        color: [16, 185, 129],
      },
      {
        label: 'No-show rate',
        value: `${stats.noShowRate}%`,
        sub: 'of appointments',
        color: [239, 68, 68],
      },
      {
        label: 'Cancellation rate',
        value: `${stats.cancellationRate}%`,
        sub: 'of appointments',
        color: [245, 158, 11],
      },
      {
        label: 'Repeat visits',
        value: nf(stats.repeatVisits),
        sub: `${(repeatRate * 100).toFixed(0)}% return rate`,
        color: [236, 72, 153],
      },
      {
        label: 'Walk-ins',
        value: nf(stats.walkIns),
        sub: `${(walkInRate * 100).toFixed(0)}% of total`,
        color: [14, 165, 233],
      },
      {
        label: 'Residents',
        value: nf(stats.resident),
        sub: `${nf(Math.max(stats.total - stats.walkIns, 0))} non-walk-in`,
        color: [139, 92, 246],
      },
      {
        label: 'Recorded cases',
        value: nf(stats.diseaseCases),
        sub: 'medical case reports',
        color: [20, 184, 166],
      },
    ])
  }

  if (has('serviceShare')) {
    sectionHeading('Service utilization')
    if (stats.serviceShare.length > 0) {
      breakdown(stats.serviceShare, stats.total)
    } else {
      noData('No service data available for the selected period.')
    }
  }

  if (has('reasons')) {
    sectionHeading('Top appointment reasons')
    if (stats.reasons.length > 0) {
      breakdown(stats.reasons, stats.total)
    } else {
      noData('No appointment reasons recorded for the selected period.')
    }
  }


  if (has('outcomes')) {
    sectionHeading('Appointment outcomes')
    if (stats.outcomes.length > 0) {
      const t = stats.outcomes.reduce((s, o) => s + o.count, 0)
      simpleTable(
        ['Outcome', 'Count', 'Share'],
        stats.outcomes.map((o) => [
          o.label,
          nf(o.count),
          `${pct(o.count, t).toFixed(1)}%`,
        ]),
        [{ w: INNER - 60 }, { w: 30, align: 'right' }, { w: 30, align: 'right' }],
      )
    } else {
      noData('No appointment outcomes recorded for the selected period.')
    }
  }

  if (has('peakHours')) {
    sectionHeading('Peak hours')
    if (stats.peakHours.length > 0) {
      const t = stats.peakHours.reduce((s, h) => s + h.count, 0)
      simpleTable(
        ['Time slot', 'Appointments', 'Share'],
        stats.peakHours.map((h) => [
          h.label,
          nf(h.count),
          `${pct(h.count, t).toFixed(1)}%`,
        ]),
        [{ w: INNER - 60 }, { w: 30, align: 'right' }, { w: 30, align: 'right' }],
      )
    } else {
      noData('No peak-hour data available for the selected period.')
    }
  }

  if (has('ageGroups')) {
    sectionHeading('Age group distribution')
    const ageTotal = stats.ageGroups.reduce((s, g) => s + g.count, 0)
    if (ageTotal > 0) {
      breakdown(stats.ageGroups, ageTotal)
    } else {
      noData('No age-group data available for the selected period.')
    }
  }

  if (has('diseases')) {
    sectionHeading('Disease / case reports')
    if (stats.diseaseCases > 0 && stats.diseases.length > 0) {
      breakdown(stats.diseases, stats.diseaseCases)
    } else {
      noData('No medical case data available for the selected period.')
    }
  }

  if (has('sexByService')) {
    sectionHeading('Sex by service')
    if (stats.sexByService.length > 0) {
      simpleTable(
        ['Service', 'Male', 'Female', 'Total'],
        stats.sexByService.map((s) => [
          s.service,
          nf(s.male),
          nf(s.female),
          nf(s.male + s.female),
        ]),
        [
          { w: INNER - 78 },
          { w: 26, align: 'right' },
          { w: 26, align: 'right' },
          { w: 26, align: 'right' },
        ],
      )
    } else {
      noData('No patient sex records available for the selected period.')
    }
  }

  if (has('immunization')) {
    sectionHeading('Immunization activity')
    if (stats.immunization.length > 0) {
      const t = stats.immunization.reduce((s, i) => s + i.count, 0)
      simpleTable(
        ['Vaccine / item', 'Doses given', 'Share'],
        stats.immunization.map((i) => [
          i.label,
          nf(i.count),
          `${pct(i.count, t).toFixed(1)}%`,
        ]),
        [{ w: INNER - 60 }, { w: 30, align: 'right' }, { w: 30, align: 'right' }],
      )
    } else {
      noData('No immunization activity recorded for the selected period.')
    }
  }

  if (has('bloodTypes')) {
    sectionHeading('Blood type distribution')
    const btTotal = stats.bloodTypes.reduce((s, b) => s + b.count, 0)
    if (btTotal > 0) {
      simpleTable(
        ['Blood type', 'Patients', 'Share'],
        stats.bloodTypes.map((b) => [
          b.label,
          nf(b.count),
          `${pct(b.count, btTotal).toFixed(1)}%`,
        ]),
        [{ w: INNER - 60 }, { w: 30, align: 'right' }, { w: 30, align: 'right' }],
      )
    } else {
      noData('No blood type information has been recorded.')
    }
  }

  if (has('vitals')) {
    sectionHeading('Average vital signs')
    if (stats.vitals) {
      const v = stats.vitals
      const n = nf(v.totalWithVitals)
      simpleTable(
        ['Indicator', 'Average', 'Records'],
        [
          ['Blood pressure (systolic)', `${v.avgSystolic} mmHg`, n],
          ['Blood pressure (diastolic)', `${v.avgDiastolic} mmHg`, n],
          ['Heart rate', `${v.avgHeartRate} bpm`, n],
          ['Temperature', `${v.avgTemp} °C`, n],
          ['Oxygen saturation', `${v.avgOxygen}%`, n],
          ['Respiratory rate', `${v.avgRespRate} /min`, n],
          ['Hypertension cases', `${v.hypertensionCount}`, `${v.hypertensionPct}%`],
        ],
        [{ w: INNER - 66 }, { w: 40, align: 'right' }, { w: 26, align: 'right' }],
      )
    } else {
      noData('No vital signs recorded for the selected period.')
    }
  }

  if (has('pwdStats')) {
    sectionHeading('PWD & senior citizen overview')
    if (stats.pwdStats) {
      simpleTable(
        ['Segment', 'Registered', 'Share of users'],
        [
          [
            'Persons with disability (PWD)',
            nf(stats.pwdStats.total),
            `${stats.pwdStats.pct}%`,
          ],
          [
            'Senior citizens',
            nf(stats.pwdStats.seniorCitizens),
            `${stats.pwdStats.seniorPct}%`,
          ],
        ],
        [{ w: INNER - 66 }, { w: 40, align: 'right' }, { w: 26, align: 'right' }],
      )
    } else {
      noData('No PWD or senior citizen data available.')
    }
  }

  if (has('dailyTrend')) {
    sectionHeading('Daily appointment trend')
    if (stats.dailyTrend.length > 0) {
      const t = stats.dailyTrend.reduce((s, d) => s + d.count, 0)
      simpleTable(
        ['Date', 'Appointments', 'Share'],
        stats.dailyTrend.map((d) => [
          d.label,
          nf(d.count),
          `${pct(d.count, t).toFixed(1)}%`,
        ]),
        [{ w: INNER - 60 }, { w: 30, align: 'right' }, { w: 30, align: 'right' }],
      )
    } else {
      noData('No daily activity recorded for the selected period.')
    }
  }

  if (has('weeklyTrend')) {
    sectionHeading('Weekly trend & busiest days')
    if (stats.weeklyTrend.length > 0 || stats.weekdayTrend.length > 0) {
      if (stats.weeklyTrend.length > 0) {
        const t = stats.weeklyTrend.reduce((s, w) => s + w.count, 0)
        simpleTable(
          ['Week', 'Appointments', 'Share'],
          stats.weeklyTrend.map((w) => [
            w.label,
            nf(w.count),
            `${pct(w.count, t).toFixed(1)}%`,
          ]),
          [{ w: INNER - 60 }, { w: 30, align: 'right' }, { w: 30, align: 'right' }],
        )
      }
      if (stats.weekdayTrend.length > 0) {
        const t = stats.weekdayTrend.reduce((s, w) => s + w.count, 0)
        text('Appointments by day of week', M, y + 2, {
          style: 'bold',
          size: 9,
          color: INK,
        })
        y += 7
        simpleTable(
          ['Day', 'Appointments', 'Share'],
          stats.weekdayTrend.map((w) => [
            w.label,
            nf(w.count),
            `${pct(w.count, t).toFixed(1)}%`,
          ]),
          [{ w: INNER - 60 }, { w: 30, align: 'right' }, { w: 30, align: 'right' }],
        )
      }
    } else {
      noData('No weekly trend data available for the selected period.')
    }
  }

  if (has('serviceMatrix')) {
    sectionHeading('Service breakdown table')
    if (stats.serviceMatrix.length > 0) {
      simpleTable(
        ['Service', 'Total', 'Completed', 'No-show', 'Cancelled', 'Rate'],
        stats.serviceMatrix.map((s) => [
          s.service,
          nf(s.total),
          nf(s.completed),
          nf(s.noShow),
          nf(s.cancelled),
          `${s.completionRate}%`,
        ]),
        [
          { w: INNER - 100 },
          { w: 20, align: 'right' },
          { w: 20, align: 'right' },
          { w: 20, align: 'right' },
          { w: 20, align: 'right' },
          { w: 20, align: 'right' },
        ],
        { zebra: false },
      )
    } else {
      noData('No service data available for the selected period.')
    }
  }

  if (has('topPatients')) {
    sectionHeading('Most frequent patients')
    if (stats.topPatients.length > 0) {
      simpleTable(
        ['#', 'Patient', 'Visits', 'Last visit'],
        stats.topPatients.map((p, i) => [
          String(i + 1),
          p.name,
          nf(p.visits),
          p.lastVisit,
        ]),
        [
          { w: 12, align: 'right' },
          { w: INNER - 82 },
          { w: 30, align: 'right' },
          { w: 40, align: 'right' },
        ],
      )
    } else {
      noData('No repeat-visit data available for the selected period.')
    }
  }

  if (has('summary')) {
    const mix = stats.patientMix
    const mixTotal = mix.newPatients + mix.returningPatients
    if (mixTotal > 0) {
      sectionHeading('Patient mix (new vs returning)')
      simpleTable(
        ['Segment', 'Patients', 'Share'],
        [
          ['New patients', nf(mix.newPatients), `${pct(mix.newPatients, mixTotal).toFixed(1)}%`],
          ['Returning patients', nf(mix.returningPatients), `${pct(mix.returningPatients, mixTotal).toFixed(1)}%`],
        ],
        [{ w: INNER - 60 }, { w: 30, align: 'right' }, { w: 30, align: 'right' }],
      )
    }
  }

  if (has('patientAppendix')) {
    sectionHeading('Patient-level appendix')
    if (meta.patientRows && meta.patientRows.length > 0) {
      text(
        `Individual visits recorded in this period (${nf(meta.patientRows.length)}${
          meta.patientRowsTruncated ? ' most recent' : ''
        }).`,
        M,
        y + 2,
        { size: 8, color: MUTED, style: 'italic' },
      )
      y += 8

      const cols = ANALYTICS_DETAIL_COLUMNS[meta.appendixSection ?? ''] ?? DEFAULT_ANALYTICS_DETAIL_COLUMNS
      const weightOf = (key: string) =>
        key === 'diagnosis' ? 3 : key === 'patientName' || key === 'service' ? 2.2 : 1.4
      const totalWeight = cols.reduce((s, c) => s + weightOf(c.key), 0)

      detailTable(
        cols.map((c) => c.label),
        meta.patientRows.map((r) => {
          const rec = r as unknown as Record<string, unknown>
          return cols.map((c) => {
            const v = rec[c.key]
            if (v === null || v === undefined || v === '') return '—'
            return String(v)
          })
        }),
        cols.map((c) => ({
          w: Math.max(12, (weightOf(c.key) / totalWeight) * INNER),
          align: c.align,
        })),
      )
    } else {
      noData('No patient-level records available for the selected period.')
    }
  }

  const pages = doc.getNumberOfPages()
  const generatedAt = stamp(new Date())
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setDrawColor(LINE[0], LINE[1], LINE[2])
    doc.setLineWidth(0.25)
    doc.line(M, FOOT_Y - 4, M + INNER, FOOT_Y - 4)
    text('MediTrack — City Health Unit VII Analytics Report', M, FOOT_Y, {
      size: 7.5,
      color: MUTED,
    })
    text(`${meta.rangeLabel} · Generated ${generatedAt}`, M + INNER, FOOT_Y, {
      size: 7.5,
      color: MUTED,
      align: 'right',
    })
    text(`Page ${p} of ${pages}`, PAGE_W / 2, FOOT_Y + 4, {
      size: 7,
      color: MUTED,
      align: 'center',
    })
  }

  const slug =
    meta.rangeLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || meta.rangeKey.toLowerCase()
  const today = new Date().toISOString().slice(0, 10)
  doc.save(`analytics-report-${slug}-${today}.pdf`)
}

