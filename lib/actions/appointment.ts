// This file contains server-side actions related to appointments in the Meditrack application. It includes functions for fetching available services, checking slot availability, managing family members, booking and cancelling appointments, retrieving user appointments, and updating appointment statuses. The actions interact with the database using Prisma and handle user authorization to ensure that only authorized users can perform certain actions. Additionally, it includes logic for sending notifications to users and staff regarding appointment bookings and status changes.

'use server'

import prisma from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { requireUser, requireAdmin, requireStaff } from '@/lib/actions/guard'
import { nextReferenceId } from '@/lib/referenceId'
import { createNotification, notifyAllStaff } from '@/lib/actions/notifications'
import { recordAudit } from '@/lib/actions/audit'
import { getServices } from '@/lib/actions/service'
import { APP_NAME } from '@/config/constants'
import { sendMail } from '@/lib/mailer'
import {
  APPOINTMENT_SLOTS,
  SERVICE_TIME_RANGE,
  normalizeServiceTime,
  SLOT_CAPACITY,
  isValidSlotId,
  getSlotLabel,
  slotIdToDate,
  todayISO,
  dayRange,
  isServiceAvailableOnDate,
  extractPatientItrInfo,
  toMedicalRecordSummary,
} from '@/config/appointment'
import type {
  ServiceView,
  SlotAvailability,
  FamilyMemberOption,
  MyAppointmentView,
  ScheduleAppointmentView,
} from '@/config/appointment'

const VALID_STATUSES = [
  'PENDING',
  'APPROVED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]

// Parses the service metadata from the description field, which may contain JSON-encoded information about the service's description, subtitle, time, and icon. If the description is not in JSON format, it treats it as a plain string and assigns default values for missing fields.
function parseServiceMeta(description: string | null | undefined): {
  desc: string
  subtitle: string
  time: string
  icon: string
} {
  let meta: { desc?: string; subtitle?: string; time?: string; icon?: string } =
    {}
  try {
    if (description && description.startsWith('{')) {
      meta = JSON.parse(description)
    } else if (description) {
      meta = { desc: description }
    }
  } catch {
    meta = { desc: description || '' }
  }
  return {
    desc: meta.desc || '',
    subtitle: meta.subtitle || 'Monday to Friday',
    time: normalizeServiceTime(meta.time || SERVICE_TIME_RANGE),
    icon: meta.icon || '🩺',
  }
}

// Converts a service record from the database into a ServiceView object, which includes the service's ID, name, description, schedule, time, icon, and availability status. It uses the parseServiceMeta function to extract metadata from the service's description field.
function toServiceView(s: any): ServiceView {
  const meta = parseServiceMeta(s.description)
  return {
    id: s.serviceid,
    name: s.name,
    description: meta.desc,
    schedule: meta.subtitle,
    time: meta.time,
    icon: meta.icon,
    available: s.availability ?? true,
  }
}

// Fetches the list of available services for booking appointments. It retrieves the services from the database, processes each service to extract relevant metadata, and returns a structured response containing the success status, message, and an array of ServiceView objects representing the available services.
export async function getBookingServices(): Promise<{
  success: boolean
  message: string
  services: ServiceView[]
}> {
  const result = await getServices()
  return {
    success: result.success,
    message: result.message,
    services: (result.services || []).map((s: any) =>
      toServiceView({
        serviceid: s.id,
        name: s.title,
        description: JSON.stringify({
          desc: s.desc,
          subtitle: s.subtitle,
          time: s.time,
          icon: s.icon,
        }),
        availability: s.availability,
      }),
    ),
  }
}

// Fetches the availability of appointment slots for a specific date. It checks the number of booked appointments for each slot and calculates the remaining capacity. The function returns a structured response containing the success status, message, and an array of SlotAvailability objects representing the availability of each slot on the specified date.
export async function getDayAvailability(
  dateISO: string,
): Promise<{ success: boolean; message: string; slots: SlotAvailability[] }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
    return { success: false, message: 'Invalid date.', slots: [] }
  }

  try {
    const { start, end } = dayRange(dateISO)
    const rows = await (prisma as any).appointment.findMany({
      where: {
        appointmentAt: { gte: start, lt: end },
        status: { not: 'CANCELLED' },
      },
      select: { appointmentAt: true },
    })

    const bookedBySlot = new Map<string, number>()
    for (const row of rows) {
      const at = new Date(row.appointmentAt)
      const slotId = `${String(at.getUTCHours()).padStart(2, '0')}:00`
      bookedBySlot.set(slotId, (bookedBySlot.get(slotId) ?? 0) + 1)
    }

    const slots: SlotAvailability[] = APPOINTMENT_SLOTS.map((slot) => {
      const booked = bookedBySlot.get(slot.id) ?? 0
      const remaining = Math.max(0, SLOT_CAPACITY - booked)
      return {
        ...slot,
        booked,
        remaining,
        status:
          remaining === 0
            ? 'unavailable'
            : remaining <= 2
              ? 'limited'
              : 'available',
      }
    })

    return { success: true, message: 'Availability fetched.', slots }
  } catch (error) {
    console.error('[getDayAvailability | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch availability.',
      slots: [],
    }
  }
}

