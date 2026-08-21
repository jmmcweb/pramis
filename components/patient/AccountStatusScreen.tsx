'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { Clock3, LayoutDashboard, LogOut, ShieldAlert } from 'lucide-react'

export default function AccountStatusScreen({
  status,
  showSignOut = false,
}: {
  status: string
  showSignOut?: boolean
}) {
  const isPending = status === 'PENDING'
  const isRejected = status === 'REJECTED'

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4">
      <div className="bg-white dark:bg-card rounded-3xl shadow-card p-8 w-full max-w-md text-center">
        <div
          className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
            isRejected ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
          }`}
        >
          {isRejected ? (
            <ShieldAlert className="w-8 h-8" aria-hidden="true" />
          ) : (
            <Clock3 className="w-8 h-8" aria-hidden="true" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-5">
          {isRejected ? 'Account Verification Failed' : 'Account Pending Approval'}
        </h1>

        {isPending ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
            Your account is currently awaiting approval from Barangay Sumapang
            Matanda Health Center.
            <br />
            <br />
            Once approved, you will be able to:
          </p>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
            Please contact Barangay Sumapang Matanda Health Center for
            assistance.
          </p>
        )}

        {isPending && (
          <ul className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-3 space-y-1.5">
            <li>Book Appointments</li>
            <li>View Medical Records</li>
            <li>Access Patient Services</li>
          </ul>
        )}

        <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">Thank you for your patience.</p>

        <div className="flex flex-col gap-2.5 mt-7">
          <Link
            href="/user"
            className="inline-flex items-center justify-center gap-2 w-full bg-brand hover:bg-brand-dark text-white py-3 rounded-xl font-semibold text-sm transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
            Return to Dashboard
          </Link>

          {showSignOut && (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="inline-flex items-center justify-center gap-2 w-full bg-white dark:bg-card border border-line text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-soft py-3 rounded-xl font-semibold text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
