export type AppointmentSlot = {
  id: string // 'HH:mm' 24h start time, e.g. '08:00'
  label: string // display label, e.g. '8:00 AM - 9:00 AM'
}

// Services are offered in the morning only, so appointments can be booked
// between 8:00 AM and 12:00 PM, one hour per slot.
export const APPOINTMENT_SLOTS: AppointmentSlot[] = [
  { id: '08:00', label: '8:00 AM - 9:00 AM' },
  { id: '09:00', label: '9:00 AM - 10:00 AM' },
  { id: '10:00', label: '10:00 AM - 11:00 AM' },
  { id: '11:00', label: '11:00 AM - 12:00 PM' },
]

// The morning window advertised on service cards and used by service forms.
export const SERVICE_TIME_RANGE = '8:00am - 12:00pm'

// Labels kept for appointments that were booked before the schedule became
// morning-only, so their stored times still render readably.
const LEGACY_SLOT_LABELS: Record<string, string> = {
  '13:00': '1:00 PM - 2:00 PM',
  '14:00': '2:00 PM - 3:00 PM',
  '15:00': '3:00 PM - 4:00 PM',
  '16:00': '4:00 PM - 5:00 PM',
}

export const SLOT_CAPACITY = 10

export function isValidSlotId(slotId: string): boolean {
  return APPOINTMENT_SLOTS.some((slot) => slot.id === slotId)
}

export function getSlotLabel(slotId: string): string {
  return (
    APPOINTMENT_SLOTS.find((slot) => slot.id === slotId)?.label ??
    LEGACY_SLOT_LABELS[slotId] ??
    slotId
  )
}

// A service's advertised window must stay inside the morning schedule.
// Noon (12:00pm) is allowed; every other pm time falls outside 8:00 AM - 12:00 PM.
export function isMorningServiceTime(time: string | null | undefined): boolean {
  const value = (time || '').trim()
  if (!value) return false
  const withoutNoon = value.toLowerCase().replace(/12(?::00)?\s*pm/g, '')
  if (withoutNoon.includes('pm')) return false
  if (/\b(1[3-9]|2[0-3]):[0-5]\d\b/.test(withoutNoon)) return false
  return true
}

// Coerces any service time string to the 8:00 AM - 12:00 PM window so services
// can never advertise appointment slots outside the morning.
export function normalizeServiceTime(time: string | null | undefined): string {
  const value = (time || '').trim()
  return isMorningServiceTime(value) ? value : SERVICE_TIME_RANGE
}

export function normalizeSex(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase()
  if (normalized === 'male' || normalized === 'm') return 'Male'
  if (normalized === 'female' || normalized === 'f') return 'Female'
  return value?.trim() || ''
}

export function slotIdToDate(dateISO: string, slotId: string): Date {
  return new Date(`${dateISO}T${slotId}:00.000Z`)
}

export function todayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function dayRange(dateISO: string): { start: Date; end: Date } {
  const start = new Date(`${dateISO}T00:00:00.000Z`)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

export function isServiceAvailableOnDate(
  schedule: string | null | undefined,
  dateISO: string,
): boolean {
  const text = (schedule || 'Monday to Friday').toLowerCase()
  const dayNames = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]
  const day = new Date(`${dateISO}T00:00:00.000Z`).getUTCDay()
  if (text.includes('daily') || text.includes('every day')) return true

  const matches = dayNames
    .map((name, index) => ({ name, index }))
    .filter(
      ({ name }) => text.includes(name) || text.includes(name.slice(0, 3)),
    )
    .map(({ index }) => index)
  if (!matches.length) return day > 0 && day < 6

  if (matches.length >= 2 && /\bto\b|[-–]/.test(text)) {
    const start = matches[0]
    const end = matches[matches.length - 1]
    return start <= end
      ? day >= start && day <= end
      : day >= start || day <= end
  }
  return matches.includes(day)
}

export type ServiceView = {
  id: string
  name: string
  description: string
  schedule: string // e.g. 'Monday to Friday'
  time: string // e.g. '8:00am - 12:00pm'
  icon: string // emoji
  available: boolean
}

export type SlotAvailability = AppointmentSlot & {
  booked: number
  remaining: number
  status: 'available' | 'limited' | 'unavailable'
}

// A family member of the signed-in account, offered as a booking target.
export type FamilyMemberOption = {
  id: string
  name: string
  relation: string
}

export type MyAppointmentView = {
  id: string
  serviceName: string
  serviceIcon: string
  appointmentAtISO: string // YYYY-MM-DD
  appointmentAtTime: string // slot label
  status: string
  // Who the appointment is for: 'account user' or a family member's name.
  forName: string
}

// The post-consultation medical info already recorded for an appointment,
// if any. Numbers are pre-formatted as strings for display.
export type MedicalRecordSummary = {
  status: string
  bloodPressure: string
  oxygenLevel: string
  height: string
  weight: string
  heartRate: string
  respiratoryRate: string
  temperature: string
  chiefComplaints: string
  diagnosis: string
  medications: string
  recommendation: string
  // Child immunization records (date strings in YYYY-MM-DD format)
  immBcg: string
  immHepab24: string
  immHepab24plus: string
  immPenta1: string
  immPenta2: string
  immPenta3: string
  immOpv1: string
  immOpv2: string
  immOpv3: string
  immRota1: string
  immRota2: string
  immPcv1: string
  immPcv2: string
  immPcv3: string
  immMcv1: string
  immMcv2: string
  immHepab2: string
  immHepab3: string
  immHepaa: string
  immPneumonia: string
  immInfluenza: string
  immOthers: string
  // Child birth details
  placeDelivered: string
  placeDeliveredOthers: string
  typeOfDelivery: string
  birthLength: string
  birthWeight: string
  attendantAtBirth: string
  // Adult ITR (Individual Treatment Record) snapshot: demographics,
  // PhilHealth/member info, female-only section, consent signatures.
  itrData: Record<string, string> | null
}

// Basic patient identity info used to prefill the Adult ITR form.
// Available for account holders via their profile; family members may
// only have a name and phone number.
export type PatientItrInfo = {
  lastName: string
  firstName: string
  middleName: string
  suffix: string
  birthdate: string | null // YYYY-MM-DD or null when unknown
  sex: string // 'Male' | 'Female' | '' when unknown
  contactNumber: string
  address: string
  purok: string
  houseNumber: string
  barangay: string
  city: string
  email: string
  philHealthNo: string
  bloodType: string
  religion: string
  fathersName: string
  mothersName: string
}

export type ScheduleAppointmentView = {
  id: string
  patientName: string
  patientReference: string
  email: string
  serviceName: string
  dateISO: string // YYYY-MM-DD
  dateLabel: string
  timeLabel: string
  status: string
  // Basic identity info for prefilling the post-consultation ITR form.
  patientInfo: PatientItrInfo
  // True once staff saved the post-consultation medical info.
  hasMedicalRecord: boolean
  medicalRecord: MedicalRecordSummary | null
}

function isoDate(value: unknown): string | null {
  if (!value) return null
  const d = new Date(value as string)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

// Builds the PatientItrInfo prefill from an appointment row that includes
// `user.profile` and optionally `patient` / `familyMember` relations.
export function extractPatientItrInfo(row: any): PatientItrInfo {
  const profile = row?.user?.profile
  const familyMember = row?.familyMember
  if (familyMember) {
    const parts = String(familyMember.name || '')
      .trim()
      .split(/\s+/)
    return {
      lastName: parts.length > 1 ? parts[parts.length - 1] : '',
      firstName:
        parts.length > 1
          ? parts.slice(0, -1).join(' ')
          : familyMember.name || '',
      middleName: '',
      suffix: '',
      birthdate: isoDate(familyMember.birthdate ?? row?.patient?.birthdate),
      sex: normalizeSex(familyMember.sex || row?.patient?.sex),
      contactNumber: familyMember.phone || row?.patient?.phoneNumber || '',
      address:
        [
          familyMember.houseNumber,
          familyMember.purok,
          familyMember.barangay,
          familyMember.city,
          familyMember.province,
        ]
          .filter(Boolean)
          .join(', ') ||
        (row?.patient
          ? [
              row.patient.houseNumber,
              row.patient.purok,
              row.patient.barangay,
              row.patient.city,
              row.patient.province,
            ]
              .filter(Boolean)
              .join(', ')
          : ''),
      philHealthNo:
        familyMember.philHealthNo || row?.patient?.philHealthNo || '',
      bloodType: familyMember.bloodType || row?.patient?.bloodType || '',
      religion: familyMember.religion || row?.patient?.religion || '',
      fathersName: familyMember.fathersName || row?.patient?.fathersName || '',
      mothersName: familyMember.mothersName || row?.patient?.mothersName || '',
      purok: familyMember.purok || row?.patient?.purok || '',
      houseNumber: familyMember.houseNumber || row?.patient?.houseNumber || '',
      barangay: familyMember.barangay || row?.patient?.barangay || '',
      city: familyMember.city || row?.patient?.city || '',
      email: '',
    }
  }
  return {
    lastName: profile?.lastName || '',
    firstName: profile?.firstName || '',
    middleName: profile?.middleName || '',
    suffix: profile?.suffix || '',
    birthdate: isoDate(profile?.birthdate ?? row?.patient?.birthdate),
    sex: normalizeSex(profile?.sex || row?.patient?.sex),
    contactNumber: profile?.phoneNumber || '',
    address: profile
      ? [
          profile.houseNumber,
          profile.purok,
          profile.barangay,
          profile.city,
          profile.province,
        ]
          .filter(Boolean)
          .join(', ')
      : '',
    philHealthNo: profile?.philHealthNo || '',
    bloodType: profile?.bloodType || row?.patient?.bloodType || '',
    religion: profile?.religion || row?.patient?.religion || '',
    fathersName: profile?.fathersName || row?.patient?.fathersName || '',
    mothersName: profile?.mothersName || row?.patient?.mothersName || '',
    purok: profile?.purok || row?.patient?.purok || '',
    houseNumber: profile?.houseNumber || row?.patient?.houseNumber || '',
    barangay: profile?.barangay || row?.patient?.barangay || '',
    city: profile?.city || row?.patient?.city || '',
    email: profile?.email || '',
  }
}

// Converts a MedicalHistory row into the display summary, including the
// Adult ITR clinical fields (HR, RR, temp, chief complaints, medications).
export function toMedicalRecordSummary(mh: any): MedicalRecordSummary {
  const itr =
    mh?.itrData && typeof mh.itrData === 'object' && !Array.isArray(mh.itrData)
      ? (Object.fromEntries(
          Object.entries(mh.itrData as Record<string, unknown>).map(
            ([k, v]) => [k, v == null ? '' : String(v)],
          ),
        ) as Record<string, string>)
      : null
  // Helper to format date to YYYY-MM-DD string
  const dateStr = (d: any) => {
    if (!d) return ''
    const date = new Date(d)
    if (Number.isNaN(date.getTime())) return ''
    return date.toISOString().slice(0, 10)
  }
  return {
    status: mh?.status ?? '',
    bloodPressure: mh?.bloodPressure ?? '',
    oxygenLevel: mh?.oxygenLevel != null ? String(mh.oxygenLevel) : '',
    height: mh?.height != null ? String(mh.height) : '',
    weight: mh?.weight != null ? String(mh.weight) : '',
    heartRate: mh?.heartRate != null ? String(mh.heartRate) : '',
    respiratoryRate:
      mh?.respiratoryRate != null ? String(mh.respiratoryRate) : '',
    temperature: mh?.temperature != null ? String(mh.temperature) : '',
    chiefComplaints: mh?.chiefComplaints ?? '',
    diagnosis: mh?.diagnosis ?? '',
    medications: mh?.medications ?? '',
    recommendation: mh?.recommendation ?? '',
    // Child immunization records
    immBcg: dateStr(mh?.immBcg),
    immHepab24: dateStr(mh?.immHepab24),
    immHepab24plus: dateStr(mh?.immHepab24plus),
    immPenta1: dateStr(mh?.immPenta1),
    immPenta2: dateStr(mh?.immPenta2),
    immPenta3: dateStr(mh?.immPenta3),
    immOpv1: dateStr(mh?.immOpv1),
    immOpv2: dateStr(mh?.immOpv2),
    immOpv3: dateStr(mh?.immOpv3),
    immRota1: dateStr(mh?.immRota1),
    immRota2: dateStr(mh?.immRota2),
    immPcv1: dateStr(mh?.immPcv1),
    immPcv2: dateStr(mh?.immPcv2),
    immPcv3: dateStr(mh?.immPcv3),
    immMcv1: dateStr(mh?.immMcv1),
    immMcv2: dateStr(mh?.immMcv2),
    immHepab2: dateStr(mh?.immHepab2),
    immHepab3: dateStr(mh?.immHepab3),
    immHepaa: dateStr(mh?.immHepaa),
    immPneumonia: dateStr(mh?.immPneumonia),
    immInfluenza: dateStr(mh?.immInfluenza),
    immOthers: dateStr(mh?.immOthers),
    // Child birth details
    placeDelivered: mh?.placeDelivered ?? '',
    placeDeliveredOthers: mh?.placeDeliveredOthers ?? '',
    typeOfDelivery: mh?.typeOfDelivery ?? '',
    birthLength: mh?.birthLength != null ? String(mh.birthLength) : '',
    birthWeight: mh?.birthWeight != null ? String(mh.birthWeight) : '',
    attendantAtBirth: mh?.attendantAtBirth ?? '',
    itrData: itr,
  }
}
