import type { ServiceIconKey } from './appointment'

// Type definition for a medical record, which includes details about the appointment, diagnosis, and prescription.
// Aligned with the ITR (Individual Treatment Record) structure.
export type MedicalRecord = {
  id: string
  date: string
  type: string
  staffName: string
  role: string
  condition?: string
  // Vital signs
  bloodPressure?: string
  heartRate?: string
  respiratoryRate?: string
  temperature?: string
  oxygenLevel?: string // %
  height?: string // cm
  weight?: string // kg
  // Clinical info
  chiefComplaints?: string
  diagnosis: string
  medications?: string
  prescription?: string
  // Personal information from ITR
  lastName?: string
  firstName?: string
  middleName?: string
  suffix?: string
  birthday?: string
  age?: string
  sex?: string
  birthplace?: string
  bloodType?: string
  fathersName?: string
  mothersName?: string
  address?: string
  contactNumber?: string
  religion?: string
  spouseName?: string
  maidenName?: string
  civilStatus?: string
  educationalAttainment?: string
  // PhilHealth & Membership
  philHealthNo?: string
  memberName?: string
  memberBirthday?: string
  memberDependent?: string
  familyMemberRole?: string
  // Female Patient Health
  ageOfMenarche?: string
  lmp?: string
  gravidity?: string
  edc?: string
  parityFullTerm?: string
  parityPreterm?: string
  parityAbortion?: string
  parityLivebirth?: string
  // Consent
  consentPatientName?: string
  consentDate?: string
  consentRepresentative?: string
  // Child-specific fields
  birthLength?: string
  birthWeight?: string
  placeDelivered?: string
  placeDeliveredOthers?: string
  typeOfDelivery?: string
  attendantAtBirth?: string
  // Immunization records
  immBcg?: string
  immHepab24?: string
  immHepab24plus?: string
  immPenta1?: string
  immPenta2?: string
  immPenta3?: string
  immOpv1?: string
  immOpv2?: string
  immOpv3?: string
  immRota1?: string
  immRota2?: string
  immPcv1?: string
  immPcv2?: string
  immPcv3?: string
  immMcv1?: string
  immMcv2?: string
  immHepab2?: string
  immHepab3?: string
  immHepaa?: string
  immPneumonia?: string
  immInfluenza?: string
  immOthers?: string
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