// Fetches the list of family members associated with the signed-in user. It retrieves the family members from the database, processes each record to extract relevant information, and returns a structured response containing the success status, message, and an array of FamilyMemberOption objects representing the user's family members.
export async function getMyFamilyMembers(): Promise<{
  success: boolean
  message: string
  familyMembers: FamilyMemberOption[]
}> {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Unauthorized', familyMembers: [] }
  }

  try {
    const rows = await (prisma as any).familyMember.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
    })
    return {
      success: true,
      message: 'Family members fetched.',
      familyMembers: rows.map((row: any) => ({
        id: row.familymemberid,
        name: row.name,
        relation: row.relation,
      })),
    }
  } catch (error) {
    console.error('[getMyFamilyMembers | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch family members.',
      familyMembers: [],
    }
  }
}

// Fetches the list of appointments for the signed-in user. It retrieves the appointments from the database, processes each record to extract relevant information, and returns a structured response containing the success status, message, and an array of MyAppointmentView objects representing the user's appointments.
export async function getMyAppointments(): Promise<{
  success: boolean
  message: string
  appointments: MyAppointmentView[]
}> {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Unauthorized', appointments: [] }
  }

  try {
    const rows = await (prisma as any).appointment.findMany({
      where: { userId: session.user.id },
      orderBy: { appointmentAt: 'desc' },
      include: { service: true, familyMember: true },
    })

    const appointments: MyAppointmentView[] = rows.map((row: any) => {
      const at = new Date(row.appointmentAt)
      const meta = parseServiceMeta(row.service?.description)
      return {
        id: row.appointmentid,
        serviceName: row.service?.name ?? 'Service',
        serviceIcon: meta.icon,
        appointmentAtISO: `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, '0')}-${String(at.getUTCDate()).padStart(2, '0')}`,
        appointmentAtTime: getSlotLabel(
          `${String(at.getUTCHours()).padStart(2, '0')}:00`,
        ),
        status: row.status,
        // Null family member means the appointment is for the account owner.
        forName: row.familyMember?.name ?? 'Self',
      }
    })

    return { success: true, message: 'Appointments fetched.', appointments }
  } catch (error) {
    console.error('[getMyAppointments | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch appointments.',
      appointments: [],
    }
  }
}

// Fetches a full appointment view for staff to complete the ITR.
export async function getMyAppointmentForItr(appointmentId: string): Promise<{
  success: boolean
  message: string
  appointment: ScheduleAppointmentView | null
}> {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Unauthorized', appointment: null }
  }
  if (
    !['SUPERADMIN', 'ADMIN', 'MEDSTAFF'].includes(
      String(session.user.role ?? ''),
    )
  ) {
    return {
      success: false,
      message: 'Only admin or medical staff may view this record.',
      appointment: null,
    }
  }

  try {
    const row = await (prisma as any).appointment.findFirst({
      where: { appointmentid: appointmentId },
      include: {
        service: true,
        patient: true,
        familyMember: true,
        user: { include: { profile: true } },
        medicalHistory: true,
      },
    })

    if (!row) {
      return {
        success: false,
        message: 'Appointment not found.',
        appointment: null,
      }
    }
    if (['CANCELLED', 'NO_SHOW'].includes(row.status)) {
      return {
        success: false,
        message: 'This appointment cannot be recorded.',
        appointment: null,
      }
    }

    const at = new Date(row.appointmentAt)
    const profile = row.user?.profile
    const name = row.familyMember
      ? row.familyMember.name
      : profile
        ? `${(profile.lastName || '').toUpperCase()}, ${profile.firstName || ''}${
            profile.middleName ? ' ' + profile.middleName : ''
          }`.trim()
        : row.user?.email || 'Patient'

    return {
      success: true,
      message: 'Appointment fetched.',
      appointment: {
        id: row.appointmentid,
        patientName: name,
        patientReference: row.user?.id || '',
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
        timeLabel: getSlotLabel(
          `${String(at.getUTCHours()).padStart(2, '0')}:00`,
        ),
        status: row.status,
        patientInfo: extractPatientItrInfo(row),
        hasMedicalRecord: Boolean(row.medicalHistory),
        medicalRecord: row.medicalHistory
          ? toMedicalRecordSummary(row.medicalHistory)
          : null,
      },
    }
  } catch (error) {
    console.error('[getMyAppointmentForItr | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch appointment.',
      appointment: null,
    }
  }
}

