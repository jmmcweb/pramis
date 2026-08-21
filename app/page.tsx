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
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/meditrack-logo.png"
              alt="MediTrack"
              className="w-12 h-12 md:w-16 md:h-16 object-contain"
            />
            <div className="flex flex-col leading-none">
              <span className="font-bebas text-3xl md:text-[42px] text-white tracking-wide">
                MEDITRACK
              </span>
              <span className="font-asap text-xs md:text-sm text-[#7fb6e6] tracking-[0.129em] md:tracking-[0.164em] whitespace-nowrap -mt-3">
                Stay On Track With Us
              </span>
            </div>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="relative flex-1 flex flex-col">
        <section className="max-w-7xl mx-auto px-5 md:px-8 w-full flex-1 flex items-center py-16 md:py-24">
          <div className="max-w-2xl text-left">
            <h1 className="text-4xl md:text-5xl xl:text-[3.4rem] font-bold leading-[1.15] text-white m-0">
              One Stop Solution For{' '}
              <span className="text-[#a78bfa]">All Medical Needs</span>
            </h1>
            <p className="mt-6 text-base md:text-lg leading-relaxed text-white/80 max-w-xl">
              Manage your clinic appointments, access your patient records, and
              stay updated on clinic events here in Barangay Sumapang Matanda.
              We offer vaccines, prenatal care, checkups, and more — all in
              one platform that keeps you on track.
            </p>
            <Link
              href="/login"
              className="mt-9 inline-flex items-center justify-center bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold text-base px-12 py-4 rounded-full w-full sm:w-auto transition-colors no-underline shadow-lg shadow-[#7c3aed]/30"
            >
              LOGIN
            </Link>
          </div>
        </section>

        <section className="bg-gradient-to-br from-violet-100 via-purple-100 to-fuchsia-100">
          <div className="max-w-7xl mx-auto px-5 md:px-8 py-16 md:py-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 m-0">
                Our Services
              </h2>
              <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
                From appointments and patient records to vaccines, prenatal
                care, and community events — everything your health needs in
                Barangay Sumapang Matanda.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-white border border-purple-100 rounded-3xl p-7 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                    <feature.icon
                      className="w-8 h-8 text-purple-600"
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