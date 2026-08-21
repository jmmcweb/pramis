import type { ServiceIconKey } from './appointment'

export type MedicalRecord = {
  id: string
  date: string
  type: string
  staffName: string
  role: string
  diagnosis: string
  prescription: string
  icon: ServiceIconKey
}

export type PatientMember = {
  id: string
  name: string
  relation: string
  initials: string
  birthdate?: string
  records: MedicalRecord[]
}

const ownRecords: MedicalRecord[] = [
  {
    id: 'rec-1',
    date: 'March 10, 2026',
    type: 'Basic Consultation',
    staffName: 'Ms. Vivianne Hernandez',
    role: 'Midwife',
    diagnosis: 'Type 2 Diabetes',
    prescription: 'Metformin 500mg',
    icon: 'stethoscope',
  },
  {
    id: 'rec-2',
    date: 'February 03, 2026',
    type: 'Consultation',
    staffName: 'Dr. Ron Santos',
    role: 'Physician',
    diagnosis: 'Influenza',
    prescription: 'Amoxicillin 500mg',
    icon: 'stethoscope',
  },
  {
    id: 'rec-3',
    date: 'January 15, 2026',
    type: 'Vaccination',
    staffName: 'Ms. Maria Santos',
    role: 'Nurse',
    diagnosis: 'Routine Immunization',
    prescription: 'No prescription',
    icon: 'syringe',
  },
  {
    id: 'rec-4',
    date: 'December 20, 2025',
    type: 'Dental Check-up',
    staffName: 'Dr. Carlos Mendoza',
    role: 'Dentist',
    diagnosis: 'Mild Gingivitis',
    prescription: 'Chlorhexidine mouthwash',
    icon: 'smile',
  },
  {
    id: 'rec-5',
    date: 'November 05, 2025',
    type: 'Laboratory Test',
    staffName: 'Mr. Paolo Garcia',
    role: 'Laboratory Technician',
    diagnosis: 'Normal CBC Results',
    prescription: 'Multivitamins',
    icon: 'flask-conical',
  },
]

const mariaRecords: MedicalRecord[] = [
  {
    id: 'rec-m1',
    date: 'January 20, 2026',
    type: 'Pediatric Consultation',
    staffName: 'Dr. Ricardo Lim',
    role: 'Pediatrician',
    diagnosis: 'Acute Bronchitis',
    prescription: 'Salbutamol syrup',
    icon: 'baby',
  },
  {
    id: 'rec-m2',
    date: 'December 05, 2025',
    type: 'Vaccination',
    staffName: 'Ms. Maria Santos',
    role: 'Nurse',
    diagnosis: 'Routine Immunization',
    prescription: 'No prescription',
    icon: 'syringe',
  },
  {
    id: 'rec-m3',
    date: 'October 18, 2025',
    type: 'Basic Consultation',
    staffName: 'Ms. Vivianne Hernandez',
    role: 'Midwife',
    diagnosis: 'Upper Respiratory Tract Infection',
    prescription: 'Paracetamol',
    icon: 'stethoscope',
  },
]

const pedroRecords: MedicalRecord[] = [
  {
    id: 'rec-p1',
    date: 'February 14, 2026',
    type: 'Pediatric Consultation',
    staffName: 'Dr. Ricardo Lim',
    role: 'Pediatrician',
    diagnosis: 'Otitis Media',
    prescription: 'Amoxicillin suspension',
    icon: 'baby',
  },
  {
    id: 'rec-p2',
    date: 'November 22, 2025',
    type: 'Vaccination',
    staffName: 'Ms. Maria Santos',
    role: 'Nurse',
    diagnosis: 'Routine Immunization',
    prescription: 'No prescription',
    icon: 'syringe',
  },
]

const anaRecords: MedicalRecord[] = [
  {
    id: 'rec-a1',
    date: 'February 20, 2026',
    type: 'Blood Pressure Monitoring',
    staffName: 'Mrs. Ana Reyes',
    role: 'Midwife',
    diagnosis: 'Hypertension',
    prescription: 'Amlodipine 5mg',
    icon: 'heart-pulse',
  },
  {
    id: 'rec-a2',
    date: 'September 08, 2025',
    type: 'Basic Consultation',
    staffName: 'Dr. Ron Santos',
    role: 'Physician',
    diagnosis: 'Osteoarthritis',
    prescription: 'Meloxicam',
    icon: 'stethoscope',
  },
]

export const patient: PatientMember = {
  id: 'me',
  name: 'Juan Dela Cruz',
  relation: 'Account Holder',
  initials: 'JD',
  records: ownRecords,
}

export const familyMembers: PatientMember[] = [
  { id: 'maria', name: 'Maria Dela Cruz', relation: 'Daughter', initials: 'MD', records: mariaRecords },
  { id: 'pedro', name: 'Pedro Dela Cruz', relation: 'Son', initials: 'PD', records: pedroRecords },
  { id: 'ana', name: 'Ana Dela Cruz', relation: 'Grandmother', initials: 'AD', records: anaRecords },
]
