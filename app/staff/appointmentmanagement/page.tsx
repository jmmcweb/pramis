import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'
import { getScheduleAppointments } from '@/lib/actions/appointment'
import { getArchiveAppointments } from '@/lib/actions/appointmentManagement'
import { getServices } from '@/lib/actions/service'
import { todayISO } from '@/config/appointment'
import AppointmentManagementClient from '@/components/staff/AppointmentManagementClient'

export const metadata: Metadata = {
  title: 'Appointment Management | Meditrack',
  description: "Manage today's schedule, upcoming visits, archives and walk-ins",
}

const STAFF_ROLES = ['STAFF', 'MIDWIFE']

export default async function StaffAppointmentManagementPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  if (!STAFF_ROLES.includes((session.user.role as string) ?? '')) {
    redirect('/staff')
  }

  const [scheduleRes, archiveRes, servicesRes] = await Promise.all([
    getScheduleAppointments(),
    getArchiveAppointments(),
    getServices(),
  ])

  const today = todayISO()
  const ACTIVE_TODAY = ['PENDING', 'APPROVED', 'COMPLETED']
  const todays = scheduleRes.appointments.filter(
    a => a.dateISO === today && ACTIVE_TODAY.includes(a.status),
  )
  const upcoming = scheduleRes.appointments.filter(
    a => a.dateISO > today && ['PENDING', 'APPROVED'].includes(a.status),
  )

  return (
    <AppointmentManagementClient
      todays={todays}
      upcoming={upcoming}
      archive={archiveRes.appointments}
      services={servicesRes.services
        .filter(s => s.availability !== false)
        .map(s => ({ id: s.id ?? '', title: s.title }))}
    />
  )
}