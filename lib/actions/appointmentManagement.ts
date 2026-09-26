// Appointment management functions for handling various appointment-related operations.
'use server'

import { randomInt } from 'crypto'
import { hash } from 'bcrypt'
import prisma from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { requireAdmin, requireStaff } from '@/lib/actions/guard'
import { nextReferenceId } from '@/lib/referenceId'
import { createNotification } from '@/lib/actions/notifications'
import { recordAudit } from '@/lib/actions/audit'
import { isValidEmail } from '@/lib/helper'
import { FIXED_ADDRESS, PUROKS } from '@/src/data/patientInfo'
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

// Walk-in addresses are captured as street + purok only. Storing them the same
// way the signup flow does ("<street>, <purok>") keeps the purok derivable from
// the address, which is what the population-per-purok aggregation relies on.
function formatHouseAndPurok(houseNumber: string, purok: string): string {
  return houseNumber ? `${houseNumber}, ${purok}` : purok
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

    await recordAudit({
      action: 'NOTIFY',
      entity: 'APPOINTMENT',
      entityId: appointmentId,
      description: `Sent an appointment reminder for the ${serviceName} appointment on ${whenLabel}.`,
      metadata: {
        appointmentId,
        serviceName,
        when: whenLabel,
        channel: 'IN_APP',
      },
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
  isPwd: boolean
  age: number
}

// Maps a Patient row (queried with `familyMember` and `user.profile` included)
// to the lightweight shape the walk-in pickers render. Walk-in patients may not
// have an account, so the Patient row itself is used as a name/barangay
// fallback when no profile exists.
function toPatientLookup(row: any): PatientLookup {
  const profile = row?.user?.profile
  const name =
    row?.familyMember?.name ||
    (profile
      ? `${(profile.lastName || '').toUpperCase()}, ${profile.firstName || ''}${profile.middleName ? ' ' + profile.middleName : ''}`.trim()
      : '') ||
    row?.name ||
    ''
  const birthdate =
    row?.familyMember?.birthdate || row?.birthdate || profile?.birthdate || null
  const age = calculateAge(birthdate)
  return {
    patientId: row.patientid,
    name,
    barangay: profile?.barangay ?? row?.barangay ?? '',
    hasAccount: Boolean(row.userId),
    birthdate: birthdate ? new Date(birthdate).toISOString().split('T')[0] : null,
    isSenior: age >= 60,
    isPwd: profile?.isPwd === true || row?.familyMember?.isPwd === true,
    age,
  }
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
    return {
      success: true,
      message: 'Patient verified.',
      patient: toPatientLookup(row),
    }
  } catch (error) {
    console.error('[searchPatientById | Prisma | Error]:', error)
    return { success: false, message: 'Search failed.', patient: null }
  }
}

// Searches patients by name so staff can find a walk-in without asking for the
// PTN-####. Matching is case-insensitive and partial: every word typed must
// appear in the stored patient name, the linked account profile, or a linked
// family member record, so "juan cruz" still finds "DELA CRUZ, JUAN". A numeric
// or PTN-#### entry matches on the patient ID instead, letting one input serve
// both lookup styles. Returns at most 10 candidates ordered by patient ID.
export async function searchPatientsByName(query: string): Promise<{
  success: boolean
  message: string
  patients: PatientLookup[]
}> {
  const session = await requireAdmin()
  if (!session) {
    const staff = await requireStaff()
    if (!staff)
      return { success: false, message: 'Unauthorized', patients: [] }
  }

  const q = query.trim()
  if (q.length < 2) {
    return {
      success: false,
      message: 'Type at least 2 characters of the name or ID.',
      patients: [],
    }
  }

  const digits = q.replace(/^PTN-/i, '').trim()
  const looksLikeId = /^\d+$/.test(digits)

  // Each typed word must match somewhere in the patient's name so multi-word
  // entries work regardless of the stored "LASTNAME, FIRSTNAME" order.
  const nameFilters = q
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((term) => ({
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        {
          familyMember: {
            is: { name: { contains: term, mode: 'insensitive' } },
          },
        },
        {
          user: {
            is: {
              profile: {
                is: {
                  OR: [
                    { firstName: { contains: term, mode: 'insensitive' } },
                    { middleName: { contains: term, mode: 'insensitive' } },
                    { lastName: { contains: term, mode: 'insensitive' } },
                  ],
                },
              },
            },
          },
        },
      ],
    }))

  try {
    const rows = await (prisma as any).patient.findMany({
      where: looksLikeId
        ? { patientid: { contains: digits, mode: 'insensitive' } }
        : { AND: nameFilters },
      include: {
        familyMember: true,
        user: { include: { profile: true } },
      },
      orderBy: { patientid: 'asc' },
      take: 10,
    })

    const patients: PatientLookup[] = (rows ?? []).map(toPatientLookup)
    if (patients.length === 0) {
      return {
        success: false,
        message: 'No patient matched that name.',
        patients: [],
      }
    }
    return {
      success: true,
      message: `${patients.length} patient${patients.length > 1 ? 's' : ''} found.`,
      patients,
    }
  } catch (error) {
    console.error('[searchPatientsByName | Prisma | Error]:', error)
    return { success: false, message: 'Search failed.', patients: [] }
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
    let newPatientBirthdate: Date | null = null
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
      const purok = formData.get('purok')?.toString().trim() || ''
      // Walk-ins are residents of this health center's catchment: only the
      // street + purok are entered. Barangay / city / province / ZIP are always
      // fixed to Sumapang Matanda, Malolos, Bulacan 3000.
      const barangay = FIXED_ADDRESS.barangay
      const city = FIXED_ADDRESS.municipality
      const province = FIXED_ADDRESS.province
      const zipCode = FIXED_ADDRESS.zipCode
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
      if (!purok || !PUROKS.includes(purok)) {
        return {
          success: false,
          message: 'Please select a valid purok in Barangay Sumapang Matanda.',
        }
      }
      if (email && !isValidEmail(email)) {
        return {
          success: false,
          message: 'Enter a valid email address, or leave it blank.',
        }
      }

      displayName = `${lastName.toUpperCase()}, ${firstName}`
      newPatientBirthdate = parsedBirthdate

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
            // "<street>, <purok>" — the same shape the signup flow stores.
            houseNumber: formatHouseAndPurok(houseNumber, purok),
            purok,
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
          // Same "<street>, <purok>" shape as the profile so the purok also
          // counts towards the population-per-purok totals.
          houseNumber: formatHouseAndPurok(houseNumber, purok),
          purok,
          barangay,
          city,
          province,
          zipCode,
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

    // Same rule as the queue page: DB-verified senior/PWD => PRIORITY.
    const walkinBirthdate =
      (patient as any)?.familyMember?.birthdate ||
      (patient as any)?.birthdate ||
      (patient as any)?.user?.profile?.birthdate ||
      newPatientBirthdate ||
      null
    let walkinAge = 0
    if (walkinBirthdate) {
      const b = new Date(walkinBirthdate)
      const t = new Date()
      if (!Number.isNaN(b.getTime())) {
        walkinAge = t.getFullYear() - b.getFullYear()
        const m = t.getMonth() - b.getMonth()
        if (m < 0 || (m === 0 && t.getDate() < b.getDate())) walkinAge--
      }
    }
    const walkinPriority =
      walkinAge >= 60
        ? 'SENIOR'
        : (patient as any)?.user?.profile?.isPwd === true
          ? 'PWD'
          : null
    const walkinLane = walkinPriority ? 'PRIORITY' : 'WALKIN'

    await (prisma as any).walkInQueue.create({
      data: {
        qid: await nextReferenceId('WIQ'),
        patientId: patient.patientid,
        queueType: walkinLane,
        priority: walkinPriority,
        serviceId,
        status: 'WAITING',
      },
    })

    revalidateTag('appointments', 'max')
    revalidateTag('queues', 'max')
    revalidateTag('patients', 'max')

    await recordAudit({
      action: 'CREATE',
      entity: 'APPOINTMENT',
      entityId: created.appointmentid,
      description: `Registered walk-in patient ${displayName} (${patient.patientid}) for ${service.name} and added them to the queue.`,
      metadata: {
        appointmentId: created.appointmentid,
        patientId: patient.patientid,
        serviceId,
        source: 'WALKIN',
        accountCreated: Boolean(accountEmail),
      },
    })

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

      await recordAudit({
        action: 'CREATE',
        entity: 'APPOINTMENT',
        entityId: appt.appointmentid,
        description: `Opened a walk-in visit (${appt.appointmentid}) for patient ${entry.patientId} from queue entry ${qid}.`,
        metadata: {
          appointmentId: appt.appointmentid,
          patientId: entry.patientId,
          qid,
          source: 'WALKIN',
        },
      })
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
