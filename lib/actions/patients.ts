'use server'

import prisma from '@/lib/prisma'
import { requireAdmin, requireStaff } from '@/lib/actions/guard'
import { nextReferenceId } from '@/lib/referenceId'
import { isValidEmail } from '@/lib/helper'
import { cacheTag, cacheLife, revalidateTag } from 'next/cache'

export type PatientVisitView = {
  id: string
  date: string // ISO
  serviceName: string
  condition: string
  bloodPressure: string
  oxygenLevel: string
  height: string
  weight: string
  diagnosis: string
  recommendation: string
  checkedBy: string
}

export type PatientListItem = {
  id: string
  name: string
  sex: string
  birthdate: string // ISO date or ''
  age: number | null
  phoneNumber: string
  houseNumber: string
  barangay: string
  city: string
  province: string
  zipCode: string
  dateRecorded: string // ISO
  hasAccount: boolean
  email: string
  visits: PatientVisitView[]
}

function ageFrom(birthdate: Date | null | undefined): number | null {
  if (!birthdate) return null
  const now = new Date()
  let age = now.getUTCFullYear() - birthdate.getUTCFullYear()
  const beforeBirthday =
    now.getUTCMonth() < birthdate.getUTCMonth() ||
    (now.getUTCMonth() === birthdate.getUTCMonth() &&
      now.getUTCDate() < birthdate.getUTCDate())
  if (beforeBirthday) age -= 1
  return age >= 0 && age < 130 ? age : null
}

/**
 * Cached data fetch: every patient record (PTN-####) with their details and
 * real visit history, for the admin Patient Lists page. Newest records first.
 */
export async function getPatientsData(): Promise<{
  success: boolean
  message: string
  patients: PatientListItem[]
}> {
  'use cache'
  cacheTag('patients')
  cacheLife('max')

  try {
    const rows = await (prisma as any).patient.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        familyMember: true,
        user: { include: { profile: true } },
        medicalHistories: {
          orderBy: { checkedDate: 'desc' },
          include: {
            appointment: { include: { service: true } },
            checkedBy: true,
          },
        },
      },
    })

    const patients: PatientListItem[] = rows.map((row: any) => {
      const profile = row.user?.profile
      const name =
        row.familyMember?.name ||
        (profile
          ? `${(profile.lastName || '').toUpperCase()}, ${profile.firstName || ''}${
              profile.middleName ? ' ' + profile.middleName : ''
            }`.trim()
          : '') ||
        row.name ||
        'Unnamed patient'
      return {
        id: row.patientid,
        name,
        sex: row.sex || profile?.sex || '',
        birthdate: row.birthdate
          ? row.birthdate.toISOString()
          : profile?.birthdate
            ? profile.birthdate.toISOString()
            : '',
        age: ageFrom(row.birthdate ?? profile?.birthdate),
        phoneNumber: row.phoneNumber || profile?.phoneNumber || '',
        houseNumber: row.houseNumber || profile?.houseNumber || '',
        barangay: row.barangay || profile?.barangay || '',
        city: row.city || profile?.city || '',
        province: row.province || profile?.province || '',
        zipCode: row.zipCode || profile?.zipCode || '',
        dateRecorded: row.createdAt.toISOString(),
        hasAccount: Boolean(row.userId),
        email: row.user?.email || '',
        visits: (row.medicalHistories ?? []).map((h: any) => ({
          id: h.medhisid,
          date: h.checkedDate.toISOString(),
          serviceName: h.appointment?.service?.name ?? 'Consultation',
          condition: h.status ?? '',
          bloodPressure: h.bloodPressure ?? '',
          oxygenLevel: String(h.oxygenLevel ?? ''),
          height: String(h.height ?? ''),
          weight: String(h.weight ?? ''),
          diagnosis: h.diagnosis ?? '',
          recommendation: h.recommendation ?? '',
          checkedBy: h.checkedBy
            ? `${h.checkedBy.lastName}, ${h.checkedBy.firstName}`.replace(/^, $/, '')
            : '',
        })),
      }
    })

    return { success: true, message: 'Patients fetched.', patients }
  } catch (error) {
    console.error('[getPatients | Prisma | Error]:', error)
        return { success: false, message: 'Failed to fetch patients.', patients: [] }
  }
}

/**
 * Guarded, exported entry point: verifies the caller is an admin or staff
 * member before returning the cached patient list.
 */
