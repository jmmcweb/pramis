'use client'

import { useEffect, useRef } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { toast } from 'sonner'

// Polls the account status endpoint while a staff/admin session is active.
// When the account gets archived by an admin (deletedAt set on the staff row),
// the poller learns about it within a few seconds and signs the session out
// automatically, so archived accounts never stay signed in.
export default function StaffStatusWatcher() {
  const { status } = useSession()
  const signingOutRef = useRef(false)

  useEffect(() => {
    if (status !== 'authenticated') return

    let cancelled = false
    let timeout: ReturnType<typeof setTimeout> | undefined
    const controller = new AbortController()
    signingOutRef.current = false

    const checkStatus = async () => {
      if (cancelled || signingOutRef.current) return

      try {
        const res = await fetch('/api/auth/status', {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!res.ok) {
          throw new Error(`Status endpoint returned HTTP ${res.status}`)
        }

        const data = await res.json()
        if (cancelled) return

        if (data.status === 'ARCHIVED' && !signingOutRef.current) {
          signingOutRef.current = true
          toast.error(
            'Your account has been archived by the administrator. You will be signed out.',
            { duration: 6000 },
          )
          await signOut({ callbackUrl: '/login' })
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Staff status polling error:', err)
        }
      } finally {
        if (!cancelled && !signingOutRef.current) {
          timeout = setTimeout(checkStatus, 15000)
        }
      }
    }

    timeout = setTimeout(checkStatus, 15000)

    return () => {
      cancelled = true
      controller.abort()
      if (timeout) clearTimeout(timeout)
    }
  }, [status])

  return null
}