import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'
import { getTodayQueues } from '@/lib/actions/queue'
import { getServices } from '@/lib/actions/service'
import QueueingClient from '@/components/admin/QueueingClient'

export const metadata: Metadata = {
  title: 'Queueing | Meditrack',
  description: "Live queue board for today's visits, walk-ins and priority patients",
}

const STAFF_ROLES = ['SUPERADMIN', 'ADMIN', 'STAFF', 'MIDWIFE']

export default async function PatientRecordPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  if (!STAFF_ROLES.includes((session.user.role as string) ?? '')) {
    redirect('/admin')
  }

  const [queuesRes, servicesRes] = await Promise.all([
    getTodayQueues(),
    getServices(),
  ])

  return (
    <QueueingClient
      queues={queuesRes.queues}
      services={servicesRes.services
        .filter(s => s.availability !== false)
        .map(s => ({ id: s.id ?? '', title: s.title }))}
    />
  )
}