'use client'

import Link from 'next/link'
import AuthShell from '@/components/auth/AuthShell'
import { useSignup } from '@/store/useSignup'

type RowProps = { label: string; value: string }

const Row = ({ label, value }: RowProps) => (
  <div className="flex items-baseline justify-between gap-6 py-1.5 border-b border-line last:border-0">
    <dt className="font-inter text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate shrink-0">
      {label}
    </dt>
    <dd className="text-[14px] text-ink text-right truncate">{value || '—'}</dd>
  </div>
)

const Confirmation = () => {
  const {
    firstName,
    lastName,
    birthday,
    gender,
    countryCode,
    mobile,
    email,
    street,
    barangay,
    city,
    province,
    zip,
    country,
  } = useSignup()

  return (
    <AuthShell
      step={3}
      animate={false}
      title="Confirm details"
      cardClassName="lg:max-w-2xl"
      subtitle="Review your details before verifying your account."
      backHref="/residence-details"
      footer={
        <>
          Something off?{' '}
          <Link href="/signup" className="auth-link">
            Start over
          </Link>
        </>
      }
    >
      <dl className="border-t border-line">
        <dt className="auth-label mt-3 mb-1">Personal information</dt>
        <Row label="First name" value={firstName} />
        <Row label="Last name" value={lastName} />
        <Row label="Birthday" value={birthday} />
        <Row label="Gender" value={gender} />
        <Row label="Mobile" value={`${countryCode} ${mobile}`} />
        <Row label="Email" value={email} />

        <dt className="auth-label mt-4 mb-1">Residence</dt>
        <Row label="Street" value={street} />
        <Row label="Barangay" value={barangay} />
        <Row label="City / Municipality" value={city} />
        <Row label="Province" value={province} />
        <Row label="ZIP / Postal code" value={zip} />
        <Row label="Country" value={country} />
      </dl>

      <Link href="/identification" className="btn btn--primary mt-4">
        Continue to identification
      </Link>
    </AuthShell>
  )
}

export default Confirmation
