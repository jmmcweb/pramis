import { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Patient Lists | Meditrack',
}

export default function ServicesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
