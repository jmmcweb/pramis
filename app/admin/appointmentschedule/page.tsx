import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'
import { getScheduleAppointments } from '@/lib/actions/appointment'
import { todayISO } from '@/config/appointment'
import AppointmentsScheduleClient from '@/components/admin/AppointmentsScheduleClient'

export const metadata: Metadata = {
  title: 'Appointment Schedule | PRAMIS',
  description: 'Manage scheduled patient appointments',
}

const STAFF_ROLES = ['SUPERADMIN', 'ADMIN', 'MEDSTAFF']

export default async function AppointmentSchedulePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  if (!STAFF_ROLES.includes((session.user.role as string) ?? '')) {
    redirect('/admin')
  }

  const result = await getScheduleAppointments()

  return (
    <AppointmentsScheduleClient
      appointments={result.appointments}
      todayISO={todayISO()}
    />
  )
}