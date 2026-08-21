import { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Account Settings | Meditrack',
}

export default function AccountSettingsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
