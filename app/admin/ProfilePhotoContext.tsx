'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

interface ProfilePhotoContextType {
  photo: string | null
  setPhoto: (v: string | null) => void
}

const ProfilePhotoContext = createContext<ProfilePhotoContextType>({
  photo: null,
  setPhoto: () => {}
})

export function ProfilePhotoProvider({ children }: { children: ReactNode }) {
  const [photo, setPhoto] = useState<string | null>(null)
  return (
    <ProfilePhotoContext.Provider value={{ photo, setPhoto }}>
      {children}
    </ProfilePhotoContext.Provider>
  )
}

export const useProfilePhoto = () => useContext(ProfilePhotoContext)
