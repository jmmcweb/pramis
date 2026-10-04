// This file contains the logic for generating the Analytics Report PDF. It uses jsPDF to create a PDF document with various sections, including key performance indicators, service utilization, appointment reasons, outcomes, peak hours, age group distribution, disease/case reports, sex by service, immunization activity, blood type distribution, and average vital signs. The report is generated based on the provided statistics and metadata, and it can be downloaded by the user.

import { jsPDF } from 'jspdf'
import type { AnalyticsBreakdown, AnalyticsStats } from '@/lib/actions/analytics'
import {
  ANALYTICS_APPENDIX_COLUMNS,
  ANALYTICS_REPORT_SECTIONS,
  DEFAULT_ANALYTICS_REPORT_SECTIONS,
  type AnalyticsDetailColumn,
  type AnalyticsRangeKey,
  type AnalyticsReportSectionKey,
} from '@/lib/constants/analytics'

const PAGE_W = 210 // A4 portrait
const PAGE_H = 297
const M = 14 // margin
const INNER = PAGE_W - M * 2 // usable width
const FOOT_Y = PAGE_H - 12 // footer baseline

type RGB = [number, number, number]

const CERTIFICATION_KEY = 'certification'

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
  patientRowsTotal?: number
}

const nf = (n: number) => (Number.isFinite(n) ? n.toLocaleString() : '0')

const pct = (count: number, denom: number) =>
  denom > 0 ? (count / denom) * 100 : 0

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const stamp = (d: Date) =>
  d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

const renderAnalyticsReport = (
  stats: AnalyticsStats,
  meta: AnalyticsReportMeta,
  tocPages?: Readonly<Record<string, number>>,
) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // Section / figure / table counters, and the page each section starts on.
  const headings: Record<string, number> = {}
  let sectionNo = 0
  let figureNo = 0
  let tableNo = 0

  const chosen = new Set<AnalyticsReportSectionKey>(
    meta.sections?.length ? meta.sections : DEFAULT_ANALYTICS_REPORT_SECTIONS,
  )
  const has = (key: AnalyticsReportSectionKey) => chosen.has(key)

  // Highest-count row of a breakdown, used to phrase the key findings.
  const topOf = (rows: AnalyticsBreakdown[]) =>
    rows.reduce<AnalyticsBreakdown | null>(
      (best, r) => (best === null || r.count > best.count ? r : best),
      null,
    )

  // Monthly rollup of the daily trend, so long periods stay readable in print.
  // `dailyTrend` labels are `yyyy-mm-dd` and already sorted oldest → newest.
  const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  const monthlyRollup = (() => {
    const buckets = new Map<string, { count: number; days: number }>()
    for (const d of stats.dailyTrend) {
      const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(d.label)
      if (!m) continue
      const key = `${m[1]}-${m[2]}`
      const entry = buckets.get(key) ?? { count: 0, days: 0 }
      entry.count += d.count
      entry.days += 1
      buckets.set(key, entry)
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, v]) => {
        const [year, month] = key.split('-')
        return {
          label: `${MONTH_NAMES[Number(month) - 1] ?? month} ${year}`,
          count: v.count,
          activeDays: v.days,
          avgPerDay: v.days ? Number((v.count / v.days).toFixed(1)) : 0,
        }
      })
  })()

  // Days actually present in the window, used for the "per calendar day" figure.
  const activeDayCount = monthlyRollup.reduce((s, m) => s + m.activeDays, 0)

  let y = M

  const ensure = (h: number) => {
    if (y + h > FOOT_Y - 6) {
      doc.addPage()
      y = M
      return true
    }
    return false
  }

  type TextOpts = {
    style?: 'normal' | 'bold' | 'italic'
    size?: number
    color?: RGB
    align?: 'left' | 'center' | 'right'
  }

  const paint = (t: string, x: number, yy: number, opts: TextOpts = {}) => {
    const { style = 'normal', size = 9, color = BODY, align = 'left' } = opts
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(color[0], color[1], color[2])
    if (align === 'center') doc.text(t, x, yy, { align: 'center' })
    else if (align === 'right') doc.text(t, x, yy, { align: 'right' })
    else doc.text(t, x, yy)
  }

  const text = (t: string, x: number, yy: number, opts: TextOpts = {}) =>
    paint(t, x, yy, opts)

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

  const sectionHeading = (t: string, key?: AnalyticsReportSectionKey) => {
    ensure(18)
    sectionNo += 1
    if (key) headings[key] = doc.getCurrentPageInfo().pageNumber

    text(`${sectionNo}.`, M, y + 4.6, {
      style: 'bold',
      size: 11,
      color: BRAND,
    })
    text(t.toUpperCase(), M + 9, y + 4.6, {
      style: 'bold',
      size: 11,
      color: INK,
    })
    doc.setDrawColor(BRAND[0], BRAND[1], BRAND[2])
    doc.setLineWidth(0.8)
    doc.line(M + 9, y + 6.8, M + 31, y + 6.8)
    doc.setDrawColor(LINE[0], LINE[1], LINE[2])
    doc.setLineWidth(0.25)
    doc.line(M + 33, y + 6.8, M + INNER, y + 6.8)
    y += 11
  }

  const figureCaption = (t: string) => {
    ensure(12)
    figureNo += 1
    text(`Figure ${figureNo}. ${t}`, M, y + 4, {
      style: 'bold',
      size: 8.5,
      color: INK,
    })
    y += 7
  }

  const tableCaption = (t: string) => {
    ensure(12)
    tableNo += 1
    text(`Table ${tableNo}. ${t}`, M, y + 4, {
      style: 'bold',
      size: 8.5,
      color: INK,
    })
    y += 7
  }

  const tableNote = (t: string) => {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    const lines = doc.splitTextToSize(t, INNER) as string[]
    const h = 3.6 * lines.length + 1
    ensure(h)
    lines.forEach((ln, i) => {
      text(ln, M, y + 3 + i * 3.6, { size: 7.5, color: MUTED, style: 'italic' })
    })
    y += h
  }


  const lineChart = (points: AnalyticsBreakdown[]) => {
    if (points.length === 0) return
    const H = 46
    const padL = 11
    const padR = 3
    const padT = 4
    const plotW = INNER - padL - padR
    const plotH = H - padT - 9

    ensure(H + 6)
    const top = y + padT
    const max = Math.max(...points.map((p) => p.count), 1)

    const steps = 4
    for (let i = 0; i <= steps; i++) {
      const v = Math.round((max / steps) * i)
      const gy = top + plotH - (plotH / steps) * i
      doc.setDrawColor(LINE[0], LINE[1], LINE[2])
      doc.setLineWidth(i === 0 ? 0.3 : 0.15)
      doc.line(M + padL, gy, M + padL + plotW, gy)
      text(String(v), M + padL - 1.5, gy + 1.1, {
        size: 6.5,
        color: MUTED,
        align: 'right',
      })
    }

    const px = (i: number) =>
      M + padL + (points.length === 1 ? plotW / 2 : (plotW / (points.length - 1)) * i)
    const py = (c: number) => top + plotH - (c / max) * plotH

    const toDeltas = (pts: [number, number][]): [number, number][] =>
      pts.map((p, i) =>
        i === 0 ? [0, 0] : [p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]],
      )

    const baseline = top + plotH
    const area: [number, number][] = [
      [px(0), baseline],
      ...points.map((p, i) => [px(i), py(p.count)] as [number, number]),
      [px(points.length - 1), baseline],
    ]
    doc.setFillColor(226, 231, 250)
    doc.lines(toDeltas(area), area[0][0], area[0][1], [1, 1], 'FD', true)

    const line: [number, number][] = points.map(
      (p, i) => [px(i), py(p.count)] as [number, number],
    )
    doc.setDrawColor(BRAND[0], BRAND[1], BRAND[2])
    doc.setLineWidth(0.6)
    doc.lines(toDeltas(line), line[0][0], line[0][1], [1, 1], 'S', false)

    if (points.length <= 40) {
      doc.setFillColor(BRAND[0], BRAND[1], BRAND[2])
      points.forEach((p, i) => {
        doc.circle(px(i), py(p.count), 0.7, 'F')
      })
    }

    const fmtTick = (label: string): string => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(label)
      if (!m) return label
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${m[3]} ${months[Number(m[2]) - 1] ?? m[2]}`
    }
    const idx = new Set<number>([0, points.length - 1])
    if (points.length > 4) {
      idx.add(Math.floor((points.length - 1) / 3))
      idx.add(Math.floor(((points.length - 1) * 2) / 3))
    }
    for (const i of [...idx].sort((a, b) => a - b)) {
      text(fmtTick(points[i].label), px(i), top + plotH + 4.5, {
        size: 6.5,
        color: MUTED,
        align: i === 0 ? 'left' : i === points.length - 1 ? 'right' : 'center',
      })
    }

    y += H
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
    const LBL_W = 52
    const BAR_X = M + LBL_W + 2
    const BAR_W = 56
    const ROW_H = 7
    const COUNT_R = M + INNER - 24
    const PCT_R = M + INNER

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

      text(nf(r.count), COUNT_R, y + 4.6, {
        size: 8.5,
        style: 'bold',
        align: 'right',
      })
      text(`${p.toFixed(1)}%`, PCT_R, y + 4.6, {
        size: 8.5,
        align: 'right',
        color: MUTED,
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

  const subHeading = (t: string) => {
    ensure(9)
    text(t, M, y + 4, { style: 'bold', size: 9, color: INK })
    y += 7
  }

  const noteBlock = (label: string, body: string) => {
    const size = 8.5
    const LINE_H = 4.3
    const lead = `${label} `
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(size)
    const indent = doc.getTextWidth(lead)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(body, INNER - indent) as string[]
    const h = LINE_H * lines.length + 1.5

    ensure(h)
    text(lead, M, y + 3.2, { size, style: 'bold', color: INK })
    lines.forEach((ln, i) => {
      text(ln, M + indent, y + 3.2 + i * LINE_H, { size, color: BODY })
    })
    y += h
  }

  const caption = (t: string) => {
    const size = 7.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(t, INNER) as string[]
    const h = 3.8 * lines.length
    ensure(h + 2)
    lines.forEach((ln, i) => {
      text(ln, M, y + 3 + i * 3.8, { size, color: MUTED, style: 'italic' })
    })
    y += h + 2
  }

  const kvBlock = (rows: string[][]) => {
    const LBL = 46
    const VAL = INNER - LBL
    rows.forEach((r, i) => {
      const h = 7
      ensure(h)
      if (i % 2 === 1) {
        doc.setFillColor(SOFT[0], SOFT[1], SOFT[2])
        doc.rect(M, y, INNER, h, 'F')
      }
      doc.setFillColor(226, 230, 244)
      doc.rect(M, y, LBL, h, 'F')
      doc.setDrawColor(LINE[0], LINE[1], LINE[2])
      doc.setLineWidth(0.2)
      doc.rect(M, y, INNER, h, 'S')
      doc.line(M + LBL, y, M + LBL, y + h)
      text(clip(r[0], LBL - 4, 8), M + 2.5, y + 4.7, {
        size: 8,
        style: 'bold',
        color: MUTED,
      })
      text(clip(r[1], VAL - 4, 8), M + LBL + 2.5, y + 4.7, { size: 8, color: BODY })
      y += h
    })
    y += 4
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
        const col = cols[i]
        const align = col.align ?? 'left'
        const hx = align === 'right' ? x + col.w - 2.5 : x + 2.5
        text(clip(h.toUpperCase(), col.w - 5, 7.5), hx, y + 4.7, {
          size: 7.5,
          style: 'bold',
          color: [255, 255, 255],
          align,
        })
        x += col.w
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
        const col = cols[i]
        const align = col.align ?? 'left'
        const hx = align === 'right' ? x + col.w - 2 : x + 2
        text(clip(h.toUpperCase(), col.w - 4, 6.8), hx, y + 4.7, {
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


  doc.setFillColor(INK[0], INK[1], INK[2])
  doc.rect(0, 0, PAGE_W, 3, 'F')
  text('REPUBLIC OF THE PHILIPPINES', M, y + 4, { style: 'bold', size: 9.5 })
  text('DEPARTMENT OF HEALTH', M + INNER, y + 4, {
    style: 'bold',
    size: 9.5,
    align: 'right',
  })
  text('PROVINCE OF BULACAN', M, y + 10, { size: 9.5 })
  text('CITY OF MALOLOS', M + INNER, y + 10, { size: 9.5, align: 'right' })
  doc.setDrawColor(INK[0], INK[1], INK[2])
  doc.setLineWidth(0.7)
  doc.line(M, y + 13, M + INNER, y + 13)
  text('CITY HEALTH UNIT VII', PAGE_W / 2, y + 21, {
    style: 'bold',
    size: 11,
    align: 'center',
    color: INK,
  })
  y += 34

  text('ANALYTICS REPORT', PAGE_W / 2, y + 8, {
    style: 'bold',
    size: 26,
    align: 'center',
    color: INK,
  })
  text('Appointments, services and health-programme performance', PAGE_W / 2, y + 17, {
    size: 10,
    align: 'center',
    color: MUTED,
  })
  y += 26

  doc.setDrawColor(BRAND[0], BRAND[1], BRAND[2])
  doc.setLineWidth(1.2)
  doc.line(M + 70, y, M + INNER - 70, y)
  y += 10

  text(`Reporting period: ${meta.rangeLabel}`, PAGE_W / 2, y, {
    style: 'bold',
    size: 12,
    align: 'center',
  })
  y += 18

  kvBlock([
    ['Report title', 'Analytics Report'],
    ['Reporting period', meta.rangeLabel],
    [
      'Year',
      meta.rangeKey === 'YEAR' && meta.year ? String(meta.year) : 'Not applicable',
    ],
    ['Appointments in period', nf(stats.total)],
    ['Sections included', `${chosen.size} of ${ANALYTICS_REPORT_SECTIONS.length}`],
    ['Prepared by', meta.generatedBy?.trim() || 'Administrator'],
    ['Date generated', stamp(new Date())],
    ['Source system', 'MediTrack appointment register'],
    ['Distribution', 'City Health Unit VII - internal use'],
  ])

  // Confidentiality note at the foot of the title page.
  ensure(16)
  doc.setFillColor(SOFT[0], SOFT[1], SOFT[2])
  doc.rect(M, FOOT_Y - 22, INNER, 12, 'F')
  text(
    'This report is generated automatically from MediTrack and is intended for internal',
    M + 3,
    FOOT_Y - 17,
    { size: 7.5, color: MUTED, style: 'italic' },
  )
  text(
    'use by the City Health Unit VII. Figures reflect the records held at the time of generation.',
    M + 3,
    FOOT_Y - 12.5,
    { size: 7.5, color: MUTED, style: 'italic' },
  )

  doc.addPage()
  y = M

  text('TABLE OF CONTENTS', M, y + 5, { style: 'bold', size: 14, color: INK })
  doc.setDrawColor(BRAND[0], BRAND[1], BRAND[2])
  doc.setLineWidth(0.8)
  doc.line(M, y + 8, M + 40, y + 8)
  doc.setDrawColor(LINE[0], LINE[1], LINE[2])
  doc.setLineWidth(0.25)
  doc.line(M + 42, y + 8, M + INNER, y + 8)
  y += 16

  // The certification block is always emitted, so it is always listed.
  const tocRows = [
    ...ANALYTICS_REPORT_SECTIONS.filter((s) => has(s.key)),
    { key: CERTIFICATION_KEY, label: 'Certification' },
  ]
  const NUM_W = 10
  const PG_W = 12

  tocRows.forEach((s, i) => {
    ensure(7)
    const page = tocPages?.[s.key]
    const baseline = y + 4.6

    text(`${i + 1}.`, M, baseline, {
      size: 9,
      style: 'bold',
      color: BRAND,
    })
    text(clip(s.label, INNER - NUM_W - PG_W - 8, 9), M + NUM_W, baseline, {
      size: 9,
      color: BODY,
    })

    // Dot leader between the label and its page number.
    const labelEnd =
      M + NUM_W + doc.getTextWidth(clip(s.label, INNER - NUM_W - PG_W - 8, 9))
    const pageStart = M + INNER - PG_W + 3
    if (pageStart - labelEnd > 6) {
      doc.setFillColor(LINE[0], LINE[1], LINE[2])
      for (let dx = labelEnd + 2; dx < pageStart - 2; dx += 1.6) {
        doc.rect(dx, baseline - 0.6, 0.5, 0.5, 'F')
      }
    }

    text(page ? String(page) : '', M + INNER - PG_W + 3, baseline, {
      size: 9,
      style: 'bold',
      align: 'right',
      color: INK,
    })
    y += 7
  })

  // The body always starts on a fresh page.
  doc.addPage()
  y = M

  if (has('summary')) {
    sectionHeading('Key performance indicators', 'summary')

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

    const mix = stats.patientMix
    const mixTotal = mix.newPatients + mix.returningPatients
    if (mixTotal > 0) {
      subHeading('Patient mix (new vs returning)')
      simpleTable(
        ['Segment', 'Patients', 'Share'],
        [
          [
            'New patients',
            nf(mix.newPatients),
            `${pct(mix.newPatients, mixTotal).toFixed(1)}%`,
          ],
          [
            'Returning patients',
            nf(mix.returningPatients),
            `${pct(mix.returningPatients, mixTotal).toFixed(1)}%`,
          ],
        ],
        [
          { w: INNER - 60 },
          { w: 30, align: 'right' },
          { w: 30, align: 'right' },
        ],
      )
    }
  }

  if (has('executiveSummary')) {
    sectionHeading('Executive summary & key findings', 'executiveSummary')

    if (stats.total === 0) {
      noData('No appointments were recorded for the selected period.')
    } else {
      const topService = topOf(stats.serviceShare)
      const topReason = topOf(stats.reasons)
      const topSlot = topOf(stats.peakHours)
      const topWeekday = topOf(stats.weekdayTrend)
      const topDay = topOf(stats.dailyTrend)
      const topDisease = topOf(stats.diseases)
      const topAge = topOf(stats.ageGroups)
      const topPatient = stats.topPatients[0]
      const busiestMonth = monthlyRollup.reduce<(typeof monthlyRollup)[number] | null>(
        (best, m) => (best === null || m.count > best.count ? m : best),
        null,
      )

      const perDay = activeDayCount
        ? `averaging ${(stats.total / activeDayCount).toFixed(1)} per active day`
        : `averaging ${stats.total} in total`
      const share = (n: number) => `${pct(n, stats.total).toFixed(1)}% of appointments`
      const completed =
        stats.outcomes.find((o) => o.label.toLowerCase() === 'completed')?.count ?? 0
      const males = stats.sexByService.reduce((s, r) => s + r.male, 0)
      const females = stats.sexByService.reduce((s, r) => s + r.female, 0)
      const doses = stats.immunization.reduce((s, i) => s + i.count, 0)
      const bloodTypeKnown = stats.bloodTypes.reduce((s, b) => s + b.count, 0)

      noteBlock(
        'Volume.',
        `${nf(stats.total)} appointments were recorded for ${meta.rangeLabel}, ${perDay}. Of these, ${nf(stats.walkIns)} were walk-ins (${pct(stats.walkIns, stats.total).toFixed(1)}%) and ${nf(stats.resident)} were recorded as residents.`,
      )
      noteBlock(
        'Attendance.',
        `${stats.completionRate}% of appointments were completed (${nf(completed)}), against a no-show rate of ${stats.noShowRate}% and a cancellation rate of ${stats.cancellationRate}%.`,
      )
      if (topService) {
        noteBlock(
          'Demand.',
          `${topService.label} was the most requested service with ${nf(topService.count)} visits (${share(topService.count)})${
            topReason
              ? `; the leading reason for visit was ${topReason.label.toLowerCase()} with ${nf(topReason.count)}`
              : ''
          }.`,
        )
      }
      if (topSlot || topWeekday || topDay || busiestMonth) {
        const parts = [
          topSlot
            ? `the busiest time slot was ${topSlot.label} (${nf(topSlot.count)})`
            : '',
          topWeekday
            ? `the busiest day of the week was ${topWeekday.label} (${nf(topWeekday.count)})`
            : '',
          topDay
            ? `the single busiest date was ${topDay.label} (${nf(topDay.count)})`
            : '',
          busiestMonth
            ? `${busiestMonth.label} was the strongest month (${nf(busiestMonth.count)})`
            : '',
        ].filter(Boolean)
        noteBlock('Scheduling.', `${capitalize(parts.join(', '))}.`)
      }
      if (topDisease) {
        noteBlock(
          'Case mix.',
          `${nf(stats.diseaseCases)} visits carried a classified medical condition; the most frequent was ${topDisease.label} (${nf(topDisease.count)}, ${pct(topDisease.count, stats.diseaseCases || 1).toFixed(1)}% of cases).${
            stats.vitals && stats.vitals.hypertensionCount > 0
              ? ` Hypertension was flagged on ${nf(stats.vitals.hypertensionCount)} visits (${stats.vitals.hypertensionPct}% of records with vitals).`
              : ''
          }`,
        )
      }
      if (topAge) {
        const sexNote =
          males + females > 0
            ? ` Across the six busiest services, recorded sex was ${nf(males)} male and ${nf(females)} female.`
            : ''
        const pwdNote = stats.pwdStats
          ? ` The registered caseload holds ${nf(stats.pwdStats.total)} persons with disability (${stats.pwdStats.pct}%) and ${nf(stats.pwdStats.seniorCitizens)} senior citizens (${stats.pwdStats.seniorPct}%).`
          : ''
        noteBlock(
          'Catchment.',
          `Across the patient register, the largest age group is ${topAge.label} years with ${nf(topAge.count)} patients.${sexNote}${pwdNote} These demographic counts cover the whole register rather than the reporting period.`,
        )
      }
      noteBlock(
        'Continuity of care.',
        `${nf(stats.repeatVisits)} visits (${pct(stats.repeatVisits, stats.total).toFixed(1)}%) came from patients returning within the period${
          topPatient ? `; the most frequent patient made ${nf(topPatient.visits)} visits, last seen ${topPatient.lastVisit}` : ''
        }.`,
      )
      noteBlock(
        'Data completeness.',
      `${doses} immunization doses were recorded in the period; ${nf(stats.vitals?.totalWithVitals ?? 0)} visits carried a blood-pressure reading for the vital-sign averages. Blood type is held on ${nf(bloodTypeKnown)} patient records in total. A blank or missing section means the field was not captured, not that the count was zero.`,
    )
    }
  }

  if (has('serviceShare')) {
    sectionHeading('Service utilization', 'serviceShare')
    if (stats.serviceShare.length > 0) {
      breakdown(stats.serviceShare, stats.total)
    } else {
      noData('No service data available for the selected period.')
    }
  }

  if (has('reasons')) {
    sectionHeading('Top appointment reasons', 'reasons')
    if (stats.reasons.length > 0) {
      breakdown(stats.reasons, stats.total)
    } else {
      noData('No appointment reasons recorded for the selected period.')
    }
  }


  if (has('outcomes')) {
    sectionHeading('Appointment outcomes', 'outcomes')
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
    sectionHeading('Peak hours', 'peakHours')
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
    sectionHeading('Age group distribution', 'ageGroups')
    caption(
      'Patient register basis: covers every registered patient with a birthdate on file, not only those seen during the period.',
    )
    const ageTotal = stats.ageGroups.reduce((s, g) => s + g.count, 0)
    if (ageTotal > 0) {
      breakdown(stats.ageGroups, ageTotal)
    } else {
      noData('No age-group data available for the selected period.')
    }
  }

  if (has('diseases')) {
    sectionHeading('Disease / case reports', 'diseases')
    if (stats.diseaseCases > 0 && stats.diseases.length > 0) {
      breakdown(stats.diseases, stats.diseaseCases)
    } else {
      noData('No medical case data available for the selected period.')
    }
  }

  if (has('sexByService')) {
    sectionHeading('Sex by service', 'sexByService')
    caption(
      'Six busiest services in the period; the sex shown is the one recorded on the patient record.',
    )
    if (stats.sexByService.length > 0) {
      tableCaption('Patients by sex for the busiest services')
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
    sectionHeading('Immunization activity', 'immunization')
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
    sectionHeading('Blood type distribution', 'bloodTypes')
    caption(
      'Patient register basis: blood type is held once per patient, so this shows the current caseload rather than visits during the period.',
    )
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
    sectionHeading('Average vital signs', 'vitals')
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
    sectionHeading('PWD & senior citizen overview', 'pwdStats')
    caption(
      'Patient register basis: counts cover all registered profiles, not only those seen during the period.',
    )
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
    sectionHeading('Daily appointment trend', 'dailyTrend')
    if (stats.dailyTrend.length > 0) {
      const t = stats.dailyTrend.reduce((s, d) => s + d.count, 0)

      figureCaption(`Daily appointment volume, ${meta.rangeLabel}`)
      lineChart(stats.dailyTrend)

      tableCaption('Daily appointment counts')
      simpleTable(
        ['Date', 'Appointments', 'Share'],
        stats.dailyTrend.map((d) => [
          d.label,
          nf(d.count),
          `${pct(d.count, t).toFixed(1)}%`,
        ]),
        [{ w: INNER - 60 }, { w: 30, align: 'right' }, { w: 30, align: 'right' }],
      )
      tableNote(
        'Only dates with at least one appointment are listed; days with no activity are omitted rather than shown as zero.',
      )
    } else {
      noData('No daily activity recorded for the selected period.')
    }
  }

  if (has('weeklyTrend')) {
    sectionHeading('Weekly appointment trend', 'weeklyTrend')
    if (stats.weeklyTrend.length > 0 || stats.weekdayTrend.length > 0) {
      if (stats.weeklyTrend.length > 0) {
        const t = stats.weeklyTrend.reduce((s, w) => s + w.count, 0)
        tableCaption('Appointments by ISO week')
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
        subHeading('Appointments by day of week')
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

  if (has('monthlyTrend')) {
    sectionHeading('Monthly rollup', 'monthlyTrend')
    if (monthlyRollup.length > 0) {
      const t = monthlyRollup.reduce((s, m) => s + m.count, 0)
      tableCaption('Monthly rollup')
      simpleTable(
        ['Month', 'Appointments', 'Share', 'Active days', 'Avg / active day'],
        monthlyRollup.map((m) => [
          m.label,
          nf(m.count),
          `${pct(m.count, t).toFixed(1)}%`,
          nf(m.activeDays),
          m.avgPerDay.toFixed(1),
        ]),
        [
          { w: INNER - 96 },
          { w: 28, align: 'right' },
          { w: 24, align: 'right' },
          { w: 22, align: 'right' },
          { w: 22, align: 'right' },
        ],
      )
      const peak = monthlyRollup.reduce((best, m) => (m.count > best.count ? m : best))
      const low = monthlyRollup.reduce((best, m) => (m.count < best.count ? m : best))
      if (monthlyRollup.length > 1) {
        noteBlock(
          'Reading the trend.',
          `Across ${monthlyRollup.length} month${monthlyRollup.length === 1 ? '' : 's'}, ${nf(t)} appointments were recorded on ${nf(activeDayCount)} days with activity. The strongest month was ${peak.label} (${nf(peak.count)}, ${pct(peak.count, t).toFixed(1)}%) and the lightest was ${low.label} (${nf(low.count)}, ${pct(low.count, t).toFixed(1)}%).`,
        )
      }
    } else {
      noData('No monthly activity recorded for the selected period.')
    }
  }

  if (has('serviceMatrix')) {
    sectionHeading('Service breakdown table', 'serviceMatrix')
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
    sectionHeading('Most frequent patients', 'topPatients')
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

  if (has('patientAppendix')) {
    ensure(46)
    sectionHeading('Patient-level appendix', 'patientAppendix')
    if (meta.patientRows && meta.patientRows.length > 0) {
      const shown = meta.patientRows.length
      const matched = meta.patientRowsTotal ?? shown
      const omitted = Math.max(matched - shown, 0)
      const truncated = omitted > 0 || Boolean(meta.patientRowsTruncated)

      text(
        `Individual visits recorded in this period (${nf(shown)} of ${nf(matched)}${
          truncated ? ', most recent first' : ''
        }).`,
        M,
        y + 2,
        { size: 8, color: MUTED, style: 'italic' },
      )
      y += 8

      const cols: AnalyticsDetailColumn[] = ANALYTICS_APPENDIX_COLUMNS
      const weightOf = (key: string) =>
        key === 'diagnosis' ? 2.6
        : key === 'patientName' ? 2.2
        : key === 'service' ? 2
        : key === 'reason' ? 1.8
        : key === 'outcome' ? 1.3
        : key === 'date' ? 1.2
        : 0.8
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

      if (omitted > 0) {
        noteBlock(
          'Coverage.',
          `This appendix lists the ${nf(shown)} most recent visits of the ${nf(matched)} recorded in the period; ${nf(omitted)} earlier visits were omitted to keep the report printable. Re-run the report for a narrower period, or use the Analytics page drill-down, to inspect individual visits. Blank cells mean the field was not captured.`,
        )
      }
    } else {
      noData('No patient-level records available for the selected period.')
    }
  }

  doc.addPage()
  y = M
  sectionHeading('Certification', CERTIFICATION_KEY as AnalyticsReportSectionKey)

  noteBlock(
    'Statement.',
    `The figures in this report were generated from the MediTrack appointment register of the City Health Unit VII for ${meta.rangeLabel}, and are certified as a faithful summary of the records held at the time of generation.`,
  )

  const roles: [string, string][] = [
    ['Prepared by', meta.generatedBy?.trim() || 'Administrator'],
    ['Reviewed by', ''],
    ['Approved by', ''],
  ]
  const COL_W = INNER / 2

  roles.forEach(([role, name], i) => {
    ensure(18)
    const top = y + 4
    text(role.toUpperCase(), M, top, {
      size: 7.5,
      style: 'bold',
      color: MUTED,
    })
    text('Date', M + INNER - 24, top, {
      size: 7.5,
      style: 'bold',
      color: MUTED,
      align: 'center',
    })

    const lineY = top + 9
    doc.setDrawColor(BODY[0], BODY[1], BODY[2])
    doc.setLineWidth(0.25)
    doc.line(M, lineY, M + COL_W - 16, lineY)
    doc.line(M + INNER - 24, lineY, M + INNER, lineY)

    if (name) {
      text(name, M, lineY - 1.2, { size: 8.5, color: BODY })
    }
    y = lineY + 8
    if (i < roles.length - 1) y += 2
  })

  return { doc, headings, paint, stamp: stamp(new Date()) }
}

/**
 * Builds the Analytics Report PDF and triggers the browser download.
 * @param stats Statistics for the active filter, from `getAnalyticsStats`.
 * @param meta The filter that produced `stats`, plus the generating admin.
 */
export const generateAnalyticsReportPdf = (
  stats: AnalyticsStats,
  meta: AnalyticsReportMeta,
) => {
  const first = renderAnalyticsReport(stats, meta)
  const second = renderAnalyticsReport(stats, meta, first.headings)
  const { doc, paint } = second
  const generatedAt = second.stamp

  const pages = doc.getNumberOfPages()
  for (let p = 2; p <= pages; p++) {
    doc.setPage(p)
    doc.setDrawColor(LINE[0], LINE[1], LINE[2])
    doc.setLineWidth(0.25)
    doc.line(M, M - 4.5, M + INNER, M - 4.5)
    paint('City Health Unit VII', M, M - 8, {
      size: 7,
      style: 'bold',
      color: MUTED,
    })
    paint(`Analytics Report - ${meta.rangeLabel}`, M + INNER, M - 8, {
      size: 7,
      color: MUTED,
      align: 'right',
    })
  }

  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setDrawColor(LINE[0], LINE[1], LINE[2])
    doc.setLineWidth(0.25)
    doc.line(M, FOOT_Y - 4, M + INNER, FOOT_Y - 4)
    paint('MediTrack — City Health Unit VII Analytics Report', M, FOOT_Y, {
      size: 7.5,
      color: MUTED,
    })
    paint(`${meta.rangeLabel} · Generated ${generatedAt}`, M + INNER, FOOT_Y, {
      size: 7.5,
      color: MUTED,
      align: 'right',
    })
    paint(`Page ${p} of ${pages}`, PAGE_W / 2, FOOT_Y + 4, {
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

