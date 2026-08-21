import { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Queueing | Meditrack',
}

export default function PatientRecordLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
