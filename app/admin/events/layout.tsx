import { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Events and Services | PRAMIS',
}

export default function EventsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
