'use client'

import { useDarkMode } from '@/app/admin/DarkModeContext'
import AvailabilityManager from '@/components/admin/AvailabilityManager'

export default function AvailabilityPageClient() {
  const { darkMode } = useDarkMode()
  return <AvailabilityManager darkMode={darkMode} />
}
