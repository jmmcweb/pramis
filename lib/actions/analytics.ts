'use server'

import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/actions/guard'
import { getSlotLabel } from '@/config/appointment'
import { classifyMedicalCase } from '@/lib/analytics/disease'
import {
  ANALYTICS_RANGES,
  isYearRangeKey,
  type AnalyticsRangeKey,
  type AnalyticsDetailSection,
} from '@/lib/constants/analytics'

export type AnalyticsBreakdown = { label: string; count: number }

export type AnalyticsDateWindow = {
  start: Date | null
  end: Date | null
  label: string
}

function resolveAnalyticsDateWindow(
  rangeKey: AnalyticsRangeKey,
  year?: number | null,
): AnalyticsDateWindow {
  const range =
    ANALYTICS_RANGES.find((r) => r.key === rangeKey) || ANALYTICS_RANGES[1]

  if (isYearRangeKey(range.key)) {
    const y = year ?? new Date().getFullYear()
    const safeYear = Number.isFinite(y) ? y : new Date().getFullYear()
    return {
      start: new Date(safeYear, 0, 1, 0, 0, 0, 0),
      end: new Date(safeYear, 11, 31, 23, 59, 59, 999),
      label: `Year ${safeYear}`,
    }
  }

  if (range.days > 0) {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - (range.days - 1))
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    return { start, end, label: range.label }
  }

  return { start: null, end: null, label: range.label }
}

// Applies a date window to a Prisma `where` clause on the given field.
function withDateWindow(where: any, field: string, win: AnalyticsDateWindow) {
  if (win.start && win.end) {
    where[field] = { gte: win.start, lte: win.end }
  }
  return where
}

// This file contains logic for fetching and computing analytics statistics for the Meditrack application. It includes functions to retrieve appointment data, classify medical cases, and compute various breakdowns such as service share, reasons for visits, outcomes, peak hours, and disease cases within a specified date range. The main function `getAnalyticsStats` returns an object containing the computed statistics along with success status and messages.

// Type definition for the analytics statistics object
export type AnalyticsStats = {
  rangeLabel: string
  total: number
  walkIns: number
  resident: number
  repeatVisits: number
  serviceShare: AnalyticsBreakdown[]
  reasons: AnalyticsBreakdown[]
  outcomes: AnalyticsBreakdown[]
  peakHours: AnalyticsBreakdown[]
  diseases: AnalyticsBreakdown[]
  diseaseCases: number
  // New health-center analytics
  vitals: {
    avgSystolic: number
    avgDiastolic: number
    avgHeartRate: number
    avgTemp: number
    avgOxygen: number
    avgRespRate: number
    hypertensionCount: number
    hypertensionPct: number
    totalWithVitals: number
  } | null
  immunization: AnalyticsBreakdown[]
  sexByService: { service: string; male: number; female: number }[]
  completionRate: number
  noShowRate: number
  cancellationRate: number
  bloodTypes: AnalyticsBreakdown[]
  ageGroups: AnalyticsBreakdown[]
  pwdStats: {
    total: number
    pct: number
    seniorCitizens: number
    seniorPct: number
  } | null
  // Trend and drill-down data used by the printable report.
  dailyTrend: AnalyticsBreakdown[]
  weeklyTrend: AnalyticsBreakdown[]
  /** Day-of-week distribution, e.g. "Monday" → count. */
  weekdayTrend: AnalyticsBreakdown[]
  /** Most frequent patients in the window. */
  topPatients: { name: string; visits: number; lastVisit: string }[]
  /** Per-service completion summary. */
  serviceMatrix: {
    service: string
    total: number
    completed: number
    noShow: number
    cancelled: number
    completionRate: number
  }[]
  /** New vs returning patients in the window. */
  patientMix: { newPatients: number; returningPatients: number }
}

// Maps a service name to a reason for the visit based on predefined keywords.
function reasonFromService(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('immuniz') || n.includes('vaccin'))
    return 'Immunization / Vaccination'
  if (n.includes('prenatal')) return 'Prenatal Care'
  if (n.includes('hypertension') || n.includes('hdm'))
    return 'Hypertension Management'
  if (
    n.includes('family planning') ||
    n.includes('condom') ||
    n.includes('pill')
  )
    return 'Family Planning'
  if (n.includes('consultation') || n.includes('check'))
    return 'Routine Check-up'
  if (n.includes('visual') || n.includes('via')) return 'Cancer Screening'
  if (n.includes('adolescent')) return 'Adolescent Health'
  return 'Others'
}

// Parse blood pressure string "systolic/diastolic" into numbers
function parseBp(
  bp?: string | null,
): { systolic: number; diastolic: number } | null {
  if (!bp) return null
  const m = String(bp).match(/(\d+)\s*\/\s*(\d+)/)
  if (!m) return null
  const systolic = parseInt(m[1], 10)
  const diastolic = parseInt(m[2], 10)
  if (Number.isNaN(systolic) || Number.isNaN(diastolic)) return null
  return { systolic, diastolic }
}

