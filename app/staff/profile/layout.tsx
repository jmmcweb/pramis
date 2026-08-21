import { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Profile | Meditrack',
}

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
