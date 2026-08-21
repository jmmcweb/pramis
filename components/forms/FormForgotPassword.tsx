'use client'

import { useRef, useActionState } from 'react'
import { forgotPassword } from '@/lib/actions/util'
import Field from '@/components/auth/Field'

export default function FormForgotPassword({
  className,
}: {
  className: string
}) {
  const formRef = useRef<HTMLFormElement>(null)

  const [state, handleSubmit, isPending] = useActionState(forgotPassword, {
    success: false,
    message: null,
    errors: null,
  })

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      noValidate
      className={`flex flex-col gap-5 ${className}`}
    >
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

      {/* Alert */}
      {state && state.message && (
        <div
          className={`alert ${
            state.success ? 'alert--success' : 'alert--danger'
          }`}
        >
          {state.message}
        </div>
      )}

      <div>
        <button
          type="submit"
          className="btn btn--primary disabled:animate-pulse disabled:opacity-50 my-3"
          disabled={isPending}
        >
          {isPending ? 'Please wait…' : 'Send reset link'}
        </button>
      </div>
    </form>
  )
}
