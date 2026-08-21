import { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Approval Request | Meditrack',
}

export default function ApprovalRequestLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}