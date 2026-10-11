import Link from 'next/link'

export const metadata = {
  title: 'Terms and Conditions | PRAMIS',
  description: 'The rules for creating and using a PRAMIS account.',
}

const SECTIONS = [
  {
    heading: '1. Acceptance of Terms',
    body: [
      'By creating a PRAMIS account and checking the consent box during sign up, you agree to these Terms and Conditions and to our Privacy Policy. If you do not agree, please do not create an account.',
    ],
  },
  {
    heading: '2. Eligibility',
    body: [
      'Accounts are open to residents of Barangay Sumapang Matanda who are at least 18 years old. Minors are registered at the health center desk by a parent or guardian.',
    ],
  },
  {
    heading: '3. Account Registration and Approval',
    body: [
      'You must provide accurate and complete information. Accounts are reviewed and approved by health center staff; submitting the form does not guarantee an account. We may reject or disable accounts that provide false information or are created for misuse.',
    ],
  },
  {
    heading: '4. Acceptable Use',
    body: [
      'You agree to use PRAMIS only for personal healthcare management. You will not attempt to access other patients’ records, disrupt the service, or misrepresent your identity. Queue numbers and appointments obtained through PRAMIS are personal and may not be transferred.',
    ],
  },
  {
    heading: '5. Appointments and Health Services',
    body: [
      'Appointments booked through PRAMIS are subject to health center capacity and staff approval. Medical information shown in your records is provided by health center staff; for medical emergencies, contact your local emergency services instead of relying on this system.',
    ],
  },
  {
    heading: '6. Changes to These Terms',
    body: [
      'We may update these terms as the platform evolves. Continued use of PRAMIS after an update constitutes acceptance of the revised terms.',
    ],
  },
  {
    heading: '7. Contact',
    body: [
      'For questions about these Terms and Conditions, reach out to the barangay health center staff or through the support contact shown in your account.',
    ],
  },
]

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-dvh bg-surface font-inter">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-2xl border border-line bg-card shadow-[0_12px_32px_-12px_rgb(15_88_139/0.18)] px-5 py-7 sm:px-10 sm:py-10">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate m-0">
            Legal
          </p>
          <h1 className="mt-1 text-[28px] sm:text-[32px] font-bold text-ink m-0">
            Terms and Conditions
          </h1>
          <span className="mt-3 mb-6 block h-[3px] w-12 rounded-full bg-brand" />

          <p className="text-[15px] leading-relaxed text-body m-0 mb-6">
            These Terms and Conditions govern your use of PRAMIS, the patient
            records and medical information system of the barangay health
            center. Please read them carefully before creating your account.
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
            <Link href="/privacy-policy" className="auth-link text-[14px]">
              Privacy Policy →
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}