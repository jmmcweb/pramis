import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { getMyNotifications } from '@/lib/actions/notifications'
import PatientHeader from '@/components/patient/Header'
import PatientBottomNavigation from '@/components/patient/PatientBottomNavigation'
import PatientSidebar from '@/components/patient/PatientSidebar'
import NotificationCenter from './NotificationCenter'

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'MediTrack notification center',
}

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const role = session.user.role as string | undefined
  if (role === 'SUPERADMIN' || role === 'ADMIN') redirect('/admin')
  if (role === 'MEDSTAFF' || role === 'NURSE') redirect('/staff')
  if (role !== 'USER') redirect('/login')

  const result = await getMyNotifications()

  return (
    <>
      <section
        className="min-h-dvh bg-slate-50 dark:bg-[#0b1220] lg:ml-[288px]"
      >
        <PatientHeader />

        <div className="mx-auto max-w-7xl px-4 pb-32 pt-4 sm:px-6 lg:px-8 lg:pt-6 xl:px-10">
          <NotificationCenter initialNotifications={result.notifications} />
        </div>
      </section>

      <PatientSidebar />
      <PatientBottomNavigation />
    </>
  )
}