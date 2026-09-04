'use server'

import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/actions/guard'
import type { MedicalRecord, PatientMember } from '@/src/data/records'
import type { ServiceIconKey } from '@/src/data/appointment'

// Guarded, exported entry point: verifies the caller is a user
function iconForService(name: string): ServiceIconKey {
  const t = (name || '').toLowerCase()
  if (t.includes('vaccin') || t.includes('immun')) return 'syringe'
  if (t.includes('natal') || t.includes('maternal') || t.includes('child'))
    return 'baby'
  if (t.includes('hyper') || t.includes('blood') || t.includes('pressure'))
    return 'heart-pulse'
  if (t.includes('dental')) return 'smile'
  if (t.includes('lab') || t.includes('test')) return 'flask-conical'
  return 'stethoscope'
}

// Formats a patient's name and relation into a string representation. If the patient is the account holder, it returns the name directly; otherwise, it appends the relation in parentheses.
function staffRoleLabel(role: string | null | undefined): string {
  if (role === 'ADMIN') return 'Admin'
  return 'Medical Staff'
}

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
      const profileInfo = isSelf ? user.profile : p.familyMember

      // Helper to format date to YYYY-MM-DD string
      const fmtDate = (d: any) => {
        if (!d) return undefined
        const date = new Date(d)
        if (Number.isNaN(date.getTime())) return undefined
        return date.toISOString().slice(0, 10)
      }

      const records: MedicalRecord[] = (p.appointments ?? [])
        .filter((a: any) => a.medicalHistory)
        .map((a: any) => {
          const mh = a.medicalHistory
          const staff = mh.checkedBy

          // Extract the ITR snapshot (patient demographics filled during the
          // ITR consultation) when present so the record carries the full
          // profile for PDF / view rendering.
          const itr: Record<string, string> =
            mh.itrData &&
            typeof mh.itrData === 'object' &&
            !Array.isArray(mh.itrData)
              ? (Object.fromEntries(
                  Object.entries(mh.itrData as Record<string, unknown>).map(
                    ([k, v]) => [k, v == null ? '' : String(v)],
                  ),
                ) as Record<string, string>)
              : {}
          return {
            id: mh.medhisid,
            date: new Date(mh.checkedDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            }),
            type: a.service?.name ?? 'Consultation',
            staffName: staff
              ? `${staff.firstName ?? ''} ${staff.lastName ?? ''}`.trim()
              : 'Health Staff',
            role: staffRoleLabel(staff?.role),
            condition: mh.status || undefined,
            // ITR patient profile (from the saved ITR snapshot)
            lastName: itr.lastName || profileInfo?.lastName || undefined,
            firstName: itr.firstName || profileInfo?.firstName || undefined,
            middleName: itr.middleName || profileInfo?.middleName || undefined,
            suffix: itr.suffix || profileInfo?.suffix || undefined,
            birthday:
              itr.birthday || fmtDate(profileInfo?.birthdate) || undefined,
            age: itr.age || undefined,
            sex: itr.sex || profileInfo?.sex || undefined,
            civilStatus: itr.civilStatus || undefined,
            birthplace: itr.birthplace || undefined,
            bloodType: itr.bloodType || profileInfo?.bloodType || undefined,
            religion: itr.religion || profileInfo?.religion || undefined,
            contactNumber:
              itr.contactNumber || profileInfo?.phoneNumber || undefined,
            address:
              itr.address ||
              [
                profileInfo?.houseNumber,
                profileInfo?.purok,
                profileInfo?.barangay,
                profileInfo?.city,
                profileInfo?.province,
              ]
                .filter(Boolean)
                .join(', ') ||
              undefined,
            fathersName:
              itr.fathersName || profileInfo?.fathersName || undefined,
            mothersName:
              itr.mothersName || profileInfo?.mothersName || undefined,
            spouseName: itr.spouseName || undefined,
            maidenName: itr.maidenName || undefined,
            educationalAttainment: itr.educationalAttainment || undefined,
            philHealthNo: itr.philHealthNo || undefined,
            memberName: itr.memberName || undefined,
            memberBirthday: itr.memberBirthday || undefined,
            memberDependent: itr.memberDependent || undefined,
            familyMemberRole: itr.familyMemberRole || undefined,
            // Female patient health
            ageOfMenarche: itr.ageOfMenarche || undefined,
            lmp: itr.lmp || undefined,
            gravidity: itr.gravidity || undefined,
            edc: itr.edc || undefined,
            parityFullTerm: itr.parityFullTerm || undefined,
            parityPreterm: itr.parityPreterm || undefined,
            parityAbortion: itr.parityAbortion || undefined,
            parityLivebirth: itr.parityLivebirth || undefined,
            // Consent
            consentPatientName: itr.consentPatientName || undefined,
            consentDate: itr.consentDate || undefined,
            consentRepresentative: itr.consentRepresentative || undefined,
            // Vital signs
            bloodPressure: mh.bloodPressure || undefined,
            heartRate: mh.heartRate != null ? String(mh.heartRate) : undefined,
            respiratoryRate:
              mh.respiratoryRate != null
                ? String(mh.respiratoryRate)
                : undefined,
            temperature:
              mh.temperature != null ? String(mh.temperature) : undefined,
            oxygenLevel:
              mh.oxygenLevel != null ? String(mh.oxygenLevel) : undefined,
            height: mh.height != null ? String(mh.height) : undefined,
            weight: mh.weight != null ? String(mh.weight) : undefined,
            // Clinical info
            chiefComplaints: mh.chiefComplaints || undefined,
            diagnosis: mh.diagnosis,
            medications: mh.medications || undefined,
            prescription: mh.recommendation || undefined,
            // Child birth details
            birthLength:
              mh.birthLength != null ? String(mh.birthLength) : undefined,
            birthWeight:
              mh.birthWeight != null ? String(mh.birthWeight) : undefined,
            placeDelivered: mh.placeDelivered || undefined,
            typeOfDelivery: mh.typeOfDelivery || undefined,
            attendantAtBirth: mh.attendantAtBirth || undefined,
            // Immunization records
            immBcg: fmtDate(mh.immBcg),
            immHepab24: fmtDate(mh.immHepab24),
            immHepab24plus: fmtDate(mh.immHepab24plus),
            immPenta1: fmtDate(mh.immPenta1),
            immPenta2: fmtDate(mh.immPenta2),
            immPenta3: fmtDate(mh.immPenta3),
            immOpv1: fmtDate(mh.immOpv1),
            immOpv2: fmtDate(mh.immOpv2),
            immOpv3: fmtDate(mh.immOpv3),
            immRota1: fmtDate(mh.immRota1),
            immRota2: fmtDate(mh.immRota2),
            immPcv1: fmtDate(mh.immPcv1),
            immPcv2: fmtDate(mh.immPcv2),
            immPcv3: fmtDate(mh.immPcv3),
            immMcv1: fmtDate(mh.immMcv1),
            immMcv2: fmtDate(mh.immMcv2),
            immHepab2: fmtDate(mh.immHepab2),
            immHepab3: fmtDate(mh.immHepab3),
            immHepaa: fmtDate(mh.immHepaa),
            immPneumonia: fmtDate(mh.immPneumonia),
            immInfluenza: fmtDate(mh.immInfluenza),
            immOthers: fmtDate(mh.immOthers),
            icon: iconForService(a.service?.name ?? ''),
          }
        })

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
