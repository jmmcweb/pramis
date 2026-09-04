// Appointment management functions for handling various appointment-related operations.
'use server'

import { randomInt } from 'crypto'
import { hash } from 'bcrypt'
import prisma from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { requireAdmin, requireStaff } from '@/lib/actions/guard'
import { nextReferenceId } from '@/lib/referenceId'
import { createNotification } from '@/lib/actions/notifications'
import { isValidEmail } from '@/lib/helper'
import {
  dayRange,
  todayISO,
  getSlotLabel,
  extractPatientItrInfo,
  toMedicalRecordSummary,
} from '@/config/appointment'
import type { ScheduleAppointmentView } from '@/config/appointment'

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 10; i++) out += chars[randomInt(chars.length)]
  return out
}

// Calculate age from birthdate
function calculateAge(birthdate: Date | string | null): number {
  if (!birthdate) return 0
  const birth = new Date(birthdate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED', 'NO_SHOW']

// Converts a database row to a ScheduleAppointmentView object
function toScheduleView(row: any): ScheduleAppointmentView {
  const at = new Date(row.appointmentAt)
  const profile = row.user?.profile
  const name = row.familyMember
    ? row.familyMember.name
    : profile
      ? `${(profile.lastName || '').toUpperCase()}, ${profile.firstName || ''}${
          profile.middleName ? ' ' + profile.middleName : ''
        }`.trim()
      : row.patient?.name || row.user?.email || 'Unknown patient'
  return {
    id: row.appointmentid,
    patientName: name,
    patientReference: row.patient?.patientid || row.user?.id || '',
    email: row.user?.email || '',
    serviceName: row.service?.name ?? 'Service',
    dateISO: `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, '0')}-${String(at.getUTCDate()).padStart(2, '0')}`,
    dateLabel: at.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }),
    timeLabel: getSlotLabel(`${String(at.getUTCHours()).padStart(2, '0')}:00`),
    status: row.status,
    patientInfo: extractPatientItrInfo(row),
    hasMedicalRecord: Boolean(row.medicalHistory),
    medicalRecord: row.medicalHistory
      ? toMedicalRecordSummary(row.medicalHistory)
      : null,
  }
}

const BOARD_INCLUDE = {
  service: true,
  familyMember: true,
  user: { include: { profile: true } },
  patient: true,
  medicalHistory: true,
} as const

// Fetches the list of scheduled appointments for the staff dashboard. It retrieves appointments from the database that are scheduled for today and have not yet reached a terminal status (COMPLETED, CANCELLED, NO_SHOW). The function returns a structured response containing the success status, message, and an array of ScheduleAppointmentView objects representing the scheduled appointments.
export async function getArchiveAppointments(): Promise<{
  success: boolean
  message: string
  appointments: ScheduleAppointmentView[]
}> {
  const session = await requireAdmin()
  if (!session) {
    const staff = await requireStaff()
    if (!staff) {
      return { success: false, message: 'Unauthorized', appointments: [] }
    }
  }

  try {
    const { end } = dayRange(todayISO())
    const rows = await (prisma as any).appointment.findMany({
      where: {
        appointmentAt: { lt: end },
        status: { in: TERMINAL_STATUSES },
        source: 'BOOKING',
      },
      orderBy: { appointmentAt: 'desc' },
      include: BOARD_INCLUDE,
    })
    return {
      success: true,
      message: 'Archive fetched.',
      appointments: rows.map(toScheduleView),
    }
  } catch (error) {
    console.error('[getArchiveAppointments | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch the archive.',
      appointments: [],
    }
  }
}

