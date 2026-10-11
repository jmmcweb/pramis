import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | PRAMIS',
  description: 'How PRAMIS collects, uses, and protects your personal information.',
}

const SECTIONS = [
  {
    heading: '1. Information We Collect',
    body: [
      'When you create a PRAMIS account, we collect the information needed to provide barangay health services: your full name, birthday, gender, mobile number, email address, and residence details (street, purok, barangay, city, province, and ZIP code).',
      'During verification we may also collect a photo of a valid government-issued ID and, if you declare it, a PWD ID photo. Once your account is active, the health center may record your appointments, consultations, and medical records under your profile.',
    ],
  },
  {
    heading: '2. How We Use Your Information',
    body: [
      'We use your information to book and manage appointments, notify you about clinic events and health services, maintain your medical records, verify your identity, and keep the health center roster accurate for barangay health programs.',
      'Appointment and registration notifications may be sent to health center staff so they can prepare for your visit. We never sell your personal information.',
    ],
  },
  {
    heading: '3. Who Can See Your Data',
    body: [
      'Barangay health center staff and administrators can access the records they need to serve you. Other patients cannot see your information. Access to patient records is logged for accountability.',
    ],
  },
  {
    heading: '4. How We Protect Your Data',
    body: [
      'Data is transmitted over encrypted connections, passwords are stored only as salted hashes, and access is restricted to authorized personnel. Database backups are stored securely and are only restorable by administrators.',
    ],
  },
  {
    heading: '5. Your Rights',
    body: [
      'You may review your profile and account details at any time from your account settings. You may request correction of inaccurate information or ask the health center to remove your account, subject to records-retention requirements for health documents.',
    ],
  },
  {
    heading: '6. Contact Us',
    body: [
      'Questions about this Privacy Policy can be directed to the barangay health center staff or through the support contact shown in your account.',
    ],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-dvh bg-surface font-inter">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-2xl border border-line bg-card shadow-[0_12px_32px_-12px_rgb(15_88_139/0.18)] px-5 py-7 sm:px-10 sm:py-10">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate m-0">
            Legal
          </p>
          <h1 className="mt-1 text-[28px] sm:text-[32px] font-bold text-ink m-0">
            Privacy Policy
          </h1>
          <span className="mt-3 mb-6 block h-[3px] w-12 rounded-full bg-brand" />

          <p className="text-[15px] leading-relaxed text-body m-0 mb-6">
            PRAMIS (Patient Records and Medical Information System) is the
            barangay health tracking platform for Barangay Sumapang Matanda.
            This policy explains what we collect, why we collect it, and the
            choices you have. By creating an account you agree to the
            collection and use of information described here.
          </p>

          {SECTIONS.map((section) => (
            <section key={section.heading} className="mt-6 first:mt-0">
              <h2 className="text-[17px] font-bold text-ink m-0">
                {section.heading}
              </h2>
              {section.body.map((paragraph, index) => (
                <p
                  key={index}
                  className="mt-2 text-[14.5px] leading-relaxed text-body m-0"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}

          <p className="mt-8 text-[13px] text-slate m-0">
            Last updated: October 2026
          </p>

          <div className="mt-8 pt-5 border-t border-line flex flex-wrap items-center justify-between gap-3">
            <Link href="/signup" className="auth-link text-[14px]">
              ← Back to Sign Up
            </Link>
            <Link href="/terms-and-conditions" className="auth-link text-[14px]">
              Terms and Conditions →
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}