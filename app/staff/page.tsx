import type { Metadata } from 'next'
import Homepage from '@/app/staff/Homepage'

export const metadata: Metadata = {
  title: 'Homepage | Meditrack',
}

export default function StaffHome() {
  return <Homepage />
}
