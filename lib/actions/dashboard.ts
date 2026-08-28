'use server'

import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/actions/guard'
import { computePopulationData } from '@/lib/population'
import type { PopulationData } from '@/src/data/population'

export type DashboardStats = {
  totalUsers: number
  totalStaff: number
  todaysSchedule: number
  pendingRequests: number
}

export async function getDashboardStats() {
  const session = await requireUser()
  if (!session) {
    return { success: false as const, message: 'Unauthorized' }
  }

  try {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(startOfToday)
    endOfToday.setDate(endOfToday.getDate() + 1)

    const [totalUsers, totalStaff, todaysSchedule, pendingRequests] =
      await Promise.all([
        (prisma as any).user.count(),
        (prisma as any).staff.count(),
        (prisma as any).appointment.count({
          where: { appointmentAt: { gte: startOfToday, lt: endOfToday } },
        }),
        (prisma as any).user.count({ where: { status: 'PENDING' } }),
      ])

    return {
      success: true as const,
      message: 'Dashboard statistics fetched successfully.',
      stats: {
        totalUsers,
        totalStaff,
        todaysSchedule,
        pendingRequests,
      } satisfies DashboardStats,
    }
  } catch (error) {
    console.error('[getDashboardStats | Prisma | Error]:', error)
    return {
      success: false as const,
      message: 'Failed to fetch dashboard statistics.',
    }
  }
}

export type PopulationResult = {
  success: boolean
  message: string | null
  population?: PopulationData
}

export async function getPopulationStats(): Promise<PopulationResult> {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Unauthorized' }
  }

  try {
    const population = await computePopulationData()
    return {
      success: true,
      message: 'Population statistics fetched successfully.',
      population,
    }
  } catch (error) {
    console.error('[getPopulationStats | Prisma | Error]:', error)
    return { success: false, message: 'Failed to fetch population statistics.' }
  }
}