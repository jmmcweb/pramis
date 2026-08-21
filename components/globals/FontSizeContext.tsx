'use client'
import { createContext, useContext, useState, useLayoutEffect, ReactNode } from 'react'

export type FontSize = 'small' | 'medium' | 'large'

export const FONT_SCALES: Record<FontSize, string> = {
  small: '0.9',
  medium: '1',
  large: '1.15',
}

interface FontSizeContextType {
  fontSize: FontSize
  setFontSize: (v: FontSize) => void
}

const FontSizeContext = createContext<FontSizeContextType>({
  fontSize: 'medium',
  setFontSize: () => {}
})

const STORAGE_KEY = 'fontSize'

function applyFontSize(fontSize: FontSize) {
  const root = document.documentElement
  root.setAttribute('data-font-size', fontSize)
  root.style.zoom = FONT_SCALES[fontSize]
}

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSize] = useState<FontSize>('medium')

  useLayoutEffect(() => {
    let initial: FontSize = 'medium'
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'small' || stored === 'large') initial = stored
    } catch {
      initial = 'medium'
    }
    setFontSize(initial)
  }, [])

  useLayoutEffect(() => {
    try {
      applyFontSize(fontSize)
      localStorage.setItem(STORAGE_KEY, fontSize)
    } catch {}
  }, [fontSize])

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  )
}

export const useFontSize = () => useContext(FontSizeContext)
