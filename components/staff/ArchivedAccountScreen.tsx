'use client'

import { useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { Archive } from 'lucide-react'

// Rendered by the staff layout (server-side) when the signed-in staff/admin
// account is found to be archived in the database. Shows a short notice and
// immediately signs the stale session out.
export default function ArchivedAccountScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      signOut({ callbackUrl: '/login' })
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-gradient-to-b from-violet-300 to-white dark:from-[#050617] dark:to-[#050617]">
      <div className="bg-white dark:bg-card rounded-3xl shadow-card p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
          <Archive className="w-8 h-8" aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-5">
          Account Archived
        </h1>

        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
          This account has been archived by the administrator and can no longer
          be used. You will be signed out automatically.
        </p>

        <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
          Please contact the health center administrator if you believe this is
          a mistake.
        </p>
      </div>
    </div>
  )
}