import { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Services | Meditrack',
}

export default function ServicesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
