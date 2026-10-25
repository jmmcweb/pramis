'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings } from 'lucide-react'
import NotificationDropdown from './NotificationDropdown'
import { useNotifications } from './useNotifications'

export default function PatientHeader() {
  const pathname = usePathname()
  const [notifOpen, setNotifOpen] = useState(false)

  const { notifications, unreadCount, refresh, markRead, markAllRead } =
    useNotifications()

  const toggleNotif = () => {
    if (!notifOpen) refresh()
    setNotifOpen((o) => !o)
  }

  const pageTitle =
    pathname === '/user'
      ? 'Home'
      : pathname === '/user/appointment/book'
        ? 'Book Appointment'
        : pathname.startsWith('/user/appointment')
          ? 'Appointments'
          : pathname.startsWith('/user/records')
            ? 'Medical Records'
            : pathname.startsWith('/user/notifications')
              ? 'Notifications'
              : pathname.startsWith('/user/profile')
                ? 'My Profile'
                : pathname.startsWith('/user/accountsettings')
                  ? 'Account Settings'
                  : 'PRAMIS'

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-lg dark:bg-[#111c30]/95 lg:relative lg:z-[100] lg:border-0">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/logo.png"
            alt=""
            aria-hidden="true"
            className="h-9 w-9 shrink-0 object-contain lg:hidden"
          />
          <h1 className="truncate text-base font-semibold text-slate-800 dark:text-slate-100">
            {pageTitle}
          </h1>
        </div>

        <div className="flex items-center gap-1">
          <Link
            href="/user/notifications"
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-brand transition-colors hover:bg-brand-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:hidden"
          >
            <img
              src="/icon-notification.png"
              alt=""
              aria-hidden="true"
              className="w-6 h-6 object-contain"
            />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </Link>

          <div className="relative hidden lg:block">
            <button
              onClick={toggleNotif}
              aria-label="Notifications"
              aria-expanded={notifOpen}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-brand transition-colors hover:bg-brand-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:opacity-80 lg:hover:opacity-100"
            >
              <img
                src="/icon-notification.png"
                alt=""
                aria-hidden="true"
                className="w-6 h-6 object-contain"
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <NotificationDropdown
                notifications={notifications}
                markAll={markAllRead}
                markOne={markRead}
                onClose={() => setNotifOpen(false)}
              />
            )}
          </div>

          <Link
            href="/user/accountsettings"
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-brand transition-colors hover:bg-brand-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:opacity-80 lg:hover:opacity-100"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  )
}
