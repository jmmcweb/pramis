

import type { MedicalRecord } from '@/src/data/records'
import type { ServiceIconKey } from '@/src/data/appointment'

// Service name → timeline / PDF icon key.
export function iconForService(name: string): ServiceIconKey {
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

// Staff role label printed on the ITR ("Admin" vs "Medical Staff").
export function staffRoleLabel(role: string | null | undefined): string {
  if (role === 'ADMIN') return 'Admin'
  return 'Medical Staff'
}

// Formats a date value as YYYY-MM-DD for the ITR immunization columns.
const fmtDate = (d: unknown): string | undefined => {
  if (!d) return undefined
  const date = new Date(d as string | number | Date)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString().slice(0, 10)
}

// Patient demographics used as fallbacks when the saved ITR snapshot
// (MedicalHistory.itrData) does not carry a value.
export type RecordDemographics = {
  lastName?: string | null
  firstName?: string | null
  middleName?: string | null
  suffix?: string | null
  birthdate?: Date | string | null
  sex?: string | null
  bloodType?: string | null
  religion?: string | null
  phoneNumber?: string | null
  houseNumber?: string | null
  purok?: string | null
  barangay?: string | null
  city?: string | null
  province?: string | null
  fathersName?: string | null
  mothersName?: string | null
}

// Splits a stored patient name into ITR name parts. Handles the
// "LAST, First Middle" shape written by the patient list as well as a plain
// "First Middle Last" full name (patients registered at the desk have no
// profile row to read the names from).
export function splitFullName(raw?: string | null): {
  firstName?: string
  middleName?: string
  lastName?: string
} {
  const value = (raw ?? '').trim().replace(/\s+/g, ' ')
  if (!value) return {}

  if (value.includes(',')) {
    const [last, rest = ''] = value.split(',')
    const parts = rest.trim().split(' ').filter(Boolean)
    return {
      lastName: last.trim() || undefined,
      firstName: parts[0],
      middleName: parts.length > 1 ? parts.slice(1).join(' ') : undefined,
    }
  }

  const parts = value.split(' ').filter(Boolean)
  if (parts.length === 1) return { firstName: parts[0] }
  return {
    firstName: parts[0],
    middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : undefined,
    lastName: parts[parts.length - 1],
  }
}

export function buildMedicalRecord({
  mh,
  serviceName,
  profileInfo,
  fallbackName,
}: {
  mh: any
  serviceName?: string | null
  profileInfo?: RecordDemographics | null
  /** Patient display name, used when no name parts are available. */
  fallbackName?: string | null
}): MedicalRecord {
  const staff = mh?.checkedBy


  const itr: Record<string, string> =
    mh.itrData && typeof mh.itrData === 'object' && !Array.isArray(mh.itrData)
      ? (Object.fromEntries(
          Object.entries(mh.itrData as Record<string, unknown>).map(
            ([k, v]) => [k, v == null ? '' : String(v)],
          ),
        ) as Record<string, string>)
      : {}
  const base = profileInfo ?? {}

  const p: RecordDemographics =
    base.lastName || base.firstName
      ? base
      : { ...base, ...splitFullName(fallbackName) }

  return {
    id: mh.medhisid,
    date: new Date(mh.checkedDate).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    type: serviceName ?? 'Consultation',
    staffName: staff
      ? `${staff.firstName ?? ''} ${staff.lastName ?? ''}`.trim()
      : 'Health Staff',
    role: staffRoleLabel(staff?.role),
    condition: mh.status || undefined,
    // ITR patient profile (from the saved ITR snapshot)
    lastName: itr.lastName || p.lastName || undefined,
    firstName: itr.firstName || p.firstName || undefined,
    middleName: itr.middleName || p.middleName || undefined,
    suffix: itr.suffix || p.suffix || undefined,
    birthday: itr.birthday || fmtDate(p.birthdate) || undefined,
    age: itr.age || undefined,
    sex: itr.sex || p.sex || undefined,
    civilStatus: itr.civilStatus || undefined,
    birthplace: itr.birthplace || undefined,
    bloodType: itr.bloodType || p.bloodType || undefined,
    religion: itr.religion || p.religion || undefined,
    contactNumber:
      itr.mobileNumber || itr.contactNumber || p.phoneNumber || undefined,
    address:
      [itr.streetNumber, itr.purok, itr.barangay, itr.cityMun]
        .filter(Boolean)
        .join(', ') ||
      itr.address ||
      [p.houseNumber, p.purok, p.barangay, p.city, p.province]
        .filter(Boolean)
        .join(', ') ||
      undefined,
    fathersName: itr.fathersName || p.fathersName || undefined,
    mothersName:
      itr.mothersName ||
      [itr.mothersFirstName, itr.mothersMiddleName, itr.mothersLastName]
        .filter(Boolean)
        .join(' ') ||
      p.mothersName ||
      undefined,
    spouseName: itr.spouseName || undefined,
    maidenName: itr.maidenName || undefined,
    educationalAttainment: itr.educationalAttainment || undefined,
    // PhilHealth & Membership
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
    // Full ITR snapshot (adult template sections) for the PDF
    itr: Object.keys(itr).length ? itr : undefined,
    // Vital signs
    bloodPressure: mh.bloodPressure || undefined,
    heartRate: mh.heartRate != null ? String(mh.heartRate) : undefined,
    respiratoryRate:
      mh.respiratoryRate != null ? String(mh.respiratoryRate) : undefined,
    temperature: mh.temperature != null ? String(mh.temperature) : undefined,
    oxygenLevel: mh.oxygenLevel != null ? String(mh.oxygenLevel) : undefined,
    height: mh.height != null ? String(mh.height) : undefined,
    weight: mh.weight != null ? String(mh.weight) : undefined,
    // Clinical info
    chiefComplaints: mh.chiefComplaints || undefined,
    diagnosis: mh.diagnosis,
    medications: mh.medications || undefined,
    prescription: mh.recommendation || undefined,
    // Child birth details
    birthLength: mh.birthLength != null ? String(mh.birthLength) : undefined,
    birthWeight: mh.birthWeight != null ? String(mh.birthWeight) : undefined,
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
    icon: iconForService(serviceName ?? ''),
  }
}
