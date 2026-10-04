// This file is for the logout confirmation dialog that appears when the user attempts to log out of the application. It provides a modal dialog with options to confirm or cancel the logout action.

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'

type LogoutConfirmDialogProps = {
  open: boolean
  onCancel: () => void
  onConfirm: () => void | Promise<void>
  darkMode?: boolean
  busy?: boolean
}

export function LogoutConfirmDialog({
  open,
  onCancel,
  onConfirm,
  darkMode,
  busy = false,
}: LogoutConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    confirmRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  const themed = darkMode !== undefined
  const isDark = darkMode ?? false

  const panelClass = themed
    ? `rounded-2xl w-full max-w-[420px] p-6 border shadow-[0_20px_60px_rgba(0,0,0,0.25)] ${
        isDark
          ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]'
          : 'bg-white border-[rgba(15,60,95,0.10)]'
      }`
    : 'rounded-2xl w-full max-w-[420px] p-6 border border-line bg-card shadow-card'

  const iconClass = themed
    ? `w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isDark ? 'bg-[#0f1438]' : 'bg-red-50'
      }`
    : 'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-50 dark:bg-red-500/15'

  const titleClass = themed
    ? `m-0 font-poppins text-xl font-bold ${isDark ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`
    : 'm-0 text-xl font-bold text-body'

  const bodyClass = themed
    ? `text-[14px] mt-1.5 mb-0 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`
    : 'text-sm mt-1.5 mb-0 leading-relaxed text-muted'

  const footerClass = themed
    ? `flex justify-end gap-3 mt-6 pt-4 border-t ${
        isDark ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'
      }`
    : 'flex justify-end gap-3 mt-6 pt-4 border-t border-line'

  const cancelClass = themed
    ? `px-6 py-3 rounded-lg text-[15px] font-bold font-poppins cursor-pointer border transition-all ${
        isDark
          ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:bg-[#0f1438]'
          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
      }`
    : 'px-6 py-3 rounded-lg text-[15px] font-bold cursor-pointer border border-line bg-white dark:bg-card text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-soft transition-colors'

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[1000] p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        aria-describedby="logout-confirm-body"
        className={panelClass}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="min-w-0">
            <h2 id="logout-confirm-title" className={titleClass}>
              Log out of MediTrack?
            </h2>
            <p id="logout-confirm-body" className={bodyClass}>
              You will be signed out of your account. Any unsaved changes will
              be lost and you will need to sign in again to continue.
            </p>
          </div>
        </div>

        <div className={footerClass}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={cancelClass}
          >
            Stay Signed In
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`px-6 py-3 rounded-lg text-[15px] font-bold border-none transition-all bg-red-600 hover:bg-red-700 text-white ${
              themed ? 'font-poppins' : ''
            } ${busy ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {busy ? 'Signing out...' : 'Yes, Log Out'}
          </button>
        </div>
      </div>
    </div>
  )
}

type UseLogoutConfirmationOptions = {
  darkMode?: boolean
  callbackUrl?: string
}

export function useLogoutConfirmation({
  darkMode,
  callbackUrl = '/login',
}: UseLogoutConfirmationOptions = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const requestLogout = useCallback(() => setIsOpen(true), [])
  const cancelLogout = useCallback(() => {
    if (busy) return
    setIsOpen(false)
  }, [busy])

  const confirmLogout = useCallback(async () => {
    setBusy(true)
    setIsOpen(false)
    await signOut({ callbackUrl })
  }, [callbackUrl])

  const logoutDialog = (
    <LogoutConfirmDialog
      open={isOpen}
      onCancel={cancelLogout}
      onConfirm={confirmLogout}
      darkMode={darkMode}
      busy={busy}
    />
  )

  return { isLogoutDialogOpen: isOpen, requestLogout, logoutDialog }
}

export default LogoutConfirmDialog