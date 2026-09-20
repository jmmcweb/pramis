import { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Services | PRAMIS',
}

export default function ServicesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
