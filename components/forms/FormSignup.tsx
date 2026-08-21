'use client'

import { useActionState, useEffect, useRef } from 'react'
import { signupUser } from '@/lib/actions/user'
import { useRouter } from 'next/navigation'
import Field from '@/components/auth/Field'

export default function FormSignup({ className }: { className?: string }) {
  // Hooks
  const { push: redirect } = useRouter()

  //
  const formRef = useRef<HTMLFormElement>(null)

  // States
  const [state, handleSubmit, pending] = useActionState(signupUser, {})

  useEffect(() => {
    if (state?.success && formRef.current) {
      formRef.current.reset()
      // Use delay 1000 to show form message before redirect
      setTimeout(() => {
        redirect('/login')
      }, 1000)
    }
  }, [state])

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      noValidate
      className={`flex flex-col gap-5 ${className}`}
    >
      <Field
        label="Full name"
        id="name"
        type="text"
        name="name"
        placeholder="John Thomas"
        autoComplete="name"
        required
        error={state?.errors?.name}
      />

      <Field
        label="Email address"
        id="email"
        type="email"
        name="email"
        placeholder="you@email.com"
        autoComplete="email"
        required
        error={state?.errors?.email}
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

      <div>
        {state?.message && (
          <div
            className={`alert ${
              state.success ? `alert--success` : `alert--danger`
            }`}
          >
            {state?.message}
          </div>
        )}
        <button type="submit" className="btn btn--primary my-3" disabled={pending}>
          {pending ? 'Please wait…' : 'Sign up'}
        </button>
      </div>
    </form>
  )
}
