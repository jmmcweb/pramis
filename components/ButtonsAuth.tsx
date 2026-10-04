'use client'

import { signIn } from 'next-auth/react'
import { LogOut } from 'lucide-react'
import { useLogoutConfirmation } from '@/components/ui/LogoutConfirmDialog'

export function ButtonSignIn({
  className,
  label = 'Login',
}: {
  className?: string
  label?: string
}) {
  return (
    <button type="button" className={`button ${className}`} onClick={() => signIn()}>
      {label}
    </button>
  )
}

export function ButtonSignOut({ className }: { className?: string }) {
  const { requestLogout, logoutDialog } = useLogoutConfirmation()

  return (
    <>
      <button onClick={requestLogout} className={`button w-full justify-start ${className}`}>
        <LogOut className="inline mr-2 mb-1" />
        Logout
      </button>
      {logoutDialog}
    </>
  )
}
