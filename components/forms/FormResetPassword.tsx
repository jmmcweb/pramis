'use client'

import { useEffect, useState, useRef, useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { resetPassword } from '@/lib/actions/util'
import Field from '@/components/auth/Field'

export default function FormResetPassword({
  className,
}: {
  className: string
}) {
  // Params
  const searchParams = useSearchParams()

  // Refs
  const formRef = useRef<HTMLFormElement>(null)

  // State
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')

  const [state, handleSubmit, isPending] = useActionState(resetPassword, {
    success: false,
    message: null,
    errors: null,
  })

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    const emailParam = searchParams.get('email')

    if (tokenParam && emailParam) {
      setToken(tokenParam)
      setEmail(emailParam)
    }
  }, [searchParams])

  //if no token and email return:
  if (!email && !token) {
    return (
      <div className="m-auto w-full max-w-lg space-y-10">
        <div className="space-y-4">
          <h1 className="font-bebas text-[32px] leading-none text-ink">
            Invalid reset link
          </h1>
          <p className="text-[14px] leading-relaxed text-slate">
            This link is missing or has expired. Check your email for the
            reset link and try again.
          </p>
        </div>
        <Link href="/forgot-password" className="btn btn--primary">
          Request a new link
        </Link>
      </div>
    )
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      noValidate
      data-loading={isPending}
      className={`flex flex-col gap-5 ${className}`}
    >
      <Field
        label="Email address"
        id="email"
        type="email"
        name="email"
        value={email}
        readOnly
        required
      />

      <Field
        label="Password"
        id="password"
        type="password"
        name="password"
        placeholder="••••••••"
        autoComplete="new-password"
        required
        error={state?.errors?.password}
      />

      <Field
        label="Confirm password"
        id="confirmpassword"
        type="password"
        name="confirmPassword"
        placeholder="••••••••"
        autoComplete="new-password"
        required
        error={state?.errors?.confirmpassword}
      />

      {/* Alert */}
      {state.message && (
        <div
          className={`alert ${
            state.success ? 'alert--success' : 'alert--danger'
          }`}
        >
          {state.message}
        </div>
      )}

      {/** Hiddens */}
      <input type="hidden" name="token" value={token} />

      <div>
        <button
          type="submit"
          className="btn btn--primary disabled:animate-pulse disabled:opacity-50"
          disabled={isPending}
        >
          {isPending ? 'Please wait…' : 'Reset password'}
        </button>
      </div>
    </form>
  )
}
