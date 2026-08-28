export type AppointmentSlot = {
  id: string // 'HH:mm' 24h start time, e.g. '08:00'
  label: string // display label, e.g. '8:00 AM - 9:00 AM'
}

export const APPOINTMENT_SLOTS: AppointmentSlot[] = [
  { id: '08:00', label: '8:00 AM - 9:00 AM' },
  { id: '09:00', label: '9:00 AM - 10:00 AM' },
  { id: '10:00', label: '10:00 AM - 11:00 AM' },
  { id: '11:00', label: '11:00 AM - 12:00 PM' },
  { id: '13:00', label: '1:00 PM - 2:00 PM' },
  { id: '14:00', label: '2:00 PM - 3:00 PM' },
  { id: '15:00', label: '3:00 PM - 4:00 PM' },
  { id: '16:00', label: '4:00 PM - 5:00 PM' },
]


export const SLOT_CAPACITY = 10

export function isValidSlotId(slotId: string): boolean {
  return APPOINTMENT_SLOTS.some((slot) => slot.id === slotId)
}

export function getSlotLabel(slotId: string): string {
  return (
    APPOINTMENT_SLOTS.find((slot) => slot.id === slotId)?.label ?? slotId
  )
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


export type ServiceView = {
  id: string
  name: string
  description: string
  schedule: string // e.g. 'Monday to Friday'
  time: string // e.g. '8:00am - 5:00pm'
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
  diagnosis: string
  recommendation: string
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
  // True once staff saved the post-consultation medical info.
  hasMedicalRecord: boolean
  medicalRecord: MedicalRecordSummary | null
}
