import { create } from 'zustand'

type SignupState = {
  firstName: string
  middleName: string
  lastName: string
  suffix: string
  birthday: string
  gender: string
  countryCode: string
  mobile: string
  email: string
  password: string
  street: string
  purok: string
  barangay: string
  city: string
  province: string
  zip: string
  country: string
  idType: string
  idPhoto: string
  // null = the patient has not answered the PWD question yet
  isPwd: boolean | null
  pwdIdImage: string
  setPersonal: (data: Partial<SignupState>) => void
  setResidence: (data: Partial<SignupState>) => void
  setIdentification: (data: Partial<SignupState>) => void
}

export const useSignup = create<SignupState>()((set) => ({
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  birthday: '',
  gender: '',
  countryCode: '+63',
  mobile: '',
  email: '',
  password: '',
  street: '',
  purok: '',
  barangay: '',
  city: '',
  province: '',
  zip: '',
  country: 'Philippines',
  idType: '',
  idPhoto: '',
  isPwd: null,
  pwdIdImage: '',
  setPersonal: (data) => set((state) => ({ ...state, ...data })),
  setResidence: (data) => set((state) => ({ ...state, ...data })),
  setIdentification: (data) => set((state) => ({ ...state, ...data })),
}))
