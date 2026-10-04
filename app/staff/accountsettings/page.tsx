'use client'

import { useDarkMode } from '@/app/staff/DarkModeContext'
import { useLogoutConfirmation } from '@/components/ui/LogoutConfirmDialog'
import Settings from './settings'

export default function SettingsPage() {
  const { darkMode, setDarkMode } = useDarkMode()
  const { requestLogout, logoutDialog } = useLogoutConfirmation({ darkMode })

  return (
    <>
      <Settings
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onLogout={requestLogout}
      />
      {logoutDialog}
    </>
  )
}
