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

    // Disease / case statistics from medical history records in the range
    let diseases: AnalyticsBreakdown[] = []
    let diseaseCases = 0
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
    } catch (mhError) {
      console.error('[getAnalyticsStats | medicalHistory | Error]:', mhError)
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
      } satisfies AnalyticsStats,
    }
  } catch (error) {
    console.error('[getAnalyticsStats | Prisma | Error]:', error)
    return { success: false, message: 'Failed to fetch analytics.' }
  }
}