// Fetches the list of scheduled appointments for the staff dashboard. It retrieves appointments from the database that are scheduled for today and have not yet reached a terminal status (COMPLETED, CANCELLED, NO_SHOW). The function returns a structured response containing the success status, message, and an array of ScheduleAppointmentView objects representing the scheduled appointments.
export async function notifyAppointment(
  appointmentId: string,
): Promise<{ success: boolean; message: string }> {
  const session = await requireAdmin()
  if (!session) {
    const staff = await requireStaff()
    if (!staff) return { success: false, message: 'Unauthorized' }
  }
  if (!appointmentId) {
    return { success: false, message: 'Appointment ID is required.' }
  }

  try {
    const appointment = await (prisma as any).appointment.findUnique({
      where: { appointmentid: appointmentId },
      include: { service: true, familyMember: true },
    })
    if (!appointment) {
      return { success: false, message: 'Appointment not found.' }
    }

    const serviceName = appointment.service?.name ?? 'your appointment'
    const forName = appointment.familyMember?.name ?? 'you'
    const at = new Date(appointment.appointmentAt)
    const whenLabel = `${at.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })} at ${getSlotLabel(`${String(at.getUTCHours()).padStart(2, '0')}:00`)}`

    await createNotification({
      userId: appointment.userId,
      category: 'Appointment',
      title: 'Appointment Reminder',
      description: `Reminder: the ${serviceName} appointment for ${forName} is scheduled on ${whenLabel}. Please arrive on time.`,
    })

    return { success: true, message: 'Patient notified.' }
  } catch (error) {
    console.error('[notifyAppointment | Prisma | Error]:', error)
    return { success: false, message: 'Failed to notify the patient.' }
  }
}

//
export type PatientLookup = {
  patientId: string
  name: string
  barangay: string
  hasAccount: boolean
  birthdate: string | null
  isSenior: boolean
}

// Searches for a patient by their ID (PTN-####). It verifies the format of the patient ID, retrieves the patient's record from the database, and returns relevant information such as name, barangay, account status, birthdate, and senior citizen status. The function returns a structured response containing the success status, message, and a PatientLookup object if the patient is found.
export async function searchPatientById(query: string): Promise<{
  success: boolean
  message: string
  patient: PatientLookup | null
}> {
  const session = await requireAdmin()
  if (!session) {
    const staff = await requireStaff()
    if (!staff)
      return { success: false, message: 'Unauthorized', patient: null }
  }

  const digits = query.trim().replace(/^PTN-/i, '').trim()
  if (!/^\d+$/.test(digits)) {
    return {
      success: false,
      message: 'Enter a valid patient ID (e.g., PTN-1002).',
      patient: null,
    }
  }

  try {
    const row = await (prisma as any).patient.findFirst({
      where: { patientid: `PTN-${digits}` },
      include: {
        familyMember: true,
        user: { include: { profile: true } },
      },
    })
    if (!row) {
      return { success: false, message: 'No patient found.', patient: null }
    }
    const profile = row.user?.profile
    const name =
      row.familyMember?.name ||
      (profile
        ? `${(profile.lastName || '').toUpperCase()}, ${profile.firstName || ''}${profile.middleName ? ' ' + profile.middleName : ''}`.trim()
        : '') ||
      row.name ||
      ''
    const birthdate = row.birthdate || profile?.birthdate || null
    const age = calculateAge(birthdate)
    const isSenior = age >= 60
    return {
      success: true,
      message: 'Patient verified.',
      patient: {
        patientId: row.patientid,
        name,
        barangay: profile?.barangay ?? '',
        hasAccount: Boolean(row.userId),
        birthdate: birthdate ? new Date(birthdate).toISOString().split('T')[0] : null,
        isSenior,
      },
    }
  } catch (error) {
    console.error('[searchPatientById | Prisma | Error]:', error)
    return { success: false, message: 'Search failed.', patient: null }
  }
}