// Books an appointment for the signed-in user.
export async function bookAppointment(_prevState: any, formData: FormData) {
  const session = await requireUser()
  if (!session) {
    return {
      success: false,
      message: 'You must be signed in to book an appointment.',
    }
  }

  const serviceId = formData.get('serviceId')?.toString().trim() || ''
  const dateISO = formData.get('date')?.toString().trim() || ''
  const slotId = formData.get('slotId')?.toString().trim() || ''
  const familyMemberId = formData.get('familyMemberId')?.toString().trim() || ''

  if (!serviceId) return { success: false, message: 'Please choose a service.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
    return { success: false, message: 'Please choose a valid date.' }
  }
  if (!isValidSlotId(slotId)) {
    return { success: false, message: 'Please choose a valid time slot.' }
  }
  if (dateISO < todayISO()) {
    return {
      success: false,
      message: 'You cannot book an appointment in the past.',
    }
  }

  try {
    const account = await (prisma as any).user.findFirst({
      where: { id: session.user.id },
      select: {
        status: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            birthdate: true,
            phoneNumber: true,
            houseNumber: true,
            barangay: true,
            city: true,
            province: true,
            zipCode: true,
          },
        },
      },
    })
    if (!account || account.status !== 'ACTIVE') {
      return {
        success: false,
        message:
          'Your account is not approved yet. You can book once an admin activates your account.',
      }
    }
    const profile = account.profile
    const missingProfileField = [
      profile?.firstName,
      profile?.lastName,
      profile?.birthdate,
      profile?.phoneNumber,
      profile?.houseNumber,
      profile?.barangay,
      profile?.city,
      profile?.province,
      profile?.zipCode,
    ].some((value) => !value)
    if (missingProfileField) {
      return {
        success: false,
        message:
          'Complete your personal information once in Profile before booking an appointment.',
      }
    }
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

    const serviceMeta = parseServiceMeta(service.description)
    if (!isServiceAvailableOnDate(serviceMeta.subtitle, dateISO)) {
      return {
        success: false,
        message: `This service is only available on ${serviceMeta.subtitle}. Please choose another date.`,
      }
    }

    let familyMember: any = null
    if (familyMemberId) {
      familyMember = await (prisma as any).familyMember.findFirst({
        where: { familymemberid: familyMemberId, userId: session.user.id },
      })
      if (!familyMember) {
        return {
          success: false,
          message: 'The selected family member was not found on your account.',
        }
      }
    }

    const appointmentAt = slotIdToDate(dateISO, slotId)

    // Capacity check for the chosen slot.
    const { start, end } = dayRange(dateISO)
    const slotBooked = await (prisma as any).appointment.count({
      where: {
        appointmentAt: { gte: start, lt: end },
        status: { not: 'CANCELLED' },
      },
    })
    if (slotBooked >= SLOT_CAPACITY) {
      return {
        success: false,
        message: `The ${getSlotLabel(slotId)} slot on this date is fully booked. Please pick another slot.`,
      }
    }

    // One active appointment per person (account owner or family member) per slot.
    const duplicate = await (prisma as any).appointment.findFirst({
      where: {
        userId: session.user.id,
        familyMemberId: familyMember ? familyMember.familymemberid : null,
        appointmentAt,
        status: { not: 'CANCELLED' },
      },
    })
    if (duplicate) {
      return {
        success: false,
        message: familyMember
          ? `${familyMember.name} already has an appointment booked for this date and time.`
          : 'You already have an appointment booked for this date and time.',
      }
    }

    const created = await (prisma as any).appointment.create({
      data: {
        appointmentid: await nextReferenceId('APT'),
        userId: session.user.id,
        serviceId,
        familyMemberId: familyMember ? familyMember.familymemberid : null,
        appointmentAt,
        status: 'PENDING',
      },
    })

    revalidateTag('appointments', 'max')

    // Notify the account about the new booking.
    await createNotification({
      userId: session.user.id,
      category: 'Appointment',
      title: 'Appointment Booked',
      description: `Your ${service.name} appointment for ${
        familyMember ? familyMember.name : 'you'
      } on ${dateISO} at ${getSlotLabel(slotId)} is pending approval.`,
    })

    // Notify every admin and medical staff so they can review the schedule.
    const booker = await (prisma as any).user.findFirst({
      where: { id: session.user.id },
      include: { profile: true },
    })
    const bookerName = booker?.profile
      ? `${booker.profile.firstName ?? ''} ${booker.profile.lastName ?? ''}`.trim()
      : String(booker?.email ?? '').split('@')[0]
    await notifyAllStaff({
      category: 'Appointment',
      title: 'New Appointment Booked',
      description: `${bookerName || 'A patient'} booked ${service.name} for ${
        familyMember ? familyMember.name : 'themselves'
      } on ${dateISO} at ${getSlotLabel(slotId)}.`,
    })

    return {
      success: true,
      message: `Appointment booked for ${familyMember ? familyMember.name : 'you'} on ${dateISO} at ${getSlotLabel(slotId)}. Status: pending approval.`,
      payload: { id: created.appointmentid },
    }
  } catch (error) {
    console.error('[bookAppointment | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to book the appointment. Please try again.',
    }
  }
}

