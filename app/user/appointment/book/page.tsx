import { Metadata } from 'next'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { ArrowLeft, CalendarDays, Clock, MapPin, UserRound } from 'lucide-react'
import { getAccountAccess } from '@/lib/actions/guard'
import PatientHeader from '@/components/patient/Header'
import AccountStatusScreen from '@/components/patient/AccountStatusScreen'
import PatientBottomNavigation from '@/components/patient/PatientBottomNavigation'
import PatientSidebar from '@/components/patient/PatientSidebar'
import BookingForm from '@/components/patient/BookingForm'
import { services, serviceIcons } from '@/src/data/appointment'

export const metadata: Metadata = {
  title: 'Book Appointment',
  description: 'MediTrack appointment booking',
}

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  // Account approval gate: PENDING/REJECTED users cannot book appointments.
  const access = await getAccountAccess()
  if (!access) redirect('/login')
  const allowed = access.approved

  const { service } = await searchParams
  const selected = services.find((s) => s.id === service) ?? services[0]
  const Icon = serviceIcons[selected.icon]

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
                <Link
                  href="/user/appointment"
                  className="self-start inline-flex items-center gap-1.5 bg-white dark:bg-card text-brand font-semibold text-sm px-3.5 py-2 rounded-full shadow-card transition-colors hover:bg-brand-tint"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  Appointment
                </Link>

                <div className="bg-white dark:bg-card rounded-3xl shadow-card p-5 flex items-center gap-4">
                  <div className="w-16 h-16 shrink-0 rounded-2xl bg-brand-tint text-brand flex items-center justify-center">
                    <Icon className="w-8 h-8" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-3xl font-bold leading-tight text-slate-900 dark:text-slate-100">
                      {selected.name}
                    </h2>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
                      {selected.staffName}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{selected.role}</p>
                    <div className="mt-2.5 flex flex-col gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                      <p className="flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-brand shrink-0" aria-hidden="true" />
                        {selected.schedule}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-brand shrink-0" aria-hidden="true" />
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            selected.available ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                          aria-hidden="true"
                        />
                        <span
                          className={`font-semibold ${
                            selected.available
                              ? 'text-emerald-700'
                              : 'text-red-600'
                          }`}
                        >
                          {selected.slots}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-card rounded-3xl shadow-card p-5">
                  <h2 className="text-2xl font-bold text-brand mb-2">Description</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {selected.description}
                  </p>
                </div>

                <div className="bg-white dark:bg-card rounded-3xl shadow-card p-5">
                  <h2 className="text-2xl font-bold text-brand mb-4">Appointed Staff</h2>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 shrink-0 rounded-full bg-brand-tint text-brand flex items-center justify-center">
                      <UserRound className="w-7 h-7" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-200">{selected.staffName}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{selected.role}</p>
                      <p className="text-xs text-brand font-medium inline-flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                        {selected.healthCenter}
                      </p>
                    </div>
                  </div>
                </div>

                <BookingForm service={selected} />
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
