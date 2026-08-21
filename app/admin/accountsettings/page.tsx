'use client'

import { useDarkMode } from '@/app/admin/DarkModeContext'
import { signOut } from 'next-auth/react'
import Settings from './settings'

export default function SettingsPage() {
  const { darkMode, setDarkMode } = useDarkMode()

  return (
    <Settings
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      onLogout={() => signOut({ callbackUrl: '/login' })}
    />
  )
}
