import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { getAccountAccess } from '@/lib/actions/guard'
import { getMyMedicalRecords } from '@/lib/actions/records'
import PatientHeader from '@/components/patient/Header'
import AccountStatusScreen from '@/components/patient/AccountStatusScreen'
import PatientBottomNavigation from '@/components/patient/PatientBottomNavigation'
import PatientSidebar from '@/components/patient/PatientSidebar'
import MedicalRecordsTimeline from '@/components/patient/MedicalRecordsTimeline'

export const metadata: Metadata = {
  title: 'Records',
  description: 'MediTrack medical records',
}

export default async function RecordsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const access = await getAccountAccess()
  if (!access) redirect('/login')
  const allowed = access.approved

  const recordsResult = allowed ? await getMyMedicalRecords() : null

  return (
    <>
      <section className="min-h-dvh bg-slate-50 dark:bg-[#0b1220] lg:ml-[288px]">
        <PatientHeader />

        <div className="mx-auto max-w-7xl pb-32">
          <main className="flex flex-col gap-5 px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6 xl:px-10">
            {allowed ? (
              <>
                <MedicalRecordsTimeline
                  members={recordsResult?.members ?? []}
                />
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
