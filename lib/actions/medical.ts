// This file contains server-side actions related to medical record management, including saving and updating medical records. It uses Prisma for database interactions and NextAuth for session management. The functions are designed to be used in a Next.js application with server-side rendering and caching capabilities.
'use server'

import prisma from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { requireAdmin, requireStaff } from '@/lib/actions/guard'
import { nextReferenceId } from '@/lib/referenceId'
import { createNotification } from '@/lib/actions/notifications'
import { getSlotLabel } from '@/config/appointment'
import { RECORD_STATUSES } from '@/config/medical'

// Resolves the staff ID of the user who checked the medical record based on their session information. It first attempts to find the staff ID using the user's session ID, and if not found, it tries to find it using the user's email address. If neither method succeeds, it returns null.
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

function decimalInput(value: string): string {
  return Number(value).toFixed(2)
}

// Saves or updates a medical record for a specific appointment based on the provided form data. It checks for user authorization (admin or staff), validates the input fields, and either creates a new medical history entry or updates an existing one. The function also updates the appointment status to "COMPLETED" if necessary and sends a notification to the user about the medical record update. It returns a success status and message indicating the result of the operation.
export async function saveMedicalRecord(_prevState: any, formData: FormData) {
  console.log('[saveMedicalRecord] === CALLED ===')
  console.log('[saveMedicalRecord] FormData keys:', Array.from(formData.keys()))
  console.log(
    '[saveMedicalRecord] AppointmentId:',
    formData.get('appointmentId'),
  )
  console.log(
    '[saveMedicalRecord] BloodPressure:',
    formData.get('bloodPressure'),
  )
  console.log('[saveMedicalRecord] Diagnosis:', formData.get('diagnosis'))
  let session = await requireAdmin()
  if (!session) session = await requireStaff()
  if (!session) {
    console.log('[saveMedicalRecord] Unauthorized - no session')
    return { success: false, message: 'Unauthorized' }
  }
  console.log(
    '[saveMedicalRecord] User authorized:',
    session.user.id,
    'Role:',
    (session.user as any).role,
  )

  const appointmentId = formData.get('appointmentId')?.toString().trim() || ''
  const bloodPressure = formData.get('bloodPressure')?.toString().trim() || ''
  const oxygenLevel = formData.get('oxygenLevel')?.toString().trim() || ''
  const heartRate = formData.get('heartRate')?.toString().trim() || ''
  const respiratoryRate =
    formData.get('respiratoryRate')?.toString().trim() || ''
  const temperature = formData.get('temperature')?.toString().trim() || ''
  const height = formData.get('height')?.toString().trim() || ''
  const weight = formData.get('weight')?.toString().trim() || ''
  const chiefComplaints =
    formData.get('chiefComplaints')?.toString().trim() || ''
  const diagnosis = formData.get('diagnosis')?.toString().trim() || ''
  const medications = formData.get('medications')?.toString().trim() || ''
  const recommendation = formData.get('recommendation')?.toString().trim() || ''
  const recordStatus =
    formData.get('recordStatus')?.toString().trim() || 'Stable'

  // Adult ITR (Individual Treatment Record) snapshot fields — all optional.
  const ITR_FIELDS = [
    'lastName',
    'firstName',
    'middleName',
    'suffix',
    'civilStatus',
    'maidenName',
    'philHealthNo',
    'memberName',
    'memberBirthday',
    'memberDependent',
    'familyMemberRole',
    'birthday',
    'age',
    'sex',
    'birthplace',
    'bloodType',
    'fathersName',
    'mothersName',
    'contactNumber',
    'religion',
    'spouseName',
    'address',
    'educationalAttainment',
    'ageOfMenarche',
    'gravidity',
    'parityFullTerm',
    'parityPreterm',
    'parityAbortion',
    'parityLivebirth',
    'lmp',
    'edc',
    'consentPatientName',
    'consentDate',
    'consentRepresentative',
    // Child ITR fields
    'placeDelivered',
    'placeDeliveredOthers',
    'typeOfDelivery',
    'birthLength',
    'birthWeight',
    'attendantAtBirth',
    'imm_bcg',
    'imm_hepab24',
    'imm_hepab24plus',
    'imm_penta1',
    'imm_penta2',
    'imm_penta3',
    'imm_opv1',
    'imm_opv2',
    'imm_opv3',
    'imm_rota1',
    'imm_rota2',
    'imm_pcv1',
    'imm_pcv2',
    'imm_pcv3',
    'imm_mcv1',
    'imm_mcv2',
    'imm_hepab2',
    'imm_hepab3',
    'imm_hepaa',
    'imm_pneumonia',
    'imm_influenza',
    'imm_others',
  ] as const
  const itrData: Record<string, string> = {}
  for (const field of ITR_FIELDS) {
    const value = formData.get(field)?.toString().trim() || ''
    if (value) itrData[field] = value
  }

  // Echo the user's input back on validation errors so the ITR forms can
  // re-mount pre-filled instead of losing everything that was typed when refreshed.
  const submittedValues = Object.fromEntries(formData) as Record<string, string>
  const fail = (message: string) => ({
    success: false as const,
    message,
    values: submittedValues,
  })

  if (!appointmentId) {
    return fail('Appointment ID is required.')
  }
  if (!/^\d{2,3}\/\d{2,3}$/.test(bloodPressure)) {
    return fail('Blood pressure must look like 120/80.')
  }
  // Oxygen level is optional on the Adult ITR form (not part of the paper
  // vitals table), but still validated when provided.
  if (oxygenLevel) {
    const oxygenNum = Number(oxygenLevel)
    if (Number.isNaN(oxygenNum) || oxygenNum < 0 || oxygenNum > 100) {
      return fail('Oxygen level must be a number between 0 and 100.')
    }
  }
  const heartRateNum = Number(heartRate)
  if (
    heartRate &&
    (Number.isNaN(heartRateNum) || heartRateNum < 0 || heartRateNum > 300)
  ) {
    return fail('Heart rate must be a number between 0 and 300 (bpm).')
  }
  const respiratoryRateNum = Number(respiratoryRate)
  if (
    respiratoryRate &&
    (Number.isNaN(respiratoryRateNum) ||
      respiratoryRateNum < 0 ||
      respiratoryRateNum > 100)
  ) {
    return fail(
      'Respiratory rate must be a number between 0 and 100 (breaths/min).',
    )
  }
  const temperatureNum = Number(temperature)
  if (
    temperature &&
    (Number.isNaN(temperatureNum) || temperatureNum < 25 || temperatureNum > 45)
  ) {
    return fail('Temperature must be a number between 25 and 45 (°C).')
  }
  const heightNum = Number(height)
  if (!height || Number.isNaN(heightNum) || heightNum <= 0 || heightNum > 300) {
    return fail('Height must be a number between 0 and 300 (cm).')
  }
  const weightNum = Number(weight)
  if (!weight || Number.isNaN(weightNum) || weightNum <= 0 || weightNum > 700) {
    return fail('Weight must be a number between 0 and 700 (kg).')
  }
  if (diagnosis.length < 3) {
    return fail('Please enter a diagnosis.')
  }
  if (!(RECORD_STATUSES as readonly string[]).includes(recordStatus)) {
    return fail('Invalid record status.')
  }

  // Check if the appointment exists and is eligible for medical record entry. If the appointment is cancelled or marked as no-show, return an error message indicating that a medical record cannot be recorded for such appointments.
  try {
    console.log(
      '[saveMedicalRecord] Validation passed. Looking up appointment:',
      appointmentId,
    )
    const appointment = await (prisma as any).appointment.findUnique({
      where: { appointmentid: appointmentId },
      include: {
        service: true,
        familyMember: true,
        user: { include: { profile: true } },
        medicalHistory: true,
      },
    })
    console.log(
      '[saveMedicalRecord] Appointment found:',
      !!appointment,
      'Status:',
      appointment?.status,
    )
    if (!appointment) {
      return fail('Appointment not found.')
    }

    const role = String((session.user as any)?.role ?? '')
    const isStaffOrAdmin = ['SUPERADMIN', 'ADMIN', 'MEDSTAFF'].includes(role)
    if (!isStaffOrAdmin)
      return fail('Only admin or medical staff may update this record.')

    if (['CANCELLED', 'NO_SHOW'].includes(appointment.status)) {
      return fail(
        `A ${appointment.status === 'NO_SHOW' ? 'no-show' : 'cancelled'} appointment cannot be recorded.`,
      )
    }

    let patientId = appointment.patientId as string | null
    console.log('[saveMedicalRecord] Existing patientId:', patientId)
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
    console.log('[saveMedicalRecord] Final patientId:', patientId)

    // Keep the linked Patient row in sync with the family member's patient
    // info so patient records and dashboards carry the birthdate/sex/address.
    if (appointment.familyMember && patientId) {
      const fm = appointment.familyMember
      await (prisma as any).patient.update({
        where: { patientid: patientId as string },
        data: {
          name: fm.name || undefined,
          birthdate: fm.birthdate || undefined,
          sex: fm.sex || undefined,
          phoneNumber: fm.phone || undefined,
          houseNumber: fm.houseNumber || undefined,
          barangay: fm.barangay || undefined,
          city: fm.city || undefined,
          province: fm.province || undefined,
          zipCode: fm.zipCode || undefined,
          bloodType: fm.bloodType || undefined,
          religion: fm.religion || undefined,
          fathersName: fm.fathersName || undefined,
          mothersName: fm.mothersName || undefined,
          purok: fm.purok || undefined,
        },
      })
    }

    const checkedById = await resolveCheckedByStaffId(session)
    console.log('[saveMedicalRecord] checkedById:', checkedById)

    function optionalDecimal(value: string): string | null {
      if (!value) return null
      const n = Number(value)
      return Number.isNaN(n) ? null : n.toFixed(2)
    }

    // Parse date string to Date object or null
    function optionalDate(value: string): Date | null {
      if (!value) return null
      const d = new Date(`${value}T00:00:00.000Z`)
      return Number.isNaN(d.getTime()) ? null : d
    }

    const data = {
      patientId,
      checkedById,
      status: recordStatus,
      bloodPressure,
      heartRate: optionalDecimal(heartRate),
      respiratoryRate: optionalDecimal(respiratoryRate),
      temperature: optionalDecimal(temperature),
      height: decimalInput(height),
      weight: decimalInput(weight),
      oxygenLevel: optionalDecimal(oxygenLevel),
      chiefComplaints: chiefComplaints || null,
      diagnosis,
      medications: medications || null,
      recommendation: recommendation || null,
      // Child immunization records
      immBcg: optionalDate(formData.get('imm_bcg')?.toString().trim() || ''),
      immHepab24: optionalDate(
        formData.get('imm_hepab24')?.toString().trim() || '',
      ),
      immHepab24plus: optionalDate(
        formData.get('imm_hepab24plus')?.toString().trim() || '',
      ),
      immPenta1: optionalDate(
        formData.get('imm_penta1')?.toString().trim() || '',
      ),
      immPenta2: optionalDate(
        formData.get('imm_penta2')?.toString().trim() || '',
      ),
      immPenta3: optionalDate(
        formData.get('imm_penta3')?.toString().trim() || '',
      ),
      immOpv1: optionalDate(formData.get('imm_opv1')?.toString().trim() || ''),
      immOpv2: optionalDate(formData.get('imm_opv2')?.toString().trim() || ''),
      immOpv3: optionalDate(formData.get('imm_opv3')?.toString().trim() || ''),
      immRota1: optionalDate(
        formData.get('imm_rota1')?.toString().trim() || '',
      ),
      immRota2: optionalDate(
        formData.get('imm_rota2')?.toString().trim() || '',
      ),
      immPcv1: optionalDate(formData.get('imm_pcv1')?.toString().trim() || ''),
      immPcv2: optionalDate(formData.get('imm_pcv2')?.toString().trim() || ''),
      immPcv3: optionalDate(formData.get('imm_pcv3')?.toString().trim() || ''),
      immMcv1: optionalDate(formData.get('imm_mcv1')?.toString().trim() || ''),
      immMcv2: optionalDate(formData.get('imm_mcv2')?.toString().trim() || ''),
      immHepab2: optionalDate(
        formData.get('imm_hepab2')?.toString().trim() || '',
      ),
      immHepab3: optionalDate(
        formData.get('imm_hepab3')?.toString().trim() || '',
      ),
      immHepaa: optionalDate(
        formData.get('imm_hepaa')?.toString().trim() || '',
      ),
      immPneumonia: optionalDate(
        formData.get('imm_pneumonia')?.toString().trim() || '',
      ),
      immInfluenza: optionalDate(
        formData.get('imm_influenza')?.toString().trim() || '',
      ),
      immOthers: optionalDate(
        formData.get('imm_others')?.toString().trim() || '',
      ),
      // Child birth details
      placeDelivered: formData.get('placeDelivered')?.toString().trim() || null,
      placeDeliveredOthers:
        formData.get('placeDeliveredOthers')?.toString().trim() || null,
      typeOfDelivery: formData.get('typeOfDelivery')?.toString().trim() || null,
      birthLength: optionalDecimal(
        formData.get('birthLength')?.toString().trim() || '',
      ),
      birthWeight: optionalDecimal(
        formData.get('birthWeight')?.toString().trim() || '',
      ),
      attendantAtBirth:
        formData.get('attendantAtBirth')?.toString().trim() || null,
      itrData: Object.keys(itrData).length ? itrData : null,
      checkedDate: new Date(),
    }

    console.log(
      '[saveMedicalRecord] Data to save:',
      JSON.stringify(data, null, 2),
    )

    // One medical history row per appointment (unique appointmentId).
    if (appointment.medicalHistory) {
      console.log(
        '[saveMedicalRecord] Updating existing medical history:',
        appointment.medicalHistory.medhisid,
      )
      await (prisma as any).medicalHistory.update({
        where: { medhisid: appointment.medicalHistory.medhisid },
        data,
      })
    } else {
      console.log('[saveMedicalRecord] Creating new medical history')
      await (prisma as any).medicalHistory.create({
        data: {
          medhisid: await nextReferenceId('MED'),
          appointmentId,
          ...data,
        },
      })
    }
    console.log('[saveMedicalRecord] Medical history saved successfully')

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
    // Only notify when a staff/admin fills the record; a patient updating their
    // own ITR doesn't need a notification about their own action.
    if (isStaffOrAdmin) {
      await createNotification({
        userId: appointment.userId,
        category: 'Records',
        title: updated ? 'Medical Record Updated' : 'Medical Record Added',
        description: updated
          ? `The medical record for ${forName}'s ${serviceName} visit on ${whenLabel} was updated by health staff.`
          : `A medical record for ${forName}'s ${serviceName} visit on ${whenLabel} is now available under Records.`,
      })
    }

    return {
      success: true,
      message: updated
        ? 'Medical record updated.'
        : 'Medical record saved. Appointment marked as completed.',
    }
  } catch (error) {
    console.error('[saveMedicalRecord | ERROR]:', error)
    console.error('[saveMedicalRecord | ERROR stack]:', (error as Error)?.stack)
    console.error(
      '[saveMedicalRecord | ERROR message]:',
      (error as Error)?.message,
    )
    if ((error as any)?.code)
      console.error(
        '[saveMedicalRecord | Prisma error code]:',
        (error as any).code,
      )
    if ((error as any)?.meta)
      console.error(
        '[saveMedicalRecord | Prisma error meta]:',
        JSON.stringify((error as any).meta),
      )
    return fail('Failed to save the medical record. Please try again.')
  }
}
