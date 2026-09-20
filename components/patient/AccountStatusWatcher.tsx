'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

export default function AccountStatusWatcher({
  initialStatus = 'PENDING',
}: {
  initialStatus?: string
}) {
  const router = useRouter()
  const { update } = useSession()
  const [, startTransition] = useTransition()
  const [currentStatus, setCurrentStatus] = useState(initialStatus)

  useEffect(() => {
    // If already active/approved, no need to poll
    if (currentStatus === 'ACTIVE') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/status')
        if (!res.ok) return
        const data = await res.json()

        if (data.approved && data.status === 'ACTIVE') {
          clearInterval(interval)
          setCurrentStatus('ACTIVE')
          toast.success('Your account has been approved! Unlocking features...')

          // Update session JWT if needed and refresh Server Component data
          await update?.()
          startTransition(() => {
            router.refresh()
          })
        } else if (data.status && data.status !== currentStatus) {
          setCurrentStatus(data.status)
          startTransition(() => {
            router.refresh()
          })
        }
      } catch (err) {
        console.error('Account status polling error:', err)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [currentStatus, router, update])

  return null
}