// Cancels an appointment. The owner, an admin, or staff may cancel.
export async function cancelAppointment(
  appointmentId: string,
): Promise<{ success: boolean; message: string }> {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Unauthorized' }
  }
  if (!appointmentId) {
    return { success: false, message: 'Appointment ID is required.' }
  }

  try {
    const appointment = await (prisma as any).appointment.findUnique({
      where: { appointmentid: appointmentId },
    })
    if (!appointment) {
      return { success: false, message: 'Appointment not found.' }
    }

    const isAdmin = ['SUPERADMIN', 'ADMIN'].includes(
      (session.user.role as string) ?? '',
    )
    const isStaff = ['MEDSTAFF'].includes((session.user.role as string) ?? '')
    if (appointment.userId !== session.user.id && !isAdmin && !isStaff) {
      return {
        success: false,
        message: 'You are not allowed to cancel this appointment.',
      }
    }

    if (appointment.status === 'CANCELLED') {
      return {
        success: false,
        message: 'This appointment is already cancelled.',
      }
    }
    if (appointment.status === 'COMPLETED') {
      return {
        success: false,
        message: 'Completed appointments cannot be cancelled.',
      }
    }

    await (prisma as any).appointment.update({
      where: { appointmentid: appointmentId },
      data: { status: 'CANCELLED' },
    })

    revalidateTag('appointments', 'max')

    await recordAudit({
      action: 'STATUS_CHANGE',
      entity: 'APPOINTMENT',
      entityId: appointmentId,
      description: `Cancelled appointment ${appointmentId} (${getSlotLabel(
        `${String(appointment.appointmentAt.getUTCHours()).padStart(2, '0')}:00`,
      )} on ${appointment.appointmentAt.toISOString().slice(0, 10)}).`,
      metadata: {
        appointmentId,
        previousStatus: appointment.status,
        status: 'CANCELLED',
        userId: appointment.userId,
      },
    })

    if (appointment.userId === session.user.id) {
      await notifyAllStaff({
        category: 'Appointment',
        title: 'Appointment Cancelled',
        description: `The ${appointment.service?.name ?? 'appointment'} on ${appointment.appointmentAt.toISOString().slice(0, 10)} was cancelled by the account holder.`,
      })
    } else {
      await createNotification({
        userId: appointment.userId,
        category: 'Appointment',
        title: 'Appointment Cancelled',
        description: `Your ${appointment.service?.name ?? 'appointment'} on ${appointment.appointmentAt.toISOString().slice(0, 10)} was cancelled by health center staff.`,
      })
    }

    return { success: true, message: 'Appointment cancelled.' }
  } catch (error) {
    console.error('[cancelAppointment | Prisma | Error]:', error)
    return { success: false, message: 'Failed to cancel the appointment.' }
  }
}

