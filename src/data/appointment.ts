import {
  Baby,
  FlaskConical,
  HeartPulse,
  Smile,
  Stethoscope,
  Syringe,
} from 'lucide-react'

export const serviceIcons = {
  stethoscope: Stethoscope,
  syringe: Syringe,
  'heart-pulse': HeartPulse,
  smile: Smile,
  baby: Baby,
  'flask-conical': FlaskConical,
} as const

export type ServiceIconKey = keyof typeof serviceIcons

export type Service = {
  id: string
  name: string
  description: string
  staffName: string
  role: string
  healthCenter: string
  schedule: string
  slots: string
  available: boolean
  icon: ServiceIconKey
}

export const services: Service[] = [
  {
    id: 'general-consultation',
    name: 'General Consultation',
    description:
      'A basic consultation is about listening, examining, and guiding your health care.',
    staffName: 'Dr. Juan Dela Cruz',
    role: 'Physician',
    healthCenter: 'Brgy. Sumapang Matanda Health Center',
    schedule: 'Mon - Fri, 8:00 AM - 5:00 PM',
    slots: '3 of 5 slots left',
    available: true,
    icon: 'stethoscope',
  },
  {
    id: 'vaccination',
    name: 'Vaccination',
    description:
      'Protect yourself and your family with scheduled vaccinations and boosters.',
    staffName: 'Ms. Maria Santos',
    role: 'Nurse',
    healthCenter: 'Brgy. Sumapang Matanda Health Center',
    schedule: 'Mon & Wed, 8:00 AM - 11:00 AM',
    slots: '2 of 4 slots left',
    available: true,
    icon: 'syringe',
  },
  {
    id: 'blood-pressure-monitoring',
    name: 'Blood Pressure Monitoring',
    description:
      'Regular monitoring helps keep your blood pressure within a healthy range.',
    staffName: 'Mrs. Ana Reyes',
    role: 'Midwife',
    healthCenter: 'Brgy. Sumapang Matanda Health Center',
    schedule: 'Tue & Thu, 1:00 PM - 4:00 PM',
    slots: 'All slots booked',
    available: false,
    icon: 'heart-pulse',
  },
  {
    id: 'dental-checkup',
    name: 'Dental Check-up',
    description:
      'Keep your smile healthy with routine dental examinations and cleanings.',
    staffName: 'Dr. Carlos Mendoza',
    role: 'Dentist',
    healthCenter: 'Brgy. Sumapang Matanda Health Center',
    schedule: 'Tue, 9:00 AM - 12:00 PM',
    slots: '4 of 6 slots left',
    available: true,
    icon: 'smile',
  },
  {
    id: 'pediatric-consultation',
    name: 'Pediatric Consultation',
    description:
      'Specialized care and check-ups for infants, children, and adolescents.',
    staffName: 'Dr. Ricardo Lim',
    role: 'Pediatrician',
    healthCenter: 'Brgy. Sumapang Matanda Health Center',
    schedule: 'Fri, 1:00 PM - 4:00 PM',
    slots: 'All slots booked',
    available: false,
    icon: 'baby',
  },
  {
    id: 'laboratory-tests',
    name: 'Laboratory Tests',
    description:
      'Convenient sample collection and testing for routine health screening.',
    staffName: 'Mr. Paolo Garcia',
    role: 'Laboratory Technician',
    healthCenter: 'Brgy. Sumapang Matanda Health Center',
    schedule: 'Mon - Sat, 6:00 AM - 10:00 AM',
    slots: '5 of 8 slots left',
    available: true,
    icon: 'flask-conical',
  },
]
