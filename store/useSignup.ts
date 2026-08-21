import { create } from 'zustand'

type SignupState = {
  firstName: string
  lastName: string
  birthday: string
  gender: string
  countryCode: string
  mobile: string
  email: string
  password: string
  street: string
  barangay: string
  city: string
  province: string
  zip: string
  country: string
  idType: string
  idPhoto: string
  setPersonal: (data: Partial<SignupState>) => void
  setResidence: (data: Partial<SignupState>) => void
  setIdentification: (data: Partial<SignupState>) => void
}

export const useSignup = create<SignupState>()((set) => ({
  firstName: '',
  lastName: '',
  birthday: '',
  gender: '',
  countryCode: '+63',
  mobile: '',
  email: '',
  password: '',
  street: '',
  barangay: '',
  city: '',
  province: '',
  zip: '',
  country: 'Philippines',
  idType: '',
  idPhoto: '',
  setPersonal: (data) => set((state) => ({ ...state, ...data })),
  setResidence: (data) => set((state) => ({ ...state, ...data })),
  setIdentification: (data) => set((state) => ({ ...state, ...data })),
}))
