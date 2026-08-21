import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { getAccountAccess } from '@/lib/actions/guard'
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

  // Account approval gate: PENDING/REJECTED users cannot access medical records.
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
                <div className="bg-white dark:bg-card rounded-3xl shadow-card p-5">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-widest">PTN-2610201</p>
                  <h1 className="text-3xl font-bold text-brand mt-1">Your Medical Records</h1>
                </div>

                <MedicalRecordsTimeline />
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