// All appointments from today onwards, for the admin/staff schedule view.
export async function getScheduleAppointments(): Promise<{
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
    const { start } = dayRange(todayISO())
    const rows = await (prisma as any).appointment.findMany({
      where: { appointmentAt: { gte: start }, source: 'BOOKING' },
      orderBy: { appointmentAt: 'asc' },
      include: {
        service: true,
        patient: true,
        familyMember: true,
        user: { include: { profile: true } },
        medicalHistory: true,
      },
    })

    // Map the database rows to ScheduleAppointmentView objects, extracting relevant information such as patient name, service name, appointment date and time, status, and medical record details.
    const appointments: ScheduleAppointmentView[] = rows.map((row: any) => {
      const at = new Date(row.appointmentAt)
      const profile = row.user?.profile
      const name = row.familyMember
        ? row.familyMember.name
        : profile
          ? `${(profile.lastName || '').toUpperCase()}, ${profile.firstName || ''}${
              profile.middleName ? ' ' + profile.middleName : ''
            }`.trim()
          : row.user?.email || 'Unknown patient'
      return {
        id: row.appointmentid,
        patientName: name,
        patientReference: row.user?.id || '',
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
        timeLabel: getSlotLabel(
          `${String(at.getUTCHours()).padStart(2, '0')}:00`,
        ),
        status: row.status,
        patientInfo: extractPatientItrInfo(row),
        hasMedicalRecord: Boolean(row.medicalHistory),
        medicalRecord: row.medicalHistory
          ? toMedicalRecordSummary(row.medicalHistory)
          : null,
      }
    })

    return { success: true, message: 'Schedule fetched.', appointments }
  } catch (error) {
    console.error('[getScheduleAppointments | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch the schedule.',
      appointments: [],
    }
  }
}

