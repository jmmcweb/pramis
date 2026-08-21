import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
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

  // User-only: admins/staff are sent to their own dashboards.
  const role = session.user.role as string | undefined
  if (role === 'SUPERADMIN' || role === 'ADMIN') redirect('/admin')
  if (role === 'STAFF' || role === 'NURSE') redirect('/staff')
  if (role !== 'USER') redirect('/login')

  return (
    <>
      <section
        className="min-h-dvh bg-cover bg-center bg-no-repeat lg:ml-[360px] bg-[url('/purplebackground.png')] dark:bg-none dark:bg-[#050617]"
      >
        <PatientHeader />

        <div className="max-w-md mx-auto pb-32 md:max-w-3xl lg:max-w-5xl xl:max-w-6xl lg:px-12 lg:pt-5">
          <NotificationCenter />
        </div>
      </section>

      <PatientSidebar />
      <PatientBottomNavigation />
    </>
  )
}
