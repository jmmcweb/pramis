'use client'

import Link from 'next/link'
import AuthShell from '@/components/auth/AuthShell'
import { useSignup } from '@/store/useSignup'

type RowProps = { label: string; value: string }

const Item = ({ label, value, wide = false }: RowProps & { wide?: boolean }) => (
  <div
    className={`py-2 border-b border-line ${wide ? 'sm:col-span-2' : ''}`}
  >
    <dt className="font-inter text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate">
      {label}
    </dt>
    <dd className="text-[14px] text-ink mt-0.5 break-words">{value || '—'}</dd>
  </div>
)

const Confirmation = () => {
  const {
    firstName,
    middleName,
    lastName,
    suffix,
    birthday,
    gender,
    countryCode,
    mobile,
    email,
    street,
    purok,
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <Item
            wide
            label="Full name"
            value={`${[firstName, middleName, lastName]
              .filter(Boolean)
              .join(' ')}${suffix ? ` ${suffix}` : ''}`}
          />
          <Item label="Birthday" value={birthday} />
          <Item label="Gender" value={gender} />
          <Item label="Mobile" value={`${countryCode} ${mobile}`} />
          <Item label="Email" value={email} />
        </div>

        <dt className="auth-label mt-4 mb-1">Residence</dt>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <Item label="Street" value={street} />
          <Item label="Purok" value={purok} />
          <Item label="Barangay" value={barangay} />
          <Item label="City / Municipality" value={city} />
          <Item label="Province" value={province} />
          <Item label="ZIP / Postal code" value={zip} />
          <Item label="Country" value={country} />
        </div>
      </dl>

      <Link href="/identification" className="btn btn--primary mt-4">
        Continue to identification
      </Link>
    </AuthShell>
  )
}

export default Confirmation