// Retrieves the display name of the signed-in user. If the user has a profile with a first and/or last name, it returns the full name; otherwise, it returns the user's email or a default label "Patient" if no information is available.
export async function getMyDisplayName(): Promise<string> {
  const session = await requireUser()
  if (!session) return 'Guest'

  try {
    const user = await (prisma as any).user.findFirst({
      where: { id: session.user.id },
      include: { profile: true },
    })
    const profile = user?.profile
    if (profile?.firstName || profile?.lastName) {
      return `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
    }
    return user?.email || 'Patient'
  } catch {
    return 'Patient'
  }
}

// Updates an appointment's status (admin/staff only).
export async function updateAppointmentStatus(
  appointmentId: string,
  status: string,
): Promise<{ success: boolean; message: string }> {
  const session = await requireAdmin()
  if (!session) {
    const staff = await requireStaff()
    if (!staff) {
      return { success: false, message: 'Unauthorized' }
    }
  }

  if (!appointmentId) {
    return { success: false, message: 'Appointment ID is required.' }
  }
  if (!VALID_STATUSES.includes(status)) {
    return { success: false, message: 'Invalid status.' }
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
    const whenLabel = `${appointment.appointmentAt.toISOString().slice(0, 10)} at ${getSlotLabel(
      `${String(appointment.appointmentAt.getUTCHours()).padStart(2, '0')}:00`,
    )}`

    if (status === 'COMPLETED' && !appointment.patientId) {
      let patient = await (prisma as any).patient.findFirst({
        where: {
          userId: appointment.userId,
          familyMemberId: appointment.familyMemberId ?? null,
        },
      })
      if (!patient) {
        patient = await (prisma as any).patient.create({
          data: {
            patientid: await nextReferenceId('PTN'),
            userId: appointment.userId,
            familyMemberId: appointment.familyMemberId ?? null,
          },
        })
      }
      await (prisma as any).appointment.update({
        where: { appointmentid: appointmentId },
        data: { status, patientId: patient.patientid },
      })
    } else {
      await (prisma as any).appointment.update({
        where: { appointmentid: appointmentId },
        data: { status },
      })
    }

    revalidateTag('appointments', 'max')
    revalidateTag('patients', 'max')

    await recordAudit({
      action: 'STATUS_CHANGE',
      entity: 'APPOINTMENT',
      entityId: appointmentId,
      description: `Marked appointment ${appointmentId} (${serviceName} for ${forName}) as ${status}.`,
      metadata: {
        appointmentId,
        previousStatus: appointment.status,
        status,
        patientId: appointment.patientId ?? null,
        userId: appointment.userId,
      },
    })

    const statusNotices: Record<
      string,
      { title: string; description: string }
    > = {
      APPROVED: {
        title: 'Appointment Approved',
        description: `Your ${serviceName} appointment for ${forName} on ${whenLabel} has been approved.`,
      },
      COMPLETED: {
        title: 'Visit Completed',
        description: `The ${serviceName} visit for ${forName} on ${whenLabel} is complete. Any medical record created by staff now appears under Records.`,
      },
      CANCELLED: {
        title: 'Appointment Cancelled',
        description: `Your ${serviceName} appointment for ${forName} on ${whenLabel} was cancelled.`,
      },
      NO_SHOW: {
        title: 'Marked as No-Show',
        description: `The ${serviceName} appointment for ${forName} on ${whenLabel} was marked as a no-show.`,
      },
    }
    const notice = statusNotices[status]
    if (notice) {
      await createNotification({
        userId: appointment.userId,
        category: 'Appointment',
        ...notice,
      })
    }

    return { success: true, message: `Appointment marked as ${status}.` }
  } catch (error) {
    console.error('[updateAppointmentStatus | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to update the appointment status.',
    }
  }
}

// Sends a notification to the patient about their appointment. This function can be called by an admin or staff member to remind the patient of their upcoming appointment. It retrieves the appointment details, constructs a notification message, and sends it to the patient's account and email if available.
export async function notifyAppointment(
  appointmentId: string,
): Promise<{ success: boolean; message: string }> {
  const session = await requireAdmin()
  if (!session) {
    const staff = await requireStaff()
    if (!staff) {
      return { success: false, message: 'Unauthorized' }
    }
  }

  if (!appointmentId) {
    return { success: false, message: 'Appointment ID is required.' }
  }

  try {
    const appointment = await (prisma as any).appointment.findUnique({
      where: { appointmentid: appointmentId },
      include: {
        service: true,
        familyMember: true,
        user: { include: { profile: true } },
      },
    })
    if (!appointment) {
      return { success: false, message: 'Appointment not found.' }
    }

    const profile = appointment.user?.profile
    const patientName = appointment.familyMember
      ? appointment.familyMember.name
      : profile
        ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
        : appointment.user?.email || 'a patient'
    const serviceName = appointment.service?.name ?? 'your appointment'
    const forName = appointment.familyMember?.name ?? 'You'
    const at = new Date(appointment.appointmentAt)
    const dateLabel = at.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
    const timeLabel = getSlotLabel(
      `${String(at.getUTCHours()).padStart(2, '0')}:00`,
    )
    const email = appointment.user?.email || ''

    const title = 'Appointment Reminder'
    const description = `Reminder: your ${serviceName} appointment for ${forName} is scheduled on ${dateLabel} at ${timeLabel}. Please arrive on time.`

    let notified = false
    if (appointment.user?.id) {
      await createNotification({
        userId: appointment.user.id,
        category: 'Appointment',
        title,
        description,
      })
      notified = true
    }

    let emailed = false
    if (email) {
      const content = `
        <p>Hi ${patientName},</p>
        <p>This is a reminder about your upcoming appointment with us.</p>
        <p><strong>Service:</strong> ${serviceName}</p>
        <p><strong>For:</strong> ${patientName}</p>
        <p><strong>Date:</strong> ${dateLabel}</p>
        <p><strong>Time:</strong> ${timeLabel}</p>
        <p>Please arrive a few minutes early. Thank you!</p>
      `
      emailed = await sendMail({
        to: email,
        subject: `Appointment Reminder - ${APP_NAME}`,
        content,
      })
    }

    await recordAudit({
      action: 'NOTIFY',
      entity: 'APPOINTMENT',
      entityId: appointmentId,
      description: `Sent an appointment reminder for ${patientName} (${serviceName} on ${dateLabel} at ${timeLabel}).`,
      metadata: {
        appointmentId,
        patientName,
        serviceName,
        channel: notified && emailed ? 'IN_APP+EMAIL' : notified ? 'IN_APP' : 'EMAIL',
      },
    })

    return {
      success: true,
      message:
        notified && emailed
          ? 'Patient notified and email sent.'
          : notified
            ? 'Patient notified (email could not be sent).'
            : emailed
              ? 'Email sent to the patient.'
              : 'Notification sent.',
    }
  } catch (error) {
    console.error('[notifyAppointment | Prisma | Error]:', error)
    return { success: false, message: 'Failed to send the notification.' }
  }
}
