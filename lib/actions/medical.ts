'use server'

import prisma from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { requireAdmin, requireStaff } from '@/lib/actions/guard'
import { nextReferenceId } from '@/lib/referenceId'
import { createNotification } from '@/lib/actions/notifications'
import { getSlotLabel } from '@/config/appointment'
import { RECORD_STATUSES } from '@/config/medical'

async function resolveCheckedByStaffId(session: {
  user: { id: string; email?: string | null }
}): Promise<string | null> {
  const id = session.user.id
  try {
    const byId = await (prisma as any).staff.findUnique({
      where: { staffid: id },
      select: { staffid: true },
    })
    if (byId) return byId.staffid
    if (session.user.email) {
      const byEmail = await (prisma as any).staff.findUnique({
        where: { email: session.user.email },
        select: { staffid: true },
      })
      if (byEmail) return byEmail.staffid
    }
  } catch (error) {
    console.error('[resolveCheckedByStaffId | Prisma | Error]:', error)
  }
  return null
}

function decimalInput(value: string): number {
  return Number(value)
}


export async function saveMedicalRecord(_prevState: any, formData: FormData) {
  let session = await requireAdmin()
  if (!session) session = await requireStaff()
  if (!session) {
    return { success: false, message: 'Unauthorized' }
  }

  const appointmentId = formData.get('appointmentId')?.toString().trim() || ''
  const bloodPressure = formData.get('bloodPressure')?.toString().trim() || ''
  const oxygenLevel = formData.get('oxygenLevel')?.toString().trim() || ''
  const height = formData.get('height')?.toString().trim() || ''
  const weight = formData.get('weight')?.toString().trim() || ''
  const diagnosis = formData.get('diagnosis')?.toString().trim() || ''
  const recommendation = formData.get('recommendation')?.toString().trim() || ''
  const recordStatus =
    formData.get('recordStatus')?.toString().trim() || 'Stable'

  if (!appointmentId) {
    return { success: false, message: 'Appointment ID is required.' }
  }
  if (!/^\d{2,3}\/\d{2,3}$/.test(bloodPressure)) {
    return {
      success: false,
      message: 'Blood pressure must look like 120/80.',
    }
  }
  const oxygenNum = Number(oxygenLevel)
  if (!oxygenLevel || Number.isNaN(oxygenNum) || oxygenNum < 0 || oxygenNum > 100) {
    return {
      success: false,
      message: 'Oxygen level must be a number between 0 and 100.',
    }
  }
  const heightNum = Number(height)
  if (!height || Number.isNaN(heightNum) || heightNum <= 0 || heightNum > 300) {
    return {
      success: false,
      message: 'Height must be a number between 0 and 300 (cm).',
    }
  }
  const weightNum = Number(weight)
  if (!weight || Number.isNaN(weightNum) || weightNum <= 0 || weightNum > 700) {
    return {
      success: false,
      message: 'Weight must be a number between 0 and 700 (kg).',
    }
  }
  if (diagnosis.length < 3) {
    return { success: false, message: 'Please enter a diagnosis.' }
  }
  if (!(RECORD_STATUSES as readonly string[]).includes(recordStatus)) {
    return { success: false, message: 'Invalid record status.' }
  }

  try {
    const appointment = await (prisma as any).appointment.findUnique({
      where: { appointmentid: appointmentId },
      include: {
        service: true,
        familyMember: true,
        user: { include: { profile: true } },
        medicalHistory: true,
      },
    })
    if (!appointment) {
      return { success: false, message: 'Appointment not found.' }
    }
    if (['CANCELLED', 'NO_SHOW'].includes(appointment.status)) {
      return {
        success: false,
        message: `A ${appointment.status === 'NO_SHOW' ? 'no-show' : 'cancelled'} appointment cannot be recorded.`,
      }
    }

    let patientId = appointment.patientId as string | null
    if (!patientId) {
      const existing = await (prisma as any).patient.findFirst({
        where: {
          userId: appointment.userId,
          familyMemberId: appointment.familyMemberId ?? null,
        },
        select: { patientid: true },
      })
      if (existing) {
        patientId = existing.patientid
      } else {
        const created = await (prisma as any).patient.create({
          data: {
            patientid: await nextReferenceId('PTN'),
            userId: appointment.userId,
            familyMemberId: appointment.familyMemberId ?? null,
          },
        })
        patientId = created.patientid
      }
    }

    const checkedById = await resolveCheckedByStaffId(session)

    const data = {
      patientId,
      checkedById,
      status: recordStatus,
      bloodPressure,
      oxygenLevel: decimalInput(oxygenLevel),
      height: decimalInput(height),
      weight: decimalInput(weight),
      diagnosis,
      recommendation: recommendation || null,
      checkedDate: new Date(),
    }

    // One medical history row per appointment (unique appointmentId).
    if (appointment.medicalHistory) {
      await (prisma as any).medicalHistory.update({
        where: { medhisid: appointment.medicalHistory.medhisid },
        data,
      })
    } else {
      await (prisma as any).medicalHistory.create({
        data: {
          medhisid: await nextReferenceId('MED'),
          appointmentId,
          ...data,
        },
      })
    }

    if (appointment.status !== 'COMPLETED') {
      await (prisma as any).appointment.update({
        where: { appointmentid: appointmentId },
        data: { status: 'COMPLETED', patientId },
      })
    } else if (appointment.patientId !== patientId) {
      await (prisma as any).appointment.update({
        where: { appointmentid: appointmentId },
        data: { patientId },
      })
    }

    revalidateTag('appointments', 'max')
    revalidateTag('patients', 'max')

    const serviceName = appointment.service?.name ?? 'appointment'
    const forName = appointment.familyMember?.name ?? 'you'
    const at = new Date(appointment.appointmentAt)
    const whenLabel = `${at.toISOString().slice(0, 10)} at ${getSlotLabel(
      `${String(at.getUTCHours()).padStart(2, '0')}:00`,
    )}`
    const updated = Boolean(appointment.medicalHistory)
    await createNotification({
      userId: appointment.userId,
      category: 'Records',
      title: updated ? 'Medical Record Updated' : 'Medical Record Added',
      description: updated
        ? `The medical record for ${forName}'s ${serviceName} visit on ${whenLabel} was updated by health staff.`
        : `A medical record for ${forName}'s ${serviceName} visit on ${whenLabel} is now available under Records.`,
    })

    return {
      success: true,
      message: updated
        ? 'Medical record updated.'
        : 'Medical record saved. Appointment marked as completed.',
    }
  } catch (error) {
    console.error('[saveMedicalRecord | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to save the medical record. Please try again.',
    }
  }
}