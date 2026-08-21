import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { getAccountAccess } from '@/lib/actions/guard'
import PatientHeader from '@/components/patient/Header'
import AppointmentOverviewCard from '@/components/patient/AppointmentOverviewCard'
import ServiceListSection from '@/components/patient/ServiceListSection'
import AccountStatusScreen from '@/components/patient/AccountStatusScreen'
import PatientBottomNavigation from '@/components/patient/PatientBottomNavigation'
import PatientSidebar from '@/components/patient/PatientSidebar'

export const metadata: Metadata = {
  title: 'Appointments',
  description: 'MediTrack appointment booking',
}

export default async function AppointmentPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  // Account approval gate: PENDING/REJECTED users cannot access appointments.
  const access = await getAccountAccess()
  if (!access) redirect('/login')
  const allowed = access.approved

  return (
    <>
      <section
        className="min-h-dvh bg-cover bg-center bg-no-repeat lg:ml-[360px] bg-[url('/purplebackground.png')] dark:bg-none dark:bg-[#050617]"
      >
        <PatientHeader />

        <div className="max-w-md mx-auto pb-32 md:max-w-3xl lg:max-w-5xl xl:max-w-6xl">
          <main className="px-4 pt-4 flex flex-col gap-5 lg:px-12 lg:pt-5">
            {allowed ? (
              <>
                <AppointmentOverviewCard />
                <ServiceListSection />
              </>
            ) : (
              <AccountStatusScreen status={access.status} />
            )}
          </main>
        </div>
      </section>

      {access.status !== 'REJECTED' && (
        <>
          <PatientSidebar />
          <PatientBottomNavigation />
        </>
      )}
    </>
  )
}
