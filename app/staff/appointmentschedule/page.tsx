import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'
import { getScheduleAppointments } from '@/lib/actions/appointment'
import AppointmentsScheduleClient from '@/components/staff/AppointmentsScheduleClient'

export const metadata: Metadata = {
  title: 'Appointment Schedule | PRAMIS',
  description: 'Review pending patient appointments',
}

const STAFF_ROLES = ['MEDSTAFF']

export default async function StaffAppointmentSchedulePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  if (!STAFF_ROLES.includes((session.user.role as string) ?? '')) {
    redirect('/staff')
  }

  const result = await getScheduleAppointments()

  return <AppointmentsScheduleClient appointments={result.appointments} />
}
