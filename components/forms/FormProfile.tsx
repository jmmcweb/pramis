'use client'

import { useEffect, useState, useActionState, useRef } from 'react'
import { updateMe } from '@/lib/actions/me'
import { useSession } from 'next-auth/react'
import { UserRoundPen } from 'lucide-react'

export default function FormProfile({
  m,
  className,
}: {
  m: User
  className?: string
}) {
  const { data: session, update } = useSession()

  const formRef = useRef<HTMLFormElement>(null)

  const [me, setMe] = useState<User>(m)
  const [state, handleSubmit, isPending] = useActionState(updateMe, {
    success: false,
    message: null,
    errors: null,
  })

  useEffect(() => {
    setMe(m)
  }, [])

  useEffect(() => {
    if (state.success) {
      if (state.payload) setMe(state.payload)
      sessionUpdate(state.payload)
    }
  }, [state])

  async function sessionUpdate(updatedUser: User | null) {
    if (!updatedUser) return

    const newUser = {
      ...session?.user,
      ...updatedUser,
    }

    await update(newUser)
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className={`bg-white p-5 md:p-10 mx-auto flex justify-center ${className}`}
      noValidate
      data-loading={isPending}
    >
      <div className="flex flex-col gap-5">
        {/* Avatar */}
        <div className="p-4 relative flex justify-center text-center">
          <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden flex justify-center items-center mx-auto">
            <UserRoundPen size={24} className="text-gray-900" />
          </div>
        </div>

        {/* Profile Information */}
        <div className="profile-information-container mb-10 w-full flex flex-col gap-y-4">
          {/* Reference ID */}
          <div className="form-control">
            <label htmlFor="referenceId">Reference ID</label>
            <input
              type="text"
              id="referenceId"
              value={me?.id ?? ''}
              readOnly
              disabled
              className="!w-full opacity-70"
            />
          </div>
          {/* Email Address */}
          <div className="form-control">
            <label htmlFor="email">Email Address</label>
            <input
              name="email"
              type="email"
              defaultValue={me?.email}
              className={`!w-full ${state.errors?.email ? 'has-errors' : ''}`}
              disabled={isPending}
            />
            {state.errors?.email && (
              <div className="error">{state.errors.email}</div>
            )}
          </div>
          {state?.message && (
            <div
              className={`alert ${
                state.success ? 'alert--success' : 'alert--danger'
              }`}
            >
              {state.message}
            </div>
          )}
          {/* Save Button */}
          <button
            className={`button button--accent flex justify-center my-3 ${
              isPending ? 'cursor-wait opacity-50' : 'cursor-pointer'
            }`}
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  )
}