'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import MediTrackBrand from '@/components/globals/MediTrackBrand'
import NotificationDropdown from './NotificationDropdown'
import { initialNotifications } from './notificationData'

export default function PatientHeader() {
  const [notifOpen, setNotifOpen] = useState(false)
  const unreadCount = initialNotifications.filter((n) => n.unread).length

  return (
    <header className="sticky top-0 z-40 bg-white/65 dark:bg-[rgba(45,27,78,0.65)] backdrop-blur border-b border-line px-4 py-3 flex items-center justify-between lg:static lg:justify-end lg:py-5 lg:border-0 lg:pl-7 lg:pr-0">
      <div className="lg:hidden">
        <MediTrackBrand compact />
      </div>

      <div className="flex items-center gap-1">
        <Link
          href="/user/notifications"
          aria-label="Notifications"
          className="relative p-2 rounded-full text-brand transition-colors hover:bg-brand-tint lg:hidden"
        >
          <img
            src="/icon-notification.png"
            alt=""
            aria-hidden="true"
            className="w-6 h-6 object-contain"
          />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
        </Link>

        <div className="relative hidden lg:block">
          <button
            onClick={() => setNotifOpen((o) => !o)}
            aria-label="Notifications"
            aria-expanded={notifOpen}
            className="relative p-2 rounded-full text-brand transition-colors lg:opacity-70 lg:hover:opacity-100 lg:transition-[color,background-color,opacity] hover:bg-brand-tint"
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
          {notifOpen && <NotificationDropdown onClose={() => setNotifOpen(false)} />}
        </div>

        <Link
          href="/user/accountsettings"
          aria-label="Settings"
          className="p-2 rounded-full text-brand transition-colors lg:opacity-70 lg:hover:opacity-100 lg:transition-[color,background-color,opacity] hover:bg-brand-tint"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </div>
    </header>
  )
}
