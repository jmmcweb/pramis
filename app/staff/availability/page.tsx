import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'
import StaffAvailabilityPageClient from '@/components/staff/StaffAvailabilityPageClient'

export const metadata: Metadata = {
  title: 'My Availability | PRAMIS',
  description: 'Manage your day-level availability for patient appointments',
}

const STAFF_ROLES = ['SUPERADMIN', 'ADMIN', 'MEDSTAFF']

export default async function StaffAvailabilityPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  if (!STAFF_ROLES.includes((session.user.role as string) ?? '')) {
    redirect('/staff')
  }

  return <StaffAvailabilityPageClient />
}
