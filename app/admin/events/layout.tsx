import { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Events and Services | Meditrack',
}

export default function EventsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
