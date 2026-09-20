import { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'User Management | PRAMIS',
}

export default function UserManagementLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}