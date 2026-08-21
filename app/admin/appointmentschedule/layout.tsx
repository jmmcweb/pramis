import { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Appointment Schedule | Meditrack',
}

export default function AppointmentScheduleLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}