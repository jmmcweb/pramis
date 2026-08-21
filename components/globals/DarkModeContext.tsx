'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface DarkModeContextType {
  darkMode: boolean
  setDarkMode: (v: boolean) => void
}

const DarkModeContext = createContext<DarkModeContextType>({
  darkMode: false,
  setDarkMode: () => {}
})

const STORAGE_KEY = 'darkMode'

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const initial = stored === 'true'
    setDarkMode(initial)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    if (darkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem(STORAGE_KEY, String(darkMode))
  }, [darkMode, mounted])

  return (
    <DarkModeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export const useDarkMode = () => useContext(DarkModeContext)
