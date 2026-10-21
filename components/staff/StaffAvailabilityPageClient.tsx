'use client'

import { useDarkMode } from '@/app/staff/DarkModeContext'
import StaffAvailabilityManager from '@/components/staff/StaffAvailabilityManager'

export default function StaffAvailabilityPageClient() {
  const { darkMode } = useDarkMode()
  return <StaffAvailabilityManager darkMode={darkMode} />
}
