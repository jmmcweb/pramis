'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

interface DarkModeContextType {
  darkMode: boolean
  setDarkMode: (v: boolean) => void
}

const DarkModeContext = createContext<DarkModeContextType>({
  darkMode: false,
  setDarkMode: () => {}
})

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(false)
  return (
    <DarkModeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export const useDarkMode = () => useContext(DarkModeContext)
