'use server'

import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/actions/guard'
import { getSlotLabel } from '@/config/appointment'
import { classifyMedicalCase } from '@/lib/analytics/disease'
import {
  ANALYTICS_RANGES,
  type AnalyticsRangeKey,
} from '@/lib/constants/analytics'

export type AnalyticsBreakdown = { label: string; count: number }

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
): Promise<{ success: boolean; message: string; stats?: AnalyticsStats }> {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Unauthorized' }
  }

  const role = (session.user as any)?.role ?? ''
  if (!['SUPERADMIN', 'ADMIN', 'MEDSTAFF'].includes(role)) {
    return { success: false, message: 'Unauthorized' }
  }

  const range =
    ANALYTICS_RANGES.find((r) => r.key === rangeKey) || ANALYTICS_RANGES[1]

  const where: any = {}
  if (range.days > 0) {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - (range.days - 1))
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    where.appointmentAt = { gte: start, lte: end }
  }

  // Fetch appointment records from the database based on the specified date range and compute various statistics.

  try {
    const rows = await (prisma as any).appointment.findMany({
      where,
      select: {
        appointmentAt: true,
        status: true,
        source: true,
        userId: true,
        service: { select: { name: true } },
        patient: { select: { sex: true } },
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

    // Sex breakdown per top-5 services
    const sexServiceMap = new Map<string, { male: number; female: number }>()
    for (const r of rows) {
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
      const mhWhere: any = {}
      if (range.days > 0) {
        const mhStart = new Date()
        mhStart.setHours(0, 0, 0, 0)
        mhStart.setDate(mhStart.getDate() - (range.days - 1))
        const mhEnd = new Date()
        mhEnd.setHours(23, 59, 59, 999)
        mhWhere.checkedDate = { gte: mhStart, lte: mhEnd }
      }

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

    // Blood type distribution from patient records
    let bloodTypes: AnalyticsBreakdown[] = []
    try {
      const bloodTypeRows = await (prisma as any).patient.groupBy({
        by: ['bloodType'],
        _count: { bloodType: true },
        where: { bloodType: { not: null } },
      })
      bloodTypes = bloodTypeRows
        .filter((r: any) => r.bloodType)
        .map((r: any) => ({
          label: r.bloodType as string,
          count: r._count.bloodType as number,
        }))
        .sort(
          (a: AnalyticsBreakdown, b: AnalyticsBreakdown) => b.count - a.count,
        )
    } catch (btErr) {
      console.error('[getAnalyticsStats | bloodTypes | Error]:', btErr)
    }

    // Age group distribution from ALL patients (not range-filtered — demographic)
    let ageGroups: AnalyticsBreakdown[] = []
    try {
      const patients = await (prisma as any).patient.findMany({
        select: { birthdate: true },
        where: { birthdate: { not: null } },
      })
      const ageGroupMap = new Map<string, number>()
      for (const label of AGE_GROUP_ORDER) ageGroupMap.set(label, 0)
      for (const p of patients) {
        const age = computeAge(p.birthdate)
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
        rangeLabel: range.label,
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
        weeklyTrend,
        vitals,
        immunization,
        sexByService,
        completionRate,
        noShowRate,
        cancellationRate,
        bloodTypes,
        ageGroups,
        pwdStats,
      } satisfies AnalyticsStats,
    }
  } catch (error) {
    console.error('[getAnalyticsStats | Prisma | Error]:', error)
    return { success: false, message: 'Failed to fetch analytics.' }
  }
}
