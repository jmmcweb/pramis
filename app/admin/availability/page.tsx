import type { Metadata } from 'next'
import AvailabilityPageClient from '@/components/admin/AvailabilityPageClient'

export const metadata: Metadata = {
  title: 'Midwife Availability | PRAMIS',
  description: 'Manage midwife day-level availability for appointment slots',
}

export default function AvailabilityPage() {
  return <AvailabilityPageClient />
}
