'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCheck, X } from 'lucide-react'
import { initialNotifications, PatientNotification } from './notificationData'
import NotificationCard from './NotificationCard'

export default function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [activeCategory, setActiveCategory] = useState<'All' | PatientNotification['category']>('All')

  const unreadCount = notifications.filter((n) => n.unread).length
  const categories = ['All', 'Appointment', 'Records', 'Account'] as const
  const filtered =
    activeCategory === 'All'
      ? notifications
      : notifications.filter((n) => n.category === activeCategory)

  const markAllAsRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))

  return (
    <>
      <div className="fixed inset-0 z-[190]" onClick={onClose} />
      <div className="absolute top-full right-0 mt-2 w-[min(400px,calc(100vw-16px))] max-h-[520px] bg-card border border-line rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] z-[200] flex flex-col overflow-hidden animate-[slideIn_0.2s_ease]">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-line flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="/icon-notification.png"
              alt=""
              aria-hidden="true"
              className="w-5 h-5 object-contain flex-shrink-0"
            />
            <h3 className="font-poppins text-[15px] font-bold text-body m-0 truncate">Notifications</h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand bg-brand-tint hover:bg-brand/15 px-3 py-1.5 rounded-full transition-colors cursor-pointer whitespace-nowrap"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all as read
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close notifications"
              className="w-7 h-7 border-none rounded-full bg-transparent text-muted hover:bg-brand-tint hover:text-brand flex items-center justify-center cursor-pointer transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 px-4 py-2.5 border-b border-line overflow-x-auto flex-shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-brand text-white'
                  : 'bg-surface text-muted hover:text-brand'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          {filtered.length > 0 ? (
            filtered.map((n) => <NotificationCard key={n.id} notification={n} />)
          ) : (
            <div className="text-center py-10 text-sm text-muted">
              No notifications in this category
            </div>
          )}
        </div>

        <div className="border-t border-line p-3 flex-shrink-0">
          <Link
            href="/user/notifications"
            onClick={onClose}
            className="block w-full text-center text-xs font-semibold text-brand bg-brand-tint hover:bg-brand/15 py-2.5 rounded-full transition-colors"
          >
            View all notifications
          </Link>
        </div>
      </div>
    </>
  )
}
