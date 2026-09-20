import type { Metadata } from 'next'
import Homepage from '@/app/admin/Homepage'

export const metadata: Metadata = {
  title: 'Dashboard | PRAMIS',
}

export default function AdminHome() {
  return <Homepage />
}
