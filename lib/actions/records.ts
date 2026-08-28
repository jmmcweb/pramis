'use server'

import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/actions/guard'
import type { MedicalRecord, PatientMember } from '@/src/data/records'
import type { ServiceIconKey } from '@/src/data/appointment'

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

function staffRoleLabel(role: string | null | undefined): string {
  if (role === 'ADMIN') return 'Admin'
  if (role === 'MIDWIFE') return 'Midwife'
  return 'Medical Staff'
}

function initialsOf(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export async function getMyMedicalRecords(): Promise<{
  success: boolean
  message: string
  members: PatientMember[]
}> {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Unauthorized', members: [] }
  }

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
        : p.familyMember?.name ?? 'Family Member'
      const relation = isSelf
        ? 'Account Holder'
        : p.familyMember?.relation ?? 'Family'

      const records: MedicalRecord[] = (p.appointments ?? [])
        .filter((a: any) => a.medicalHistory)
        .map((a: any) => {
          const mh = a.medicalHistory
          const staff = mh.checkedBy
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
            bloodPressure: mh.bloodPressure || undefined,
            oxygenLevel:
              mh.oxygenLevel != null ? String(mh.oxygenLevel) : undefined,
            height: mh.height != null ? String(mh.height) : undefined,
            weight: mh.weight != null ? String(mh.weight) : undefined,
            diagnosis: mh.diagnosis,
            prescription: mh.recommendation || 'No prescription',
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
    return { success: false, message: 'Failed to fetch medical records.', members: [] }
  }
}