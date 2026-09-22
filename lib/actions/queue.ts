// Guarded, exported entry point: verifies the caller is an admin or staff
'use server'

import prisma from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { requireAdmin, requireStaff } from '@/lib/actions/guard'
import { recordAudit } from '@/lib/actions/audit'
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
  uploadedId?: string | null // URL or path to uploaded ID image
}

export type TodayQueues = {
  scheduled: QueueEntry[]
  walkins: QueueEntry[]
  priority: QueueEntry[]
}

// Extracts the full name from a user profile object.
function profileName(profile: any): string {
  if (!profile?.lastName && !profile?.firstName) return ''
  return `${(profile.lastName || '').toUpperCase()}, ${profile.firstName || ''}${
    profile.middleName ? ' ' + profile.middleName : ''
  }`.trim()
}

function calcAge(birthdate: Date | string | null | undefined): number {
  if (!birthdate) return 0
  const birth = new Date(birthdate)
  if (Number.isNaN(birth.getTime())) return 0
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function resolveDbPriority(patient: any): 'SENIOR' | 'PWD' | null {
  if (!patient) return null
  const birthdate =
    patient?.familyMember?.birthdate ||
    patient?.birthdate ||
    patient?.user?.profile?.birthdate ||
    null
  if (calcAge(birthdate) >= 60) return 'SENIOR'
  if (
    patient?.user?.profile?.isPwd === true ||
    (patient?.familyMember as any)?.isPwd === true
  )
    return 'PWD'
  return null
}

// Formats a Date object into a clock label string (e.g., "3:45 PM") in the UTC timezone.
function clockLabel(at: Date): string {
  return at.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  })
}

// Guarded, exported entry point: verifies the caller is an admin or staff member before returning the today's queues.
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

  // Fetches today's scheduled appointments and walk-in queues from the database. It processes the data to create a list of queue entries for scheduled visits, walk-ins, and priority patients. The function returns a success status, message, and the queues for today. If an error occurs during the database query, it logs the error and returns a failure status with empty queues.
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

    const scheduled: QueueEntry[] = []
    const priority: QueueEntry[] = []
    for (const row of appointmentRows as any[]) {
      const dbPriority = resolveDbPriority(row)
      const entry: QueueEntry = {
        id: row.appointmentid,
        kind: 'scheduled' as const,
        name: row.familyMember
          ? row.familyMember.name
          : profileName(row.user?.profile) || row.user?.email || 'Unknown',
        time: clockLabel(new Date(row.appointmentAt)),
        service: row.service?.name ?? 'Consultation',
        status: row.status === 'COMPLETED' ? 'DONE' : 'WAITING',
        priority: dbPriority ?? undefined,
        uploadedId: row.user?.profile?.validId || null,
      }
      if (dbPriority) {
        priority.push({ ...entry, kind: 'priority' as const })
      } else {
        scheduled.push(entry)
      }
    }

    const walkins: QueueEntry[] = []
    for (const row of queueRows) {
      const dbPriority = resolveDbPriority(row.patient)
      const kind: QueueEntry['kind'] =
        row.queueType === 'PRIORITY' || dbPriority ? 'priority' : 'walkin'
      const entry: QueueEntry = {
        id: row.qid,
        kind,
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
          dbPriority ??
          (row.priority === 'SENIOR'
            ? 'SENIOR'
            : row.priority === 'PWD'
              ? 'PWD'
              : undefined),
        uploadedId: row.patient?.user?.profile?.validId || null,
      }
      // Priority queue: Senior Citizens & PWD patients, even for legacy rows
      // stored as WALKIN before auto-priority existed.
      if (kind === 'priority' && (entry.priority === 'SENIOR' || entry.priority === 'PWD')) {
        priority.push(entry)
      } else if (kind === 'walkin') {
        walkins.push(entry)
      }
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

// Adds a patient to the walk-in queue based on the provided form data. It checks for user authorization (admin or staff), validates the input fields, and creates a new queue entry in the database. The function returns a success status and message indicating the result of the operation. If the patient is already in the queue or if an error occurs during the database operation, it logs the error and returns a failure status with an appropriate message.
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
      include: {
        familyMember: true,
        user: { include: { profile: true } },
      },
    })
    if (!patient) {
      return { success: false, message: 'Verified patient no longer exists.' }
    }

    const dbPriority = resolveDbPriority(patient)
    let finalLane = lane
    let finalPriority: string | null = lane === 'PRIORITY' ? priority : null
    if (dbPriority) {
      finalLane = 'PRIORITY'
      finalPriority = dbPriority
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
        queueType: finalLane,
        priority: finalLane === 'PRIORITY' ? finalPriority : null,
        serviceId: serviceId || null,
        status: 'WAITING',
      },
    })

    revalidateTag('queues', 'max')

    await recordAudit({
      action: 'CREATE',
      entity: 'QUEUE',
      entityId: patient.patientid,
      description: `Added patient ${patient.patientid} to the ${finalLane === 'PRIORITY' ? 'priority' : 'walk-in'} queue.`,
      metadata: {
        patientId: patient.patientid,
        lane: finalLane,
        priority: finalLane === 'PRIORITY' ? finalPriority : null,
        serviceId: serviceId || null,
      },
    })

    return {
      success: true,
      message:
        finalLane === 'PRIORITY'
          ? `Patient added to the priority queue (${finalPriority}).`
          : 'Patient added to the queue.',
    }
  } catch (error) {
    console.error('[addToQueue | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to add the patient to the queue.',
    }
  }
}

// Advances the status of a queue entry (scheduled or walk-in) based on its current status. It checks for user authorization (admin or staff), validates the input queue ID, and updates the status in the database. If the entry is marked as "DONE," it also updates any related scheduled appointments for the patient. The function returns a success status and message indicating the result of the operation. If an error occurs during the database update, it logs the error and returns a failure status with an appropriate message.
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

    await recordAudit({
      action: 'STATUS_CHANGE',
      entity: 'QUEUE',
      entityId: qid,
      description: `Moved queue entry ${qid} from ${row.status} to ${next}.`,
      metadata: { qid, previousStatus: row.status, status: next },
    })

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

// Marks a queue entry as "DONE" based on the provided queue ID. It checks for user authorization (admin or staff), validates the input queue ID, and updates the status in the database. The function returns a success status and message indicating the result of the operation. If an error occurs during the database update, it logs the error and returns a failure status with an appropriate message.
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
    const existing = await (prisma as any).walkInQueue.findUnique({
      where: { qid },
      select: { status: true, patientId: true },
    })
    await (prisma as any).walkInQueue.update({
      where: { qid },
      data: { status: 'DONE' },
    })
    revalidateTag('queues', 'max')

    await recordAudit({
      action: 'STATUS_CHANGE',
      entity: 'QUEUE',
      entityId: qid,
      description: `Marked queue entry ${qid} as DONE.`,
      metadata: {
        qid,
        previousStatus: existing?.status ?? null,
        status: 'DONE',
        patientId: existing?.patientId ?? null,
      },
    })

    return { success: true, message: 'Visit marked as done.' }
  } catch (error) {
    console.error('[markQueueDone | Prisma | Error]:', error)
    return { success: false, message: 'Failed to update the queue entry.' }
  }
}

// Removes a queue entry from the walk-in queue based on the provided queue ID. It checks for user authorization (admin or staff), validates the input queue ID, and deletes the entry from the database. The function returns a success status and message indicating the result of the operation. If an error occurs during the database deletion, it logs the error and returns a failure status with an appropriate message.
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
    const existing = await (prisma as any).walkInQueue.findUnique({
      where: { qid },
      select: { patientId: true, status: true, queueType: true },
    })
    await (prisma as any).walkInQueue.delete({ where: { qid } })
    revalidateTag('queues', 'max')

    await recordAudit({
      action: 'DELETE',
      entity: 'QUEUE',
      entityId: qid,
      description: `Removed queue entry ${qid} from the queue.`,
      metadata: {
        qid,
        patientId: existing?.patientId ?? null,
        queueType: existing?.queueType ?? null,
        status: existing?.status ?? null,
      },
    })

    return { success: true, message: 'Removed from queue.' }
  } catch (error) {
    console.error('[removeQueueEntry | Prisma | Error]:', error)
    return { success: false, message: 'Failed to remove the queue entry.' }
  }
}