export async function getPatients(): Promise<{
  success: boolean
  message: string
  patients: PatientListItem[]
}> {
  const session = await requireAdmin()
  if (!session) {
    const staff = await requireStaff()
    if (!staff) {
      return { success: false, message: 'Unauthorized', patients: [] }
    }
  }
  return getPatientsData()
}

function readDetailFields(formData: FormData) {
  return {
    name: formData.get('name')?.toString().trim() || '',
    sex: formData.get('sex')?.toString().trim() || '',
    birthdate: formData.get('birthdate')?.toString().trim() || '',
    phoneNumber: formData.get('phoneNumber')?.toString().trim() || '',
    houseNumber: formData.get('houseNumber')?.toString().trim() || '',
    barangay: formData.get('barangay')?.toString().trim() || '',
    city: formData.get('city')?.toString().trim() || '',
    province: formData.get('province')?.toString().trim() || '',
    zipCode: formData.get('zipCode')?.toString().trim() || '',
  }
}

function parseBirthdate(value: string): Date | null {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() > Date.now()) {
    return null
  }
  return parsed
}

/**
 * Creates a new patient record (PTN-####) from the Patient Lists page.
 * Form fields: name, sex, birthdate, phoneNumber, houseNumber, barangay,
 * city, province, zipCode.
 */
export async function createPatientRecord(
  _prevState: any,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  const session = await requireAdmin()
  if (!session) {
    const staff = await requireStaff()
    if (!staff) return { success: false, message: 'Unauthorized' }
  }

  const fields = readDetailFields(formData)
  if (fields.name.length < 3) {
    return { success: false, message: 'Enter the patient’s full name.' }
  }
  if (!fields.sex) {
    return { success: false, message: 'Select the patient’s sex.' }
  }
  const birthdate = parseBirthdate(fields.birthdate)
  if (!birthdate) {
    return {
      success: false,
      message: 'Enter a valid birthday (not in the future).',
    }
  }

    try {
    await (prisma as any).patient.create({
      data: {
        patientid: await nextReferenceId('PTN'),
        userId: null,
        name: fields.name,
        sex: fields.sex,
        birthdate,
        phoneNumber: fields.phoneNumber || null,
        houseNumber: fields.houseNumber || null,
        barangay: fields.barangay || null,
        city: fields.city || null,
        province: fields.province || null,
        zipCode: fields.zipCode || null,
      },
    })
        revalidateTag('patients', 'max')
    return {
      success: true,
      message: `${fields.name} added to the patient list.`,
    }
  } catch (error) {
    console.error('[createPatientRecord | Prisma | Error]:', error)
    return { success: false, message: 'Failed to add the patient. Please try again.' }
  }
}

/**
 * Updates an existing patient record's details.
 * Form fields: patientId, name, sex, birthdate, phoneNumber, houseNumber,
 * barangay, city, province, zipCode.
 */
export async function updatePatientRecord(
  _prevState: any,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  const session = await requireAdmin()
  if (!session) {
    const staff = await requireStaff()
    if (!staff) return { success: false, message: 'Unauthorized' }
  }

  const patientId = formData.get('patientId')?.toString().trim() || ''
  const fields = readDetailFields(formData)
  if (!patientId) {
    return { success: false, message: 'Patient ID is required.' }
  }
  if (fields.name.length < 3) {
    return { success: false, message: 'Enter the patient’s full name.' }
  }
  if (!fields.sex) {
    return { success: false, message: 'Select the patient’s sex.' }
  }
  const birthdate = parseBirthdate(fields.birthdate)
  if (!birthdate) {
    return {
      success: false,
      message: 'Enter a valid birthday (not in the future).',
    }
  }

  try {
    const patient = await (prisma as any).patient.findFirst({
      where: { patientid: patientId },
      select: { patientid: true },
    })
    if (!patient) {
      return { success: false, message: 'Patient no longer exists.' }
    }

    await (prisma as any).patient.update({
      where: { patientid: patientId },
      data: {
        name: fields.name,
        sex: fields.sex,
        birthdate,
        phoneNumber: fields.phoneNumber || null,
        houseNumber: fields.houseNumber || null,
        barangay: fields.barangay || null,
        city: fields.city || null,
                province: fields.province || null,
        zipCode: fields.zipCode || null,
      },
    })
        revalidateTag('patients', 'max')
    return {
      success: true,
      message: `${fields.name}'s record was updated.`,
    }
  } catch (error) {
    console.error('[updatePatientRecord | Prisma | Error]:', error)
    return { success: false, message: 'Failed to update the patient. Please try again.' }
  }
}