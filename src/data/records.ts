import type { ServiceIconKey } from './appointment'

// Type definition for a medical record, which includes details about the appointment, diagnosis, and prescription.
export type MedicalRecord = {
  id: string
  date: string
  type: string
  staffName: string
  role: string
  condition?: string
  bloodPressure?: string
  oxygenLevel?: string // %
  height?: string // cm
  weight?: string // kg
  diagnosis: string
  prescription: string
  icon: ServiceIconKey
}

// Type definition for a patient member, which includes personal details and a list of medical records.
export type PatientMember = {
  id: string
  name: string
  relation: string
  initials: string
  birthdate?: string
  records: MedicalRecord[]
}