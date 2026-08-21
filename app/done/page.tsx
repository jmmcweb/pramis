'use client'

import { Suspense, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'

const Done = () => {
  const searchParams = useSearchParams()
  const isPending = searchParams.get('pending') === 'true'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <AuthShell
      title=""
      animate={false}
      cardClassName="lg:max-w-md"
      footer={
        <>
          Having trouble?{' '}
          <Link href="/support" className="auth-link">
            Contact support
          </Link>
        </>
      }
    >
      <div className="flex flex-col items-center text-center py-6">
        <span className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
          <CheckCircle2 size={34} className="text-emerald-500" />
        </span>

        {isPending ? (
          <>
            <h1 className="text-[22px] font-bold text-ink m-0">
              Your account is almost ready
            </h1>
            <p className="text-[13.5px] text-slate leading-relaxed max-w-[300px]">
              Our team is reviewing your ID for verification. We&apos;ll notify you by email once it&apos;s approved.
            </p>
            <div className="flex items-center gap-2 mt-5 px-4 py-2.5 rounded-lg bg-mist/50 text-[12.5px] text-slate">
              <Loader2 size={14} className="animate-spin text-brand" />
              Verification in progress
            </div>
          </>
        ) : (
          <>
            <h1 className="text-[22px] font-bold text-ink m-0">You&apos;re all set!</h1>
            <p className="text-[13.5px] text-slate leading-relaxed max-w-[300px]">
              Your account has been created successfully. You can now log in and start managing your appointments.
            </p>
            <div className="flex flex-col gap-2 mt-5 w-full max-w-[280px]">
              <Link href="/login" className="btn btn--primary w-full">
                Log in to your account
              </Link>
            </div>
          </>
        )}
      </div>
    </AuthShell>
  )
}

export default function DonePage() {
  return (
    <Suspense>
      <Done />
    </Suspense>
  )
}
