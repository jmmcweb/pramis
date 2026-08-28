'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/actions/notifications'
import type { PatientNotification } from './notificationData'

const POLL_INTERVAL_MS = 30_000

export function useNotifications(initial?: PatientNotification[]) {
  const [notifications, setNotifications] = useState<PatientNotification[]>(
    initial ?? [],
  )
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      const result = await getMyNotifications()
      if (result.success) setNotifications(result.notifications)
    } catch {
    } finally {
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    if (!initial) refresh()

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, POLL_INTERVAL_MS)

    const onFocus = () => refresh()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
    }, [refresh])

  const markRead = useCallback(
    (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
      )
      markNotificationRead(id)
        .then((res) => {
          if (!res?.success) refresh()
        })
        .catch(() => refresh())
    },
    [refresh],
  )

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
    markAllNotificationsRead()
      .then((res) => {
        if (!res?.success) refresh()
      })
      .catch(() => refresh())
  }, [refresh])

  const unreadCount = notifications.filter((n) => n.unread).length

  return { notifications, unreadCount, refresh, markRead, markAllRead }
}
