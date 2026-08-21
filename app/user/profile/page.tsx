import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { getAccountAccess } from '@/lib/actions/guard'
import PatientHeader from '@/components/patient/Header'
import PatientBottomNavigation from '@/components/patient/PatientBottomNavigation'
import PatientSidebar from '@/components/patient/PatientSidebar'
import PatientInfoForm from '@/components/patient/PatientInfoForm'

export const metadata: Metadata = {
  title: 'Profile',
  description: 'MediTrack patient information center',
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const access = await getAccountAccess()
  if (!access) redirect('/login')

  return (
    <>
      <section
        className="min-h-dvh bg-cover bg-center bg-no-repeat lg:ml-[360px] bg-[url('/purplebackground.png')] dark:bg-none dark:bg-[#050617]"
      >
        <PatientHeader />

        <div className="max-w-md mx-auto pb-32 md:max-w-3xl lg:max-w-5xl xl:max-w-6xl">
          <main className="px-4 pt-4 flex flex-col gap-5 lg:px-12 lg:pt-5">
            <div className="bg-white dark:bg-card rounded-3xl shadow-card p-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 shrink-0 rounded-full bg-brand-tint text-brand flex items-center justify-center text-xl font-bold">
                  CM
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-widest">
                    PTN-2610201
                  </p>
                  <h1 className="text-2xl font-bold text-brand leading-tight">
                    Carla Mae Villanueva
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Keep your personal information up to date.
                  </p>
                </div>
              </div>
            </div>

            <PatientInfoForm />
          </main>
        </div>
      </section>

      <PatientSidebar />
      <PatientBottomNavigation />
    </>
  )
}
