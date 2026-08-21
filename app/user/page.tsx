import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { getAccountAccess } from '@/lib/actions/guard'
import PatientHeader from '@/components/patient/Header'
import AppointmentCard from '@/components/patient/AppointmentCard'
import EventCard from '@/components/patient/EventCard'
import ServicesSection from '@/components/patient/ServicesSection'
import StaffList from '@/components/patient/StaffList'
import ApprovalBanner from '@/components/patient/ApprovalBanner'
import AccountStatusScreen from '@/components/patient/AccountStatusScreen'
import PatientBottomNavigation from '@/components/patient/PatientBottomNavigation'
import PatientSidebar from '@/components/patient/PatientSidebar'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'MediTrack patient dashboard',
}

export default async function Dashboard() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  // Account approval gate: PENDING users see their status + allowed features;
  // REJECTED users see the verification-failed screen.
  const access = await getAccountAccess()
  if (!access) redirect('/login')

  const isRejected = access.status === 'REJECTED'

  return (
    <>
      <section
        className="min-h-dvh bg-cover bg-center bg-no-repeat lg:ml-[360px] bg-[url('/purplebackground.png')] dark:bg-none dark:bg-[#050617]"
      >
        <PatientHeader />

        <div className="max-w-md mx-auto pb-32 md:max-w-3xl lg:max-w-5xl xl:max-w-6xl">
          <main className="px-4 pt-4 flex flex-col gap-5 lg:px-12 lg:pt-5">
            {isRejected ? (
              <AccountStatusScreen status={access.status} showSignOut />
            ) : (
              <>
                <h1 className="text-[40px] sm:text-[52px] lg:text-[68px] text-[#1d4662] dark:text-[#F9FAFB] my-[14px] text-left">
                  Hello, {session.user.name ?? 'there'}!
                </h1>
                <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:items-start">
                  <div className="flex flex-col gap-5 min-w-0">
                    {!access.approved && <ApprovalBanner />}
                    {access.approved && <AppointmentCard />}
                    <StaffList />
                  </div>
                  <div className="flex flex-col gap-5 min-w-0">
                    {access.approved && <ServicesSection />}
                    <EventCard />
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </section>

      {!isRejected && (
        <>
          <PatientSidebar />
          <PatientBottomNavigation />
        </>
      )}
    </>
  )
}
