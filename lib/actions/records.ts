'use server'

import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/actions/guard'
import type { MedicalRecord, PatientMember } from '@/src/data/records'
import { buildMedicalRecord, splitFullName } from '@/lib/medicalRecord'

function initialsOf(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

// Guarded, exported entry point: verifies the caller is a user
export async function getMyMedicalRecords(): Promise<{
  success: boolean
  message: string
  members: PatientMember[]
}> {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Unauthorized', members: [] }
  }

  // Fetches the medical records for the currently authenticated user. It retrieves the user's profile, associated patients, and their completed appointments with medical history. The function processes the data to create a list of patient members, including their names, relations, and medical records. It returns a success status, message, and the list of patient members. If an error occurs during the database query, it logs the error and returns a failure status with an empty members array.
  try {
    const user = await (prisma as any).user.findFirst({
      where: { id: session.user.id },
      include: {
        profile: true,
        patients: {
          include: {
            familyMember: true,
            appointments: {
              where: { status: 'COMPLETED' },
              include: {
                service: true,
                medicalHistory: { include: { checkedBy: true } },
              },
              orderBy: { appointmentAt: 'desc' },
            },
          },
        },
      },
    })
    if (!user) {
      return { success: false, message: 'Account not found.', members: [] }
    }

    const profileName = user.profile
      ? `${user.profile.firstName ?? ''} ${user.profile.lastName ?? ''}`.trim()
      : ''
    const ownerName = profileName || String(user.email).split('@')[0]

    const members: PatientMember[] = (user.patients ?? []).map((p: any) => {
      const isSelf = !p.familyMemberId
      const name = isSelf
        ? ownerName
        : (p.familyMember?.name ?? 'Family Member')
      const relation = isSelf
        ? 'Account Holder'
        : (p.familyMember?.relation ?? 'Family')
      const fam: any = p.familyMember
      const source: any = isSelf ? user.profile : fam
      const nameParts = splitFullName(isSelf ? ownerName : fam?.name)
      const profileInfo = {
        lastName: source?.lastName ?? nameParts.lastName,
        firstName: source?.firstName ?? nameParts.firstName,
        middleName: source?.middleName ?? nameParts.middleName,
        suffix: source?.suffix ?? undefined,
        birthdate: source?.birthdate ?? undefined,
        sex: source?.sex ?? undefined,
        bloodType: source?.bloodType ?? undefined,
        religion: source?.religion ?? undefined,
        phoneNumber: source?.phoneNumber ?? fam?.phone ?? undefined,
        houseNumber: source?.houseNumber ?? undefined,
        purok: source?.purok ?? undefined,
        barangay: source?.barangay ?? undefined,
        city: source?.city ?? undefined,
        province: source?.province ?? undefined,
        fathersName: source?.fathersName ?? undefined,
        mothersName: source?.mothersName ?? undefined,
      }

      const records: MedicalRecord[] = (p.appointments ?? [])
        .filter((a: any) => a.medicalHistory)
        .map((a: any) =>
          buildMedicalRecord({
            mh: a.medicalHistory,
            serviceName: a.service?.name,
            profileInfo,
            fallbackName: name,
          }),
        )

      return {
        id: p.patientid,
        name,
        relation,
        initials: initialsOf(name),
        records,
      }
    })

    members.sort((a, b) => {
      if (a.relation === 'Account Holder') return -1
      if (b.relation === 'Account Holder') return 1
      return 0
    })

    if (!members.some((m) => m.relation === 'Account Holder')) {
      members.unshift({
        id: 'me',
        name: ownerName,
        relation: 'Account Holder',
        initials: initialsOf(ownerName),
        records: [],
      })
    }

    return { success: true, message: 'Records fetched.', members }
  } catch (error) {
    console.error('[getMyMedicalRecords | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch medical records.',
      members: [],
    }
  }
}