// Registers a walk-in visit for a patient. It can handle both existing patients (identified by their patient ID) and new walk-in patients (who do not have an account). The function verifies the provided information, checks for service availability, creates a new patient record if necessary, and adds the patient to the walk-in queue. It returns a structured response indicating the success status and message of the operation.
export async function registerWalkIn(_prevState: any, formData: FormData) {
  const session = await requireAdmin()
  if (!session) {
    const staff = await requireStaff()
    if (!staff) return { success: false, message: 'Unauthorized' }
  }

  const patientIdInput = formData.get('patientId')?.toString().trim() || ''
  const serviceId = formData.get('serviceId')?.toString().trim() || ''

  if (!serviceId) return { success: false, message: 'Select a service.' }

  try {
    const service = await (prisma as any).service.findUnique({
      where: { serviceid: serviceId },
    })
    if (!service) {
      return {
        success: false,
        message: 'The selected service no longer exists.',
      }
    }
    if (service.availability === false) {
      return {
        success: false,
        message: 'This service is currently unavailable.',
      }
    }

    let patient: any = null
    let displayName = ''
    let accountEmail = ''
    let tempPassword: string | null = null
    if (patientIdInput) {
      const digits = patientIdInput.replace(/^PTN-/i, '').trim()
      if (!/^\d+$/.test(digits)) {
        return { success: false, message: 'Invalid patient ID format.' }
      }
      patient = await (prisma as any).patient.findFirst({
        where: { patientid: `PTN-${digits}` },
        include: {
          familyMember: true,
          user: { include: { profile: true } },
        },
      })
      if (!patient) {
        return { success: false, message: 'Verified patient no longer exists.' }
      }
      displayName =
        patient.familyMember?.name ||
        (patient.user?.profile
          ? `${(patient.user.profile.lastName || '').toUpperCase()}, ${patient.user.profile.firstName || ''}`.trim()
          : '') ||
        patient.name ||
        ''
    } else {
      const firstName = formData.get('firstName')?.toString().trim() || ''
      const lastName = formData.get('lastName')?.toString().trim() || ''
      const birthdate = formData.get('birthdate')?.toString().trim() || ''
      const sex = formData.get('sex')?.toString().trim() || ''
      const phoneNumber = formData.get('phoneNumber')?.toString().trim() || ''
      const houseNumber = formData.get('houseNumber')?.toString().trim() || ''
      const barangay = formData.get('barangay')?.toString().trim() || ''
      const city = formData.get('city')?.toString().trim() || ''
      const province = formData.get('province')?.toString().trim() || ''
      const zipCode = formData.get('zipCode')?.toString().trim() || ''
      const email = formData.get('email')?.toString().trim().toLowerCase() || ''

      if (firstName.length < 2 || lastName.length < 2) {
        return {
          success: false,
          message: "Enter the walk-in patient's first and last name.",
        }
      }
      const parsedBirthdate = birthdate
        ? new Date(`${birthdate}T00:00:00.000Z`)
        : null
      if (
        !parsedBirthdate ||
        Number.isNaN(parsedBirthdate.getTime()) ||
        parsedBirthdate.getTime() > Date.now()
      ) {
        return {
          success: false,
          message: 'Enter a valid birthday (not in the future).',
        }
      }
      if (!sex) {
        return { success: false, message: "Select the patient's sex." }
      }
      if (email && !isValidEmail(email)) {
        return {
          success: false,
          message: 'Enter a valid email address, or leave it blank.',
        }
      }

      displayName = `${lastName.toUpperCase()}, ${firstName}`

      let userId: string | null = null
      if (email) {
        const existing = await (prisma as any).user.findUnique({
          where: { email },
          select: { id: true },
        })
        if (existing) {
          return {
            success: false,
            message: 'An account with this email already exists.',
          }
        }
        userId = await nextReferenceId('USR')
        accountEmail = email
        tempPassword = generateTempPassword()
        await (prisma as any).user.create({
          data: {
            id: userId,
            email,
            status: 'ACTIVE',
            password: await hash(tempPassword, 12),
          } as any,
        })
        await (prisma as any).userProfile.create({
          data: {
            userprofileid: await nextReferenceId('PRF'),
            userId,
            firstName,
            lastName,
            birthdate: parsedBirthdate,
            phoneNumber,
            houseNumber,
            barangay,
            city,
            province,
            zipCode,
          },
        })
      }

      patient = await (prisma as any).patient.create({
        data: {
          patientid: await nextReferenceId('PTN'),
          userId,
          name: displayName,
          birthdate: parsedBirthdate,
          sex,
          phoneNumber: phoneNumber || null,
          houseNumber: houseNumber || null,
          barangay: barangay || null,
          city: city || null,
          province: province || null,
          zipCode: zipCode || null,
        },
      })
    }

    const { start, end } = dayRange(todayISO())
    const queued = await (prisma as any).walkInQueue.findFirst({
      where: {
        patientId: patient.patientid,
        status: { not: 'DONE' },
        createdAt: { gte: start, lt: end },
      },
      select: { qid: true },
    })
    if (queued) {
      return {
        success: false,
        message: 'This patient is already in the walk-in queue today.',
      }
    }

    const created = await (prisma as any).appointment.create({
      data: {
        appointmentid: await nextReferenceId('APT'),
        patientId: patient.patientid,
        userId: patient.userId ?? null,
        serviceId,
        source: 'WALKIN',
        appointmentAt: new Date(),
        status: 'APPROVED',
      },
    })

    await (prisma as any).walkInQueue.create({
      data: {
        qid: await nextReferenceId('WIQ'),
        patientId: patient.patientid,
        queueType: 'WALKIN',
        serviceId,
        status: 'WAITING',
      },
    })

    revalidateTag('appointments', 'max')
    revalidateTag('queues', 'max')
    revalidateTag('patients', 'max')

    if (patient.userId) {
      await createNotification({
        userId: patient.userId,
        category: 'Appointment',
        title: 'Walk-in Visit Registered',
        description: `Your walk-in ${service.name} visit has been registered. Please proceed to the health center.`,
      })
    }

    return {
      success: true,
      message: `${displayName} (${patient.patientid}) registered as a walk-in and added to the queue.`,
      payload: {
        appointmentId: created.appointmentid,
        patientId: patient.patientid,
        ...(accountEmail && tempPassword
          ? { email: accountEmail, tempPassword }
          : {}),
      },
    }
  } catch (error) {
    console.error('[registerWalkIn | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to register the walk-in patient. Please try again.',
    }
  }
}

// Retrieves the display name of the signed-in user. If the user has a profile with a first and/or last name, it returns the full name; otherwise, it returns the user's email or a default label "Patient" if no information is available.
export async function getWalkInAppointmentView(qid: string): Promise<{
  success: boolean
  message: string
  appointment: ScheduleAppointmentView | null
}> {
  const session = await requireAdmin()
  if (!session) {
    const staff = await requireStaff()
    if (!staff) {
      return { success: false, message: 'Unauthorized', appointment: null }
    }
  }
  if (!qid) {
    return {
      success: false,
      message: 'Queue entry ID is required.',
      appointment: null,
    }
  }

  try {
    const entry = await (prisma as any).walkInQueue.findUnique({
      where: { qid },
      include: { patient: true },
    })
    if (!entry) {
      return {
        success: false,
        message: 'Queue entry not found.',
        appointment: null,
      }
    }

    const { start, end } = dayRange(todayISO())
    let appt = await (prisma as any).appointment.findFirst({
      where: {
        patientId: entry.patientId,
        source: 'WALKIN',
        status: { in: ['APPROVED', 'COMPLETED'] },
        appointmentAt: { gte: start, lt: end },
      },
      orderBy: { appointmentAt: 'desc' },
      include: BOARD_INCLUDE,
    })

    if (!appt) {
      let serviceId = entry.serviceId as string | null
      if (!serviceId) {
        const fallback = await (prisma as any).service.findFirst({
          where: { availability: true },
          orderBy: { serviceid: 'asc' },
          select: { serviceid: true },
        })
        if (!fallback) {
          return {
            success: false,
            message: 'No available service to attach the visit to.',
            appointment: null,
          }
        }
        serviceId = fallback.serviceid
      }
      appt = await (prisma as any).appointment.create({
        data: {
          appointmentid: await nextReferenceId('APT'),
          patientId: entry.patientId,
          userId: entry.patient?.userId ?? null,
          serviceId,
          source: 'WALKIN',
          appointmentAt: new Date(),
          status: 'APPROVED',
        },
        include: BOARD_INCLUDE,
      })
      revalidateTag('appointments', 'max')
    }

    return {
      success: true,
      message: 'Visit loaded.',
      appointment: toScheduleView(appt),
    }
  } catch (error) {
    console.error('[getWalkInAppointmentView | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to load the visit.',
      appointment: null,
    }
  }
}
