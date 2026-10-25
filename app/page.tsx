import Link from 'next/link'
import { Calendar, FolderHeart, CalendarDays, Syringe } from 'lucide-react'

const FEATURES = [
  {
    icon: Calendar,
    title: 'Appointment',
    description:
      'Book, reschedule, and manage your clinic appointments anytime, straight from your device.',
  },
  {
    icon: FolderHeart,
    title: 'Patient Records',
    description:
      'Access your complete medical history and health records securely in one place.',
  },
  {
    icon: CalendarDays,
    title: 'Events',
    description:
      'Stay informed about clinic news, health drives, and community events near you.',
  },
  {
    icon: Syringe,
    title: 'Health Services',
    description:
      'Vaccines, prenatal care, regular checkups, and more for the whole family.',
  },
]

export default function Home() {
  return (
    <div className="min-h-dvh relative flex flex-col font-inter overflow-x-hidden">
      <img
        src="/homebg.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/60" />

      <header className="sticky top-0 z-20 bg-black/30 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:h-20 md:px-8">
          <div className="flex items-center gap-1.5">
            <img
              src="/logo.png"
              alt="PRAMIS"
              className="w-12 h-12 md:w-16 md:h-16 object-contain"
            />
            <div className="flex flex-col items-end justify-center leading-none w-fit">
              <span className="font-bebas text-3xl md:text-[42px] text-white tracking-wide">
                PRAMIS
              </span>
              <span className="w-full flex justify-between font-asap text-[10px] md:text-[13px] text-[#7fb6e6] tracking-normal whitespace-nowrap mt-1">
                <span>Stay</span>
                <span>On</span>
                <span>Track</span>
                <span>With</span>
                <span>Us</span>
              </span>
            </div>
          </div>
          <nav aria-label="Account" className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-10 items-center rounded-xl bg-white px-4 text-sm font-semibold text-brand shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative flex-1 flex flex-col">
        <section className="max-w-7xl mx-auto px-5 md:px-8 w-full flex-1 flex items-center py-16 md:py-24">
          <div className="max-w-2xl text-left">
            <h1 className="text-4xl md:text-5xl xl:text-[3.4rem] font-bold leading-[1.15] text-white m-0">
              One Stop Solution For{' '}
              <span className="text-sky-200">All Medical Needs</span>
            </h1>
            <p className="mt-6 text-base md:text-lg leading-relaxed text-white/80 max-w-xl">
              Manage clinic appointments, access health records, and stay
              updated on community health events in Barangay Sumapang Matanda.
              Find vaccines, prenatal care, checkups, and more in one place.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand px-7 py-3 text-base font-semibold text-white no-underline shadow-lg shadow-brand/25 transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 sm:w-auto"
            >
              Log in to PRAMIS
            </Link>
          </div>
        </section>

        <section className="bg-slate-50">
          <div className="max-w-7xl mx-auto px-5 md:px-8 py-16 md:py-20">
            <div className="mb-12 text-center">
              <h2 className="m-0 text-3xl font-bold text-slate-900 md:text-4xl">
                Our Services
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-slate-600">
                From appointments and patient records to vaccines, prenatal
                care, and community events — everything your health needs in
                Barangay Sumapang Matanda.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-tint">
                    <feature.icon
                      className="h-7 w-7 text-brand"
                      strokeWidth={2.2}
                    />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-900 m-0">
                    {feature.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-500">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}