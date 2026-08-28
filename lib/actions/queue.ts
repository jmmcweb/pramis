'use server'

import prisma from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { requireAdmin, requireStaff } from '@/lib/actions/guard'
import { nextReferenceId } from '@/lib/referenceId'
import { dayRange, todayISO } from '@/config/appointment'

export type QueueEntry = {
  id: string // APT-#### for scheduled visits, WIQ-#### for queued walk-ins
  kind: 'scheduled' | 'walkin' | 'priority'
  name: string
  time: string // display label
  service: string
  status: 'WAITING' | 'IN_CONSULTATION' | 'DONE'
  priority?: 'SENIOR' | 'PWD'
}

export type TodayQueues = {
  scheduled: QueueEntry[]
  walkins: QueueEntry[]
  priority: QueueEntry[]
}

function profileName(profile: any): string {
  if (!profile?.lastName && !profile?.firstName) return ''
  return `${(profile.lastName || '').toUpperCase()}, ${profile.firstName || ''}${
    profile.middleName ? ' ' + profile.middleName : ''
  }`.trim()
}

function clockLabel(at: Date): string {
  return at.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  })
}

export async function getTodayQueues(): Promise<{
  success: boolean
  message: string
  queues: TodayQueues
}> {
  const session = await requireAdmin()
  if (!session) {
    const staff = await requireStaff()
    if (!staff) {
      return {
        success: false,
        message: 'Unauthorized',
        queues: { scheduled: [], walkins: [], priority: [] },
      }
    }
  }

  try {
    const { start, end } = dayRange(todayISO())

    const [appointmentRows, queueRows] = await Promise.all([
      (prisma as any).appointment.findMany({
        where: {
          appointmentAt: { gte: start, lt: end },
          status: { in: ['APPROVED', 'COMPLETED'] },
          source: 'BOOKING',
        },
        orderBy: { appointmentAt: 'asc' },
        include: {
          service: true,
          familyMember: true,
          user: { include: { profile: true } },
        },
      }),
      (prisma as any).walkInQueue.findMany({
        where: { createdAt: { gte: start, lt: end } },
        orderBy: { createdAt: 'asc' },
        include: {
          patient: {
            include: {
              familyMember: true,
              user: { include: { profile: true } },
            },
          },
          service: true,
        },
      }),
    ])

    const scheduled: QueueEntry[] = appointmentRows.map((row: any) => ({
      id: row.appointmentid,
      kind: 'scheduled' as const,
      name: row.familyMember
        ? row.familyMember.name
        : profileName(row.user?.profile) || row.user?.email || 'Unknown',
      time: clockLabel(new Date(row.appointmentAt)),
      service: row.service?.name ?? 'Consultation',
      status: row.status === 'COMPLETED' ? 'DONE' : 'WAITING',
    }))

    const walkins: QueueEntry[] = []
    const priority: QueueEntry[] = []
    for (const row of queueRows) {
      const entry: QueueEntry = {
        id: row.qid,
        kind: row.queueType === 'PRIORITY' ? 'priority' : 'walkin',
        name:
          row.patient?.familyMember?.name ||
          profileName(row.patient?.user?.profile) ||
          row.patient?.name ||
          row.patient?.user?.email ||
          'Unknown',
        time: clockLabel(new Date(row.createdAt)),
        service: row.service?.name ?? 'Consultation',
        status: (row.status as QueueEntry['status']) ?? 'WAITING',
        priority:
          row.priority === 'SENIOR'
            ? 'SENIOR'
            : row.priority === 'PWD'
              ? 'PWD'
              : undefined,
      }
      if (entry.kind === 'priority') priority.push(entry)
      else walkins.push(entry)
    }

    return {
      success: true,
      message: 'Queues fetched.',
      queues: { scheduled, walkins, priority },
    }
  } catch (error) {
    console.error('[getTodayQueues | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch the queues.',
      queues: { scheduled: [], walkins: [], priority: [] },
    }
  }
}

/**
 * Adds an existing patient (verified PTN-####) to the walk-in or priority
 * lane.
 *
 * Form fields: patientId, lane ('WALKIN'|'PRIORITY'), priority
 * ('SENIOR'|'PWD', priority lane only), serviceId (optional).
 */
export async function addToQueue(_prevState: any, formData: FormData) {
  const session = await requireAdmin()
  if (!session) {
    const staff = await requireStaff()
    if (!staff) return { success: false, message: 'Unauthorized' }
  }

  const patientIdInput = formData.get('patientId')?.toString().trim() || ''
  const lane = formData.get('lane')?.toString().trim() || ''
  const priority = formData.get('priority')?.toString().trim() || ''
  const serviceId = formData.get('serviceId')?.toString().trim() || ''

  if (!patientIdInput) {
    return { success: false, message: 'Verify a patient ID first.' }
  }
  if (!['WALKIN', 'PRIORITY'].includes(lane)) {
    return { success: false, message: 'Choose a queue lane.' }
  }
  if (lane === 'PRIORITY' && !['SENIOR', 'PWD'].includes(priority)) {
    return { success: false, message: 'Choose a priority reason.' }
  }

  try {
    const digits = patientIdInput.replace(/^PTN-/i, '').trim()
    if (!/^\d+$/.test(digits)) {
      return { success: false, message: 'Invalid patient ID format.' }
    }
    const patient = await (prisma as any).patient.findFirst({
      where: { patientid: `PTN-${digits}` },
      select: { patientid: true },
    })
    if (!patient) {
      return { success: false, message: 'Verified patient no longer exists.' }
    }

    if (serviceId) {
      const service = await (prisma as any).service.findUnique({
        where: { serviceid: serviceId },
        select: { availability: true },
      })
      if (!service) {
        return {
          success: false,
          message: 'The selected service no longer exists.',
        }
      }
    }

    const { start, end } = dayRange(todayISO())
    const duplicate = await (prisma as any).walkInQueue.findFirst({
      where: {
        patientId: patient.patientid,
        status: { not: 'DONE' },
        createdAt: { gte: start, lt: end },
      },
      select: { qid: true },
    })
    if (duplicate) {
      return {
        success: false,
        message: 'This patient is already in the queue.',
      }
    }

    await (prisma as any).walkInQueue.create({
      data: {
        qid: await nextReferenceId('WIQ'),
        patientId: patient.patientid,
        queueType: lane,
        priority: lane === 'PRIORITY' ? priority : null,
        serviceId: serviceId || null,
        status: 'WAITING',
      },
    })

    revalidateTag('queues', 'max')

    return { success: true, message: 'Patient added to the queue.' }
  } catch (error) {
    console.error('[addToQueue | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to add the patient to the queue.',
    }
  }
}

export async function advanceQueueEntry(
  qid: string,
): Promise<{ success: boolean; message: string }> {
  const session = await requireAdmin()
  if (!session) {
    const staff = await requireStaff()
    if (!staff) return { success: false, message: 'Unauthorized' }
  }
  if (!qid) return { success: false, message: 'Queue entry ID is required.' }

  try {
    const row = await (prisma as any).walkInQueue.findUnique({
      where: { qid },
      select: { status: true },
    })
    if (!row) return { success: false, message: 'Queue entry not found.' }

    const next =
      row.status === 'WAITING'
        ? 'IN_CONSULTATION'
        : row.status === 'IN_CONSULTATION'
          ? 'DONE'
          : null
    if (!next) {
      return { success: false, message: 'This entry is already done.' }
    }

    await (prisma as any).walkInQueue.update({
      where: { qid },
      data: { status: next },
    })

    if (next === 'DONE') {
      const entry = await (prisma as any).walkInQueue.findUnique({
        where: { qid },
        select: { patientId: true },
      })
      if (entry?.patientId) {
        const { start, end } = dayRange(todayISO())
        await (prisma as any).appointment.updateMany({
          where: {
            patientId: entry.patientId,
            source: 'WALKIN',
            status: 'APPROVED',
            appointmentAt: { gte: start, lt: end },
          },
          data: { status: 'COMPLETED' },
        })
      }
    }

    revalidateTag('queues', 'max')
    revalidateTag('appointments', 'max')

    return {
      success: true,
      message:
        next === 'DONE' ? 'Visit marked as done.' : 'Consultation started.',
    }
  } catch (error) {
    console.error('[advanceQueueEntry | Prisma | Error]:', error)
    return { success: false, message: 'Failed to update the queue entry.' }
  }
}

export async function markQueueDone(
  qid: string,
): Promise<{ success: boolean; message: string }> {
  const session = await requireAdmin()
  if (!session) {
    const staff = await requireStaff()
    if (!staff) return { success: false, message: 'Unauthorized' }
  }
  if (!qid) return { success: false, message: 'Queue entry ID is required.' }

  try {
    await (prisma as any).walkInQueue.update({
      where: { qid },
      data: { status: 'DONE' },
    })
    revalidateTag('queues', 'max')
    return { success: true, message: 'Visit marked as done.' }
  } catch (error) {
    console.error('[markQueueDone | Prisma | Error]:', error)
    return { success: false, message: 'Failed to update the queue entry.' }
  }
}

export async function removeQueueEntry(
  qid: string,
): Promise<{ success: boolean; message: string }> {
  const session = await requireAdmin()
  if (!session) {
    const staff = await requireStaff()
    if (!staff) return { success: false, message: 'Unauthorized' }
  }
  if (!qid) return { success: false, message: 'Queue entry ID is required.' }

  try {
    await (prisma as any).walkInQueue.delete({ where: { qid } })
    revalidateTag('queues', 'max')
    return { success: true, message: 'Removed from queue.' }
  } catch (error) {
    console.error('[removeQueueEntry | Prisma | Error]:', error)
    return { success: false, message: 'Failed to remove the queue entry.' }
  }
}
