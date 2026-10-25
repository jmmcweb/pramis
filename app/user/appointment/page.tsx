import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { getAccountAccess } from '@/lib/actions/guard'
import {
  getBookingServices,
  getMyAppointments,
} from '@/lib/actions/appointment'
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

  const access = await getAccountAccess()
  if (!access) redirect('/login')
  const allowed = access.approved

  const [servicesResult, appointmentsResult] = allowed
    ? await Promise.all([getBookingServices(), getMyAppointments()])
    : [null, null]

  return (
    <>
      <section
        className="min-h-dvh bg-slate-50 dark:bg-[#0b1220] lg:ml-[288px]"
      >
        <PatientHeader />

        <div className="mx-auto max-w-7xl pb-32">
          <main className="flex flex-col gap-5 px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6 xl:px-10">
            {allowed ? (
              <>
                <AppointmentOverviewCard
                  appointments={appointmentsResult?.appointments ?? []}
                />
                <ServiceListSection services={servicesResult?.services ?? []} />
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