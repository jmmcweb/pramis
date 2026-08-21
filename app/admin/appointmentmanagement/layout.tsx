import { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Analytics | Meditrack',
}

export default function AppointmentManagementLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
