import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { getMe } from '@/lib/actions/me'
import PatientHeader from '@/components/patient/Header'
import PatientBottomNavigation from '@/components/patient/PatientBottomNavigation'
import PatientSidebar from '@/components/patient/PatientSidebar'
import SettingsPanel from './SettingsPanel'

export const metadata: Metadata = {
  title: 'Account Settings',
  description: 'MediTrack account settings',
}

export default async function AccountSettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  // User-only: admins/staff are sent to their own dashboards.
  const role = session.user.role as string | undefined
  if (role === 'SUPERADMIN' || role === 'ADMIN') redirect('/admin')
  if (role === 'STAFF' || role === 'NURSE') redirect('/staff')
  if (role !== 'USER') redirect('/login')

  // Fetch the real user from the DB; fall back to the session claims.
  const me = await getMe()
  const user = me?.payload ?? {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    role: role ?? 'USER',
    image: session.user.image ?? null,
  }

  return (
    <>
      <section
        className="min-h-dvh bg-cover bg-center bg-no-repeat lg:ml-[360px] bg-[url('/purplebackground.png')] dark:bg-none dark:bg-[#050617]"
      >
        <PatientHeader />

        <div className="max-w-md mx-auto pb-32 md:max-w-3xl lg:max-w-5xl xl:max-w-6xl">
          <main className="px-4 pt-4 flex flex-col gap-5 lg:px-12 lg:pt-5">
            <SettingsPanel user={user} />
          </main>
        </div>
      </section>

      <PatientSidebar />
      <PatientBottomNavigation />
    </>
  )
}
