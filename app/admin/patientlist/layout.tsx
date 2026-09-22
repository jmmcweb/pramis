import { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Patient Lists | PRAMIS',
}

export default function ServicesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
