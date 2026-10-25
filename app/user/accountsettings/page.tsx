import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { getMe, getMyProfile } from '@/lib/actions/me'
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

  const role = session.user.role as string | undefined
  if (role === 'SUPERADMIN' || role === 'ADMIN') redirect('/admin')
  if (role === 'MEDSTAFF' || role === 'NURSE') redirect('/staff')
  if (role !== 'USER') redirect('/login')

  const me = await getMe()
  const profileResult = await getMyProfile()
  const profile = profileResult.profile
  const user = me?.payload ?? {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    role: role ?? 'USER',
    image: session.user.image ?? null,
  }
  user.name =
    [
      profile?.firstName,
      profile?.middleName,
      profile?.lastName,
      profile?.suffix,
    ]
      .filter((value) => value && value.trim().toUpperCase() !== 'N/A')
      .join(' ')
      .trim() || user.name
  user.email = profile?.email || user.email

  return (
    <>
      <section className="min-h-dvh bg-slate-50 dark:bg-[#0b1220] lg:ml-[288px]">
        <PatientHeader />

        <div className="mx-auto max-w-7xl pb-32">
          <main className="flex flex-col gap-5 px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6 xl:px-10">
            <SettingsPanel user={user} />
          </main>
        </div>
      </section>

      <PatientSidebar />
      <PatientBottomNavigation />
    </>
  )
}
