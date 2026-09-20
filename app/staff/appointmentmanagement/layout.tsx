import { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Appointment Management | PRAMIS',
}

export default function AppointmentManagementLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
