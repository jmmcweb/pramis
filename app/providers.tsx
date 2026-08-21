"use client"

import { SessionProvider } from "next-auth/react"
import { DarkModeProvider } from "@/components/globals/DarkModeContext"
import { FontSizeProvider } from "@/components/globals/FontSizeContext"

type Props = {
  children?: React.ReactNode
}

export const Providers = ({ children }: Props) => {
  return (
    <FontSizeProvider>
      <DarkModeProvider>
        <SessionProvider>{children}</SessionProvider>
      </DarkModeProvider>
    </FontSizeProvider>
  )
}