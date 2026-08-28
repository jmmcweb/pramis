'use server'

import prisma from '@/lib/prisma'
import { requireAdmin, requireStaff } from '@/lib/actions/guard'
import { getSlotLabel } from '@/config/appointment'
import {
  ANALYTICS_RANGES,
  type AnalyticsRangeKey,
} from '@/lib/constants/analytics'

export type AnalyticsBreakdown = { label: string; count: number }

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
}

function reasonFromService(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('immuniz') || n.includes('vaccin')) return 'Immunization / Vaccination'
  if (n.includes('prenatal')) return 'Prenatal Care'
  if (n.includes('hypertension') || n.includes('hdm')) return 'Hypertension Management'
  if (n.includes('family planning') || n.includes('condom') || n.includes('pill'))
    return 'Family Planning'
  if (n.includes('consultation') || n.includes('check')) return 'Routine Check-up'
  if (n.includes('visual') || n.includes('via')) return 'Cancer Screening'
  if (n.includes('adolescent')) return 'Adolescent Health'
  return 'Others'
}

export async function getAnalyticsStats(
  rangeKey: AnalyticsRangeKey = '1M',
): Promise<{ success: boolean; message: string; stats?: AnalyticsStats }> {
  const session = await requireAdmin()
  if (!session) {
    const staff = await requireStaff()
    if (!staff) {
      return { success: false, message: 'Unauthorized' }
    }
  }

  const range = ANALYTICS_RANGES.find((r) => r.key === rangeKey) || ANALYTICS_RANGES[1]
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (range.days - 1))
  const end = new Date()
  end.setHours(23, 59, 59, 999)

  try {
    const rows = await (prisma as any).appointment.findMany({
      where: { appointmentAt: { gte: start, lte: end } },
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
    for (const r of rows) if (r.userId) ownerCounts.set(r.userId, (ownerCounts.get(r.userId) ?? 0) + 1)
    let repeatVisits = 0
    for (const c of ownerCounts.values()) if (c > 1) repeatVisits += c - 1

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
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      NO_SHOW: 'No Show',
    }
    const outcomeMap = new Map<string, number>()
    for (const r of rows) {
      const label = outcomeLabels[r.status as string]
      if (label) outcomeMap.set(label, (outcomeMap.get(label) ?? 0) + 1)
    }
    const outcomes = [...outcomeMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)

    const hourMap = new Map<string, number>()
    for (const r of rows) {
      const at = new Date(r.appointmentAt)
      const slotId = `${String(at.getUTCHours()).padStart(2, '0')}:00`
      hourMap.set(slotId, (hourMap.get(slotId) ?? 0) + 1)
    }
    const peakHours = [...hourMap.entries()]
      .map(([slotId, count]) => ({ label: getSlotLabel(slotId), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

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
      } satisfies AnalyticsStats,
    }
  } catch (error) {
    console.error('[getAnalyticsStats | Prisma | Error]:', error)
    return { success: false, message: 'Failed to fetch analytics.' }
  }
}