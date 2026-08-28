import { Metadata } from 'next'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { ArrowLeft, CalendarDays, Clock, MapPin } from 'lucide-react'
import { getAccountAccess } from '@/lib/actions/guard'
import {
  getBookingServices,
  getMyDisplayName,
  getMyFamilyMembers,
} from '@/lib/actions/appointment'
import PatientHeader from '@/components/patient/Header'
import AccountStatusScreen from '@/components/patient/AccountStatusScreen'
import PatientBottomNavigation from '@/components/patient/PatientBottomNavigation'
import PatientSidebar from '@/components/patient/PatientSidebar'
import BookingForm from '@/components/patient/BookingForm'

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

  const access = await getAccountAccess()
  if (!access) redirect('/login')
  const allowed = access.approved

  const { service: serviceId } = await searchParams
  const [servicesResult, patientName, familyResult] = allowed
    ? await Promise.all([
        getBookingServices(),
        getMyDisplayName(),
        getMyFamilyMembers(),
      ])
    : [null, '', null]

  const services = servicesResult?.services ?? []
  const selected =
    services.find((s) => s.id === serviceId) ??
    services.find((s) => s.available) ??
    services[0]

  return (
    <>
      <section
        className="min-h-dvh bg-cover bg-center bg-no-repeat lg:ml-[360px] bg-[url('/purplebackground.png')] dark:bg-none dark:bg-[#050617]"
      >
        <PatientHeader />

        <div className="max-w-md mx-auto pb-32 md:max-w-3xl lg:max-w-5xl xl:max-w-6xl">
          <main className="px-4 pt-4 flex flex-col gap-5 lg:px-12 lg:pt-5">
            {allowed ? (
              selected ? (
                <>
                  <Link
                    href="/user/appointment"
                    className="self-start inline-flex items-center gap-1.5 bg-white dark:bg-card text-brand font-semibold text-sm px-3.5 py-2 rounded-full shadow-card transition-colors hover:bg-brand-tint"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    Appointment
                  </Link>

                  <div className="bg-white dark:bg-card rounded-3xl shadow-card p-5 flex items-center gap-4">
                    <div className="w-16 h-16 shrink-0 rounded-2xl bg-brand-tint text-brand flex items-center justify-center text-3xl">
                      <span aria-hidden="true">{selected.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-3xl font-bold leading-tight text-slate-900 dark:text-slate-100">
                        {selected.name}
                      </h2>
                      <div className="mt-2.5 flex flex-col gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                        <p className="flex items-center gap-1.5">
                          <CalendarDays className="w-4 h-4 text-brand shrink-0" aria-hidden="true" />
                          {selected.schedule}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-brand shrink-0" aria-hidden="true" />
                          {selected.time}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              selected.available ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                            aria-hidden="true"
                          />
                          <span
                            className={`font-semibold ${
                              selected.available ? 'text-emerald-700' : 'text-red-600'
                            }`}
                          >
                            {selected.available
                              ? 'Accepting appointments'
                              : 'Currently unavailable'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-card rounded-3xl shadow-card p-5">
                    <h2 className="text-2xl font-bold text-brand mb-2">Description</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {selected.description || 'No description provided for this service.'}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                      Barangay Sumapang Matanda Health Center
                    </p>
                  </div>

                  <BookingForm
                    service={selected}
                    patientName={patientName}
                    familyMembers={familyResult?.familyMembers ?? []}
                  />
                </>
              ) : (
                <div className="bg-white dark:bg-card rounded-3xl shadow-card p-8 text-center">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    No services available
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    There are currently no services open for booking.
                  </p>
                  <Link
                    href="/user/appointment"
                    className="mt-4 inline-flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-dark text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
                  >
                    Back to Appointments
                  </Link>
                </div>
              )
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