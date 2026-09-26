import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { getAccountAccess } from '@/lib/actions/guard'
import { getMyProfile } from '@/lib/actions/me'
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

  const { profile } = await getMyProfile()

  const displayName =
    [profile?.firstName, profile?.middleName, profile?.lastName, profile?.suffix]
      .filter(Boolean)
      .join(' ')
      .trim() || profile?.email || 'Patient'

  const initials =
    `${profile?.firstName?.charAt(0) ?? ''}${profile?.lastName?.charAt(0) ?? ''}`
      .toUpperCase()
      .trim() || 'P'

  const profileCompleteness = Math.round(
    ([
      profile?.firstName,
      profile?.lastName,
      profile?.birthdate,
      profile?.sex,
      profile?.phoneNumber,
      profile?.email,
      profile?.houseNumber,
      profile?.barangay,
      profile?.city,
      profile?.province,
    ].filter((value) => Boolean(String(value ?? '').trim())).length /
      10) *
      100,
  )

  return (
    <>
      <section
        className="min-h-dvh bg-cover bg-center bg-no-repeat lg:ml-[360px] bg-[url('/purplebackground.png')] dark:bg-none dark:bg-[#050617]"
      >
        <PatientHeader />

        <div className="max-w-md mx-auto pb-32 md:max-w-3xl lg:max-w-5xl xl:max-w-6xl">
          <main className="px-4 pt-4 flex flex-col gap-5 lg:px-12 lg:pt-5">
            <div className="overflow-hidden rounded-[28px] border border-white/40 bg-gradient-to-br from-[#0b4a77] via-[#0f588b] to-[#3b82c4] shadow-card dark:border-white/10 dark:from-[#0d1b33] dark:via-[#12294d] dark:to-[#1b3a63]">
              <div className="relative px-5 pb-5 pt-6 sm:px-7 sm:pt-7">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/15 blur-2xl"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-white/10 blur-2xl"
                />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-4">
                    <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-3xl bg-white/95 text-2xl font-extrabold text-[#0f588b] shadow-lg ring-4 ring-white/30">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold tracking-widest text-white/90 backdrop-blur">
                        {profile?.referenceId || 'NO ID YET'}
                      </span>
                      <h1 className="mt-1.5 truncate text-[26px] font-extrabold leading-tight text-white">
                        {displayName}
                      </h1>
                      <p className="mt-0.5 truncate text-[13px] font-medium text-white/75">
                        {[profile?.email, profile?.phoneNumber]
                          .filter(Boolean)
                          .join('  •  ') || 'Keep your personal information up to date.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative flex items-center gap-2 overflow-x-auto border-t border-white/15 bg-white/[0.08] px-5 py-3 backdrop-blur">
                <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-widest text-white/70">
                  Profile complete
                </span>
                <div className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{ width: `${profileCompleteness}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-white">{profileCompleteness}%</span>
              </div>
            </div>

            <PatientInfoForm profile={profile} />
          </main>
        </div>
      </section>

      <PatientSidebar />
      <PatientBottomNavigation />
    </>
  )
}
