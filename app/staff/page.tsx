import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { dayRange, todayISO } from '@/config/appointment'
import Homepage from '@/app/staff/Homepage'

export const metadata: Metadata = {
  title: 'Homepage | PRAMIS',
}

const STAFF_ROLES = ['MEDSTAFF', 'ADMIN', 'SUPERADMIN']

export default async function StaffHome() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  if (!STAFF_ROLES.includes((session.user.role as string) ?? '')) {
    redirect('/login')
  }

  const { start, end } = dayRange(todayISO())

  const [totalUsers, staffCount, patientRecords, todaySchedule, pendingRequests] =
    await Promise.all([
      prisma.user.count(),
      (prisma as any).staff.count(),
      (prisma as any).patient.count(),
      (prisma as any).appointment.count({
        where: {
          appointmentAt: { gte: start, lt: end },
          status: { in: ['PENDING', 'APPROVED', 'COMPLETED'] },
        },
      }),
      (prisma as any).appointment.count({
        where: { status: 'PENDING' },
      }),
    ])

  const fullName = session.user.name ?? 'Staff'
  const firstName = fullName.split(' ')[0] || 'Staff'

  return (
    <Homepage
      firstName={firstName}
      stats={{ totalUsers, staff: staffCount, todaySchedule, pendingRequests, patientRecords }}
    />
  )
}
