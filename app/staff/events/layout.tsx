import { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Events | PRAMIS',
}

export default function EventsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
