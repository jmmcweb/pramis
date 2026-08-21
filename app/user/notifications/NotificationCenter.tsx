'use client'

import { useState } from 'react'
import { CheckCheck } from 'lucide-react'
import { initialNotifications, PatientNotification } from '@/components/patient/notificationData'
import NotificationCard from '@/components/patient/NotificationCard'

export default function NotificationCenter() {
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
    <div className="px-4 pt-6 pb-8 lg:px-0 lg:pt-0">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <img
            src="/icon-notification.png"
            alt=""
            aria-hidden="true"
            className="w-6 h-6 object-contain"
          />
          <div>
            <h1 className="font-poppins text-2xl font-bold text-brand m-0">Notifications</h1>
            <p className="text-xs text-muted m-0 mt-0.5">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : 'You are all caught up'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand bg-brand-tint hover:bg-brand/15 px-3 py-2 rounded-full transition-colors cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeCategory === cat
                ? 'bg-brand text-white'
                : 'bg-card text-muted hover:text-brand'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length > 0 ? (
          filtered.map((n) => <NotificationCard key={n.id} notification={n} />)
        ) : (
          <div className="bg-card rounded-3xl shadow-card p-10 text-center">
            <p className="text-sm text-muted m-0">No notifications in this category</p>
          </div>
        )}
      </div>
    </div>
  )
}