// Compute age from a birthdate
function computeAge(birthdate: Date | null): number | null {
  if (!birthdate) return null
  const now = Date.now()
  const age = Math.floor(
    (now - new Date(birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  )
  return age >= 0 ? age : null
}

// Bucket age into standard health-center age groups
function ageGroupLabel(age: number): string {
  if (age <= 4) return '0–4'
  if (age <= 14) return '5–14'
  if (age <= 24) return '15–24'
  if (age <= 34) return '25–34'
  if (age <= 44) return '35–44'
  if (age <= 54) return '45–54'
  if (age <= 64) return '55–64'
  return '65+'
}

const AGE_GROUP_ORDER = [
  '0–4',
  '5–14',
  '15–24',
  '25–34',
  '35–44',
  '45–54',
  '55–64',
  '65+',
]

// Fetches analytics statistics for appointments and medical cases within a specified date range. It computes various breakdowns such as service share, reasons for visits, outcomes, peak hours, and disease cases. The function checks user authorization and returns the computed statistics along with success status and messages.
export async function getAnalyticsStats(
  rangeKey: AnalyticsRangeKey = '1M',
  year?: number | null,
): Promise<{ success: boolean; message: string; stats?: AnalyticsStats }> {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Unauthorized' }
  }

  const role = (session.user as any)?.role ?? ''
  if (!['SUPERADMIN', 'ADMIN', 'MEDSTAFF'].includes(role)) {
    return { success: false, message: 'Unauthorized' }
  }

  const window = resolveAnalyticsDateWindow(rangeKey, year)
  const rangeLabel = window.label

  const where: any = withDateWindow({}, 'appointmentAt', window)

  // Fetch appointment records from the database based on the specified date range and compute various statistics.

  try {
    const rows = await (prisma as any).appointment.findMany({
      where,
      select: {
        appointmentAt: true,
        status: true,
        source: true,
        userId: true,
        patientId: true,
        familyMemberId: true,
        service: { select: { name: true } },
        patient: {
          select: { sex: true, name: true, patientid: true, bloodType: true },
        },
        user: { select: { profile: { select: { firstName: true, lastName: true } } } },
      },
    })

    const total = rows.length

    const walkIns = rows.filter((r: any) => r.source === 'WALK_IN').length
    const resident = total - walkIns

    const ownerCounts = new Map<string, number>()
    for (const r of rows) {
      if (r.userId)
        ownerCounts.set(r.userId, (ownerCounts.get(r.userId) ?? 0) + 1)
    }
    let repeatVisits = 0
    for (const c of ownerCounts.values()) {
      if (c > 1) repeatVisits += c - 1
    }

    const serviceMap = new Map<string, number>()
    const reasonMap = new Map<string, number>()
    for (const r of rows) {
      const name = r.service?.name ?? 'Others'
      serviceMap.set(name, (serviceMap.get(name) ?? 0) + 1)
      const reason = reasonFromService(name)
      reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1)
    }
    const serviceShare = [...serviceMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
    const reasons = [...reasonMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)

    const outcomeLabels: Record<string, string> = {
      PENDING: 'Pending',
      APPROVED: 'Approved',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      NO_SHOW: 'No Show',
    }
    const outcomeMap = new Map<string, number>()
    for (const r of rows) {
      const statusKey = String(r.status ?? '').toUpperCase()
      const label = outcomeLabels[statusKey] ?? statusKey
      if (label) outcomeMap.set(label, (outcomeMap.get(label) ?? 0) + 1)
    }
    const outcomes = [...outcomeMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)

    // Completion / No-show / Cancellation rates
    const completedCount = outcomeMap.get('Completed') ?? 0
    const noShowCount = outcomeMap.get('No Show') ?? 0
    const cancelledCount = outcomeMap.get('Cancelled') ?? 0
    const completionRate = total
      ? parseFloat(((completedCount / total) * 100).toFixed(1))
      : 0
    const noShowRate = total
      ? parseFloat(((noShowCount / total) * 100).toFixed(1))
      : 0
    const cancellationRate = total
      ? parseFloat(((cancelledCount / total) * 100).toFixed(1))
      : 0

    const hourMap = new Map<string, number>()
    for (const r of rows) {
      if (r.appointmentAt) {
        const at = new Date(r.appointmentAt)
        const slotId = `${String(at.getUTCHours()).padStart(2, '0')}:00`
        hourMap.set(slotId, (hourMap.get(slotId) ?? 0) + 1)
      }
    }
    const peakHours = [...hourMap.entries()]
      .map(([slotId, count]) => ({ label: getSlotLabel(slotId), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Weekly trend: group appointments by ISO week (YYYY-Www)
    const weekMap = new Map<string, number>()
    for (const r of rows) {
      if (r.appointmentAt) {
        const d = new Date(r.appointmentAt)
        // Get ISO week number
        const dayOfWeek = (d.getUTCDay() + 6) % 7 // Mon=0
        const thursday = new Date(d)
        thursday.setUTCDate(d.getUTCDate() - dayOfWeek + 3)
        const firstThursday = new Date(thursday.getUTCFullYear(), 0, 4)
        const weekNum =
          1 +
          Math.round(
            ((thursday.getTime() - firstThursday.getTime()) / 86400000 -
              3 +
              ((firstThursday.getUTCDay() + 6) % 7)) /
              7,
          )
        const label = `W${String(weekNum).padStart(2, '0')} '${String(d.getUTCFullYear()).slice(2)}`
        weekMap.set(label, (weekMap.get(label) ?? 0) + 1)
      }
    }
    const weeklyTrend = [...weekMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label))

    // Daily trend (newest last) for the printable report.
    const dayMap = new Map<string, number>()
    for (const r of rows) {
      if (!r.appointmentAt) continue
      const d = new Date(r.appointmentAt)
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
      dayMap.set(key, (dayMap.get(key) ?? 0) + 1)
    }
    const dailyTrend = [...dayMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label))

    // Day-of-week distribution to reveal busiest weekdays.
    const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const weekdayMap = new Map<string, number>()
    for (const r of rows) {
      if (!r.appointmentAt) continue
      const label = WEEKDAYS[new Date(r.appointmentAt).getUTCDay()]
      weekdayMap.set(label, (weekdayMap.get(label) ?? 0) + 1)
    }
    const weekdayTrend = WEEKDAYS.filter((d) => (weekdayMap.get(d) ?? 0) > 0).map((d) => ({
      label: d,
      count: weekdayMap.get(d) ?? 0,
    }))

    // Most frequent patients, resolved from the patient record or the owner's profile.
    const visitMap = new Map<string, { name: string; visits: number; last: number }>()
    for (const r of rows) {
      if (!r.userId) continue
      const profile = (r as any).user?.profile
      const name =
        (r as any).patient?.name ||
        [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() ||
        'Unnamed patient'
      const at = r.appointmentAt ? new Date(r.appointmentAt).getTime() : 0
      const entry = visitMap.get(r.userId)
      if (entry) {
        entry.visits += 1
        entry.last = Math.max(entry.last, at)
      } else {
        visitMap.set(r.userId, { name, visits: 1, last: at })
      }
    }
    const topPatients = [...visitMap.values()]
      .sort((a, b) => b.visits - a.visits || b.last - a.last)
      .slice(0, 15)
      .map((p) => ({
        name: p.name,
        visits: p.visits,
        lastVisit: p.last ? new Date(p.last).toISOString().slice(0, 10) : '—',
      }))

    // Per-service completion summary, so the report shows reliability per service.
    const matrixMap = new Map<
      string,
      { total: number; completed: number; noShow: number; cancelled: number }
    >()
    for (const r of rows) {
      const service = r.service?.name ?? 'Others'
      const statusKey = String(r.status ?? '').toUpperCase()
      const entry = matrixMap.get(service) ?? { total: 0, completed: 0, noShow: 0, cancelled: 0 }
      entry.total += 1
      if (statusKey === 'COMPLETED') entry.completed += 1
      else if (statusKey === 'NO_SHOW') entry.noShow += 1
      else if (statusKey === 'CANCELLED') entry.cancelled += 1
      matrixMap.set(service, entry)
    }
    const serviceMatrix = [...matrixMap.entries()]
      .map(([service, v]) => ({
        service,
        total: v.total,
        completed: v.completed,
        noShow: v.noShow,
        cancelled: v.cancelled,
        completionRate: v.total
          ? parseFloat(((v.completed / v.total) * 100).toFixed(1))
          : 0,
      }))
      .sort((a, b) => b.total - a.total)

    const patientMix = { newPatients: 0, returningPatients: 0 }
    if (total > 0) {
      try {
        const earliest = new Map<string, Date>()
        for (const r of rows) {
          if (!r.userId || !r.appointmentAt) continue
          const at = new Date(r.appointmentAt)
          const cur = earliest.get(r.userId)
          if (!cur || at < cur) earliest.set(r.userId, at)
        }
        const ids = [...earliest.keys()]
        if (ids.length > 0) {
          const before = await (prisma as any).appointment.groupBy({
            by: ['userId'],
            where: {
              userId: { in: ids },
              appointmentAt: { lt: where.appointmentAt?.gte ?? new Date() },
            },
            _count: { _all: true },
          })
          const seenBefore = new Set(before.map((b: any) => b.userId))
          for (const id of ids) {
            if (seenBefore.has(id)) patientMix.returningPatients += 1
            else patientMix.newPatients += 1
          }
        }
      } catch (mixErr) {
        console.error('[getAnalyticsStats | patientMix | Error]:', mixErr)
      }
    }

    // Sex breakdown per top-5 services. Distinct patients with visits in the
    // window only: a patient with several visits counts once per service
    // rather than once per appointment (per the same visits-only rule the
    // age-group chart uses). `patientId` is authoritative, so family-member
    // visits resolve to the member's own identity instead of the booking
    // account, and overlapping appointment/patient records collapse here.
    const sexServiceMap = new Map<string, { male: number; female: number }>()
    const seenSexPatients = new Set<string>()
    for (const r of rows) {
      const owner =
        String(r.patientId ?? r.familyMemberId ?? r.userId ?? '').trim() ||
        String(r.patient?.patientid ?? '').trim()
      if (!owner) continue
      if (seenSexPatients.has(owner)) continue
      seenSexPatients.add(owner)
      const name = r.service?.name ?? 'Others'
      const sex = String(r.patient?.sex ?? '').toLowerCase()
      const entry = sexServiceMap.get(name) ?? { male: 0, female: 0 }
      if (sex === 'male' || sex === 'm') entry.male++
      else if (sex === 'female' || sex === 'f') entry.female++
      sexServiceMap.set(name, entry)
    }
    const sexByService = [...sexServiceMap.entries()]
      .map(([service, counts]) => ({ service, ...counts }))
      .sort((a, b) => b.male + b.female - (a.male + a.female))
      .slice(0, 6)

    // Disease / case statistics from medical history records in the range
    let diseases: AnalyticsBreakdown[] = []
    let diseaseCases = 0
    let vitals: AnalyticsStats['vitals'] = null
    let immunization: AnalyticsBreakdown[] = []

    try {
      const mhWhere: any = withDateWindow({}, 'checkedDate', window)

      const cases = await (prisma as any).medicalHistory.findMany({
        where: mhWhere,
        select: {
          diagnosis: true,
          bloodPressure: true,
          heartRate: true,
          respiratoryRate: true,
          temperature: true,
          oxygenLevel: true,
          // Immunization fields
          immBcg: true,
          immHepab24: true,
          immHepab24plus: true,
          immPenta1: true,
          immPenta2: true,
          immPenta3: true,
          immOpv1: true,
          immOpv2: true,
          immOpv3: true,
          immRota1: true,
          immRota2: true,
          immPcv1: true,
          immPcv2: true,
          immPcv3: true,
          immMcv1: true,
          immMcv2: true,
          immHepab2: true,
          immHepab3: true,
          immHepaa: true,
          immPneumonia: true,
          immInfluenza: true,
          immOthers: true,
          appointment: { select: { service: { select: { name: true } } } },
        },
      })

      // Classify each case into a disease category via diagnosis keywords
      // (falling back to the blood pressure reading when diagnosis is generic).
      const diseaseMap = new Map<string, number>()
      let categorized = 0
      for (const c of cases) {
        const label = classifyMedicalCase(
          c.diagnosis,
          c.bloodPressure,
          c.appointment?.service?.name,
        )
        if (!label) continue
        categorized += 1
        diseaseMap.set(label, (diseaseMap.get(label) ?? 0) + 1)
      }
      diseases = [...diseaseMap.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
      diseaseCases = categorized

      // Vitals aggregation
      let sumSystolic = 0,
        sumDiastolic = 0,
        cntBp = 0
      let sumHr = 0,
        cntHr = 0
      let sumTemp = 0,
        cntTemp = 0
      let sumOxy = 0,
        cntOxy = 0
      let sumResp = 0,
        cntResp = 0
      let hypertensionCount = 0

      for (const c of cases) {
        const bp = parseBp(c.bloodPressure)
        if (bp) {
          sumSystolic += bp.systolic
          sumDiastolic += bp.diastolic
          cntBp++
          if (bp.systolic >= 140 || bp.diastolic >= 90) hypertensionCount++
        }
        const hr = parseFloat(String(c.heartRate ?? ''))
        if (!isNaN(hr) && hr > 0) {
          sumHr += hr
          cntHr++
        }
        const temp = parseFloat(String(c.temperature ?? ''))
        if (!isNaN(temp) && temp > 0) {
          sumTemp += temp
          cntTemp++
        }
        const oxy = parseFloat(String(c.oxygenLevel ?? ''))
        if (!isNaN(oxy) && oxy > 0) {
          sumOxy += oxy
          cntOxy++
        }
        const resp = parseFloat(String(c.respiratoryRate ?? ''))
        if (!isNaN(resp) && resp > 0) {
          sumResp += resp
          cntResp++
        }
      }

      vitals =
        cntBp > 0
          ? {
              avgSystolic: Math.round(sumSystolic / cntBp),
              avgDiastolic: Math.round(sumDiastolic / cntBp),
              avgHeartRate: cntHr > 0 ? Math.round(sumHr / cntHr) : 0,
              avgTemp:
                cntTemp > 0 ? parseFloat((sumTemp / cntTemp).toFixed(1)) : 0,
              avgOxygen:
                cntOxy > 0 ? parseFloat((sumOxy / cntOxy).toFixed(1)) : 0,
              avgRespRate: cntResp > 0 ? Math.round(sumResp / cntResp) : 0,
              hypertensionCount,
              hypertensionPct: parseFloat(
                ((hypertensionCount / cntBp) * 100).toFixed(1),
              ),
              totalWithVitals: cntBp,
            }
          : null

      // Immunization coverage count
      const immFields: { key: string; label: string }[] = [
        { key: 'immBcg', label: 'BCG' },
        { key: 'immHepab24', label: 'HepB (birth dose)' },
        { key: 'immHepab24plus', label: 'HepB (24h+)' },
        { key: 'immPenta1', label: 'Penta 1' },
        { key: 'immPenta2', label: 'Penta 2' },
        { key: 'immPenta3', label: 'Penta 3' },
        { key: 'immOpv1', label: 'OPV 1' },
        { key: 'immOpv2', label: 'OPV 2' },
        { key: 'immOpv3', label: 'OPV 3' },
        { key: 'immRota1', label: 'Rota 1' },
        { key: 'immRota2', label: 'Rota 2' },
        { key: 'immPcv1', label: 'PCV 1' },
        { key: 'immPcv2', label: 'PCV 2' },
        { key: 'immPcv3', label: 'PCV 3' },
        { key: 'immMcv1', label: 'MCV 1' },
        { key: 'immMcv2', label: 'MCV 2' },
        { key: 'immHepab2', label: 'HepB 2' },
        { key: 'immHepab3', label: 'HepB 3' },
        { key: 'immHepaa', label: 'HepA' },
        { key: 'immPneumonia', label: 'Pneumonia' },
        { key: 'immInfluenza', label: 'Influenza' },
        { key: 'immOthers', label: 'Others' },
      ]
      const immCounts = new Map<string, number>()
      for (const c of cases) {
        for (const { key, label } of immFields) {
          if ((c as any)[key]) {
            immCounts.set(label, (immCounts.get(label) ?? 0) + 1)
          }
        }
      }
      immunization = [...immCounts.entries()]
        .map(([label, count]) => ({ label, count }))
        .filter((e) => e.count > 0)
        .sort((a, b) => b.count - a.count)
    } catch (mhError) {
      console.error('[getAnalyticsStats | medicalHistory | Error]:', mhError)
    }

    let bloodTypes: AnalyticsBreakdown[] = []
    try {
      const seenBtPatients = new Set<string>()
      const btCounts = new Map<string, number>()
      for (const r of rows) {
        const patient = r.patient
        const sexKey =
          String(patient?.sex ?? '').trim().toUpperCase()
        const personName = patient?.name ?? ''
        const nameKey = personName.trim().toLowerCase().replace(/\s+/g, ' ')
        const owner =
          String(r.patientId ?? r.familyMemberId ?? r.userId ?? '').trim() ||
          String(
            patient?.patientid ??
            r.familyMemberId ??
            `${sexKey}||${nameKey}`,
          ).trim()
        if (!owner) continue
        if (seenBtPatients.has(owner)) continue
        seenBtPatients.add(owner)
        const bt = String(r.patient?.bloodType ?? '').trim().toUpperCase()
        if (!bt) continue
        btCounts.set(bt, (btCounts.get(bt) ?? 0) + 1)
      }
      bloodTypes = [...btCounts.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a: AnalyticsBreakdown, b: AnalyticsBreakdown) => b.count - a.count)
    } catch (btErr) {
      console.error('[getAnalyticsStats | bloodTypes | Error]:', btErr)
    }

    let ageGroups: AnalyticsBreakdown[] = []
    try {
      const seenAgePatients = new Set<string>()
      const ageGroupMap = new Map<string, number>()
      for (const label of AGE_GROUP_ORDER) ageGroupMap.set(label, 0)
      const ageAppointments = await (prisma as any).appointment.findMany({
        where,
        select: {
          patientId: true,
          familyMemberId: true,
          userId: true,
          patient: { select: { patientid: true, birthdate: true, name: true, sex: true } },
          familyMember: { select: { familymemberid: true, birthdate: true, name: true, sex: true } },
          user: { select: { profile: { select: { firstName: true, lastName: true, birthdate: true, sex: true } } } },
        },
      })
      for (const appt of ageAppointments) {
        const patient = appt.patient
        const member = appt.familyMember
        const profile = appt.user?.profile ?? null
        const birthdate = patient?.birthdate ?? member?.birthdate ?? profile?.birthdate ?? null
        if (!birthdate) continue
        const isoDob = new Date(birthdate).toISOString().slice(0, 10)
        const personName =
          member?.name ??
          patient?.name ??
          `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim()
        const sexKey = String(member?.sex ?? patient?.sex ?? profile?.sex ?? '').trim().toUpperCase()
        const nameKey = personName.trim().toLowerCase().replace(/\s+/g, ' ')
        const owner =
          String(appt.patientId ?? appt.familyMemberId ?? appt.userId ?? '').trim() ||
          String(
            patient?.patientid ??
            member?.familymemberid ??
            `${sexKey}||${nameKey}||${isoDob}`
          ).trim()
        if (!owner) continue
        if (seenAgePatients.has(owner)) continue
        seenAgePatients.add(owner)
        const age = computeAge(birthdate)
        if (age !== null) {
          const label = ageGroupLabel(age)
          ageGroupMap.set(label, (ageGroupMap.get(label) ?? 0) + 1)
        }
      }
      ageGroups = AGE_GROUP_ORDER.map((label) => ({
        label,
        count: ageGroupMap.get(label) ?? 0,
      }))
    } catch (ageErr) {
      console.error('[getAnalyticsStats | ageGroups | Error]:', ageErr)
    }

    // PWD & Senior Citizen stats from UserProfile
    let pwdStats: AnalyticsStats['pwdStats'] = null
    try {
      const profiles = await (prisma as any).userProfile.findMany({
        select: { validIdType: true, membershipType: true, isPwd: true },
      })
      const totalProfiles = profiles.length
      let pwdCount = 0
      let seniorCount = 0
      for (const p of profiles) {
        const idType = String(p.validIdType ?? '').toLowerCase()
        const membership = String(p.membershipType ?? '').toLowerCase()
        // `isPwd` is the declaration captured during signup; the ID type /
        // membership checks only keep older accounts counted.
        if (
          p.isPwd === true ||
          idType.includes('pwd') ||
          membership.includes('pwd')
        )
          pwdCount++
        if (idType.includes('senior') || membership.includes('senior'))
          seniorCount++
      }
      pwdStats = {
        total: pwdCount,
        pct:
          totalProfiles > 0
            ? parseFloat(((pwdCount / totalProfiles) * 100).toFixed(1))
            : 0,
        seniorCitizens: seniorCount,
        seniorPct:
          totalProfiles > 0
            ? parseFloat(((seniorCount / totalProfiles) * 100).toFixed(1))
            : 0,
      }
    } catch (pwdErr) {
      console.error('[getAnalyticsStats | pwdStats | Error]:', pwdErr)
    }

    return {
      success: true,
      message: 'Analytics fetched successfully.',
      stats: {
        rangeLabel,
        total,
        walkIns,
        resident,
        repeatVisits,
        serviceShare,
        reasons,
        outcomes,
        peakHours,
        diseases,
        diseaseCases,
        vitals,
        immunization,
        sexByService,
        completionRate,
        noShowRate,
        cancellationRate,
        bloodTypes,
        ageGroups,
        pwdStats,
        dailyTrend,
        weeklyTrend,
        weekdayTrend,
        topPatients,
        serviceMatrix,
        patientMix,
      } satisfies AnalyticsStats,
    }
  } catch (error) {
    console.error('[getAnalyticsStats | Prisma | Error]:', error)
    return { success: false, message: 'Failed to fetch analytics.' }
  }
}

export type AnalyticsDetailRow = {
  key: string
  appointmentRef: string
  patientName: string
  relation: string
  age: number | null
  birthdate: string | null
  sex: string
  address: string
  contact: string
  bloodType: string
  philHealth: string
  religion: string
  patientRef: string
  service: string
  reason: string
  outcome: string
  category: string
  date: string
  bookedOn: string | null
  source: string
  diagnosis: string
  /** Human-readable appointment time slot, shown for the peak-hours report. */
  slot: string
  /** Classified medical condition, shown for the disease report. */
  disease: string
  /** Clinician who recorded the visit, shown for the disease report. */
  checkedBy: string
  /** Visits the same patient has inside the window (repeat-visit report). */
  visits: number | null
}

// The section keys live with the other analytics constants so the page and the
// server action agree on the drill-down vocabulary.
export type { AnalyticsDetailSection } from '@/lib/constants/analytics'

/**
 * Returns the individual records behind a chart so the admin can drill into the
 * patients behind an aggregate. `label` narrows the result to a single category
 * (e.g. only "Hypertension" cases, or only male patients); omit it to get every
 * record in the section.
 * Results are capped so a "All Time" range cannot exhaustively return the table.
 */
export async function getAnalyticsSectionRows(
  section: AnalyticsDetailSection,
  rangeKey: AnalyticsRangeKey = '1M',
  year?: number | null,
  label?: string | null,
): Promise<{
  success: boolean
  message: string
  rows: AnalyticsDetailRow[]
  totalMatched: number
  rangeLabel: string
}> {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Unauthorized', rows: [], totalMatched: 0, rangeLabel: '' }
  }

  const role = (session.user as any)?.role ?? ''
  if (!['SUPERADMIN', 'ADMIN', 'MEDSTAFF'].includes(role)) {
    return { success: false, message: 'Unauthorized', rows: [], totalMatched: 0, rangeLabel: '' }
  }

  const DETAIL_LIMIT = 500
  const window = resolveAnalyticsDateWindow(rangeKey, year)
  const rangeLabel = window.label

  try {
    const appointments = await (prisma as any).appointment.findMany({
      where: withDateWindow({}, 'appointmentAt', window),
      select: {
        appointmentid: true,
        appointmentAt: true,
        createdAt: true,
        status: true,
        source: true,
        userId: true,
        familyMemberId: true,
        patientId: true,
        service: { select: { name: true } },
        patient: {
          select: {
            patientid: true,
            name: true,
            birthdate: true,
            sex: true,
            bloodType: true,
            religion: true,
            phoneNumber: true,
            houseNumber: true,
            purok: true,
            barangay: true,
            city: true,
            province: true,
            zipCode: true,
          },
        },
        user: {
          select: {
            profile: {
              select: {
                firstName: true,
                middleName: true,
                lastName: true,
                suffix: true,
                birthdate: true,
                sex: true,
                bloodType: true,
                religion: true,
                phoneNumber: true,
                houseNumber: true,
                purok: true,
                barangay: true,
                city: true,
                province: true,
                zipCode: true,
                philHealthNo: true,
                isPwd: true,
                validIdType: true,
                membershipType: true,
              },
            },
          },
        },
        familyMember: {
          select: {
            familymemberid: true,
            name: true,
            relation: true,
            sex: true,
            birthdate: true,
            bloodType: true,
            religion: true,
            phone: true,
            houseNumber: true,
            purok: true,
            barangay: true,
            city: true,
            province: true,
            zipCode: true,
            philHealthNo: true,
          },
        },
        medicalHistory: {
          select: { diagnosis: true, bloodPressure: true, checkedBy: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { appointmentAt: 'desc' },
    })

    const outcomeLabels: Record<string, string> = {
      PENDING: 'Pending',
      APPROVED: 'Approved',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      NO_SHOW: 'No Show',
    }

    const visitCounts = new Map<string, number>()
    for (const a of appointments) {
      const patient = a.patient
      const member = a.familyMember
      const profile = a.user?.profile
      const sexKey =
        String(patient?.sex ?? member?.sex ?? profile?.sex ?? '').trim().toUpperCase()
      const personName =
        member?.name ??
        patient?.name ??
        `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim()
      const nameKey = personName.trim().toLowerCase().replace(/\s+/g, ' ')
      const isoDob = patient?.birthdate ?? member?.birthdate ?? profile?.birthdate ?? null
      const dobStamp = isoDob ? new Date(isoDob).toISOString().slice(0, 10) : null
      const owner =
        String(a.patientId ?? a.familyMemberId ?? a.userId ?? '').trim() ||
        String(
          patient?.patientid ??
          member?.familymemberid ??
          `${sexKey}||${nameKey}||${dobStamp}`,
        ).trim()
      visitCounts.set(owner, (visitCounts.get(owner) ?? 0) + 1)
    }

    const joinAddress = (...parts: Array<unknown>) =>
      parts
        .map((p) => String(p ?? '').trim())
        .filter(Boolean)
        .join(', ')

    const fullName = (p: any) =>
      [p?.firstName, p?.middleName, p?.lastName, p?.suffix]
        .filter(Boolean)
        .join(' ')
        .trim()

    const mapped = appointments.map((a: any) => {
      const service = a.service?.name ?? 'Others'
      const mh = a.medicalHistory
      const profile = a.user?.profile
      const patient = a.patient
      const member = a.familyMember
      const patientName =
        patient?.name ||
        member?.name ||
        fullName(profile) ||
        'Unnamed patient'
      const birthdate =
        patient?.birthdate ?? member?.birthdate ?? profile?.birthdate ?? null
      const age = computeAge(birthdate ? new Date(birthdate) : null)
      const sexKey =
        String(patient?.sex ?? member?.sex ?? profile?.sex ?? '').trim().toUpperCase()
      const personName =
        member?.name ?? patient?.name ?? `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim()
      const nameKey = personName.trim().toLowerCase().replace(/\s+/g, ' ')
      const isoDob = birthdate ? new Date(birthdate).toISOString().slice(0, 10) : null
      const statusKey = String(a.status ?? '').toUpperCase()
      const outcome = outcomeLabels[statusKey] ?? statusKey
      const owner =
        String(a.patientId ?? a.familyMemberId ?? a.userId ?? '').trim() ||
        String(
          patient?.patientid ??
          member?.familymemberid ??
          `${sexKey}||${nameKey}||${isoDob}`
        ).trim()
      const idType = String(profile?.validIdType ?? '').toLowerCase()
      const membership = String(profile?.membershipType ?? '').toLowerCase()

      const home = patient ?? member ?? null
      const address =
        joinAddress(
          home?.houseNumber,
          home?.purok,
          home?.barangay,
          home?.city,
          home?.province,
          home?.zipCode,
        ) ||
        joinAddress(
          profile?.houseNumber,
          profile?.purok,
          profile?.barangay,
          profile?.city,
          profile?.province,
          profile?.zipCode,
        )
      const contact = String(
        patient?.phoneNumber ?? member?.phone ?? profile?.phoneNumber ?? '',
      ).trim()
      const philHealth = String(
        member?.philHealthNo ?? profile?.philHealthNo ?? '',
      ).trim()
      const religion = String(
        patient?.religion ?? member?.religion ?? profile?.religion ?? '',
      ).trim()
      const relation = member?.relation
        ? `Family member (${member.relation})`
        : a.userId
          ? 'Self (account holder)'
          : 'Patient record'
      const patientRef = String(
        patient?.patientid ?? member?.familymemberid ?? a.patientId ?? '',
      ).trim()

      return {
        key: String(a.appointmentid),
        appointmentRef: String(a.appointmentid),
        patientName,
        relation,
        age,
        birthdate: birthdate
          ? new Date(birthdate).toISOString().slice(0, 10)
          : null,
        sex:
          String(patient?.sex ?? member?.sex ?? profile?.sex ?? '').trim() ||
          '—',
        address: address || '—',
        contact: contact || '—',
        bloodType: String(
          patient?.bloodType ?? member?.bloodType ?? profile?.bloodType ?? '',
        ).trim(),
        philHealth: philHealth || '—',
        religion: religion || '—',
        patientRef: patientRef || '—',
        service,
        reason: reasonFromService(service),
        outcome,
        disease: classifyMedicalCase(mh?.diagnosis, mh?.bloodPressure, service),
        ageGroup: age === null ? null : ageGroupLabel(age),
        hour: a.appointmentAt
          ? `${String(new Date(a.appointmentAt).getUTCHours()).padStart(2, '0')}:00`
          : '',
        date: new Date(a.appointmentAt).toISOString(),
        bookedOn: a.createdAt ? new Date(a.createdAt).toISOString() : null,
        diagnosis: String(mh?.diagnosis ?? '').trim(),
        checkedBy: mh?.checkedBy
          ? [mh.checkedBy.firstName, mh.checkedBy.lastName].filter(Boolean).join(' ').trim()
          : '',
        source: String(a.source ?? '').trim().toUpperCase(),
        visits: visitCounts.get(owner) ?? 1,
        isPwd:
          profile?.isPwd === true ||
          idType.includes('pwd') ||
          membership.includes('pwd'),
        isSenior:
          idType.includes('senior') ||
          membership.includes('senior') ||
          (age !== null && age >= 60),
        owner,
      }
    })

    const norm = (v: unknown) => String(v ?? '').toLowerCase()

    const eq = (value: unknown) => !!label && norm(value) === norm(label)

    const matches = (r: (typeof mapped)[number]) => {
      if (section === 'repeatVisits') return r.visits > 1
      if (section === 'walkIns') return r.source === 'WALK_IN'
      if (section === 'pwd') return r.isPwd
      if (section === 'senior') return r.isSenior
      if (!label) return true
      switch (section) {
        case 'serviceShare':
          return norm(r.service) === norm(label)
        case 'reasons':
          return norm(r.reason) === norm(label)
        case 'outcomes':
          return norm(r.outcome) === norm(label)
        case 'peakHours':
          // `label` is the human slot text shown on the chart, not the raw hour.
          return eq(getSlotLabel(r.hour))
        case 'ageGroups':
          return norm(r.ageGroup) === norm(label)
        case 'diseases':
          return norm(r.disease) === norm(label)
        case 'sexByService':
          if (norm(label) === 'male' || norm(label) === 'female')
            return norm(r.sex) === norm(label)
          return norm(r.service) === norm(label)
        case 'immunization':
          return norm(r.service).includes('immuniz') || norm(r.service).includes('vaccin')
        case 'bloodTypes':
          return eq(r.bloodType)
        default:
          return false
      }
    }

    const filtered = mapped.filter(matches)

    const seen = new Set<string>()
    const deduplicated = filtered.filter((r) => {
      if (seen.has(r.owner)) return false
      seen.add(r.owner)
      return true
    })

    const rows: AnalyticsDetailRow[] = deduplicated.slice(0, DETAIL_LIMIT).map((r) => ({
      key: r.key,
      patientName: r.patientName,
      relation: r.relation,
      age: r.age,
      birthdate: r.birthdate,
      sex: r.sex,
      address: r.address,
      contact: r.contact,
      bloodType: r.bloodType || '—',
      philHealth: r.philHealth,
      religion: r.religion,
      patientRef: r.patientRef,
      service: r.service,
      reason: r.reason,
      outcome: r.outcome,
      category:
        section === 'diseases'
          ? (r.disease ?? '')
          : section === 'ageGroups'
            ? (r.ageGroup ?? '')
            : section === 'repeatVisits'
              ? `${r.visits} visits`
              : section === 'pwd'
                ? 'PWD'
                : section === 'senior'
                  ? 'Senior citizen'
                  : section === 'walkIns'
                    ? 'Walk-in'
                    : r.outcome,
      date: r.date,
      bookedOn: r.bookedOn,
      source: r.source,
      diagnosis: r.diagnosis,
      slot: r.hour ? getSlotLabel(r.hour) : '—',
      disease: r.disease || '—',
      checkedBy: r.checkedBy || '—',
      visits: r.visits ?? 1,
    }))

    return {
      success: true,
      message: 'Rows fetched.',
      rows,
      totalMatched: deduplicated.length,
      rangeLabel,
    }
  } catch (error) {
    console.error('[getAnalyticsSectionRows | Prisma | Error]:', error)
    return { success: false, message: 'Failed to fetch details.', rows: [], totalMatched: 0, rangeLabel }
  }
}

export async function getAnalyticsYears(): Promise<{
  success: boolean
  message: string
  years: number[]
}> {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Unauthorized', years: [] }
  }

  const role = (session.user as any)?.role ?? ''
  if (!['SUPERADMIN', 'ADMIN', 'MEDSTAFF'].includes(role)) {
    return { success: false, message: 'Unauthorized', years: [] }
  }

  const currentYear = new Date().getFullYear()

  try {
    const bounds = await (prisma as any).appointment.aggregate({
      _min: { appointmentAt: true },
      _max: { appointmentAt: true },
    })

    const min = bounds?._min?.appointmentAt
      ? new Date(bounds._min.appointmentAt).getFullYear()
      : currentYear
    const max = bounds?._max?.appointmentAt
      ? new Date(bounds._max.appointmentAt).getFullYear()
      : currentYear

    const first = Math.max(Math.min(min, currentYear), currentYear - 11)
    const last = Math.max(max, currentYear)

    const years: number[] = []
    for (let y = last; y >= first; y--) years.push(y)

    return { success: true, message: 'Years fetched.', years }
  } catch (error) {
    console.error('[getAnalyticsYears | Prisma | Error]:', error)
    return { success: false, message: 'Failed to fetch years.', years: [] }
  }
}
