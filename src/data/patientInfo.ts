
// Type definition for the patient's personal and contact information, including address and PhilHealth details.
export type PatientInfo = {
  firstName: string
  middleName: string
  lastName: string
  suffix: string
  dateOfBirth: string
  mobile: string
  email: string
  houseStreet: string
  barangay: string
  municipality: string
  province: string
  zipCode: string
  philHealthNo: string
  membershipType: string
  philHealthStatus: string
}

// Sets the default address values for the application, which are used in various components and API responses.
export const FIXED_ADDRESS = {
  barangay: 'Sumapang Matanda',
  municipality: 'Malolos',
  province: 'Bulacan',
  zipCode: '3000',
  country: 'Philippines',
} as const

// List of predefined puroks in the barangay for address selection.
export const PUROKS: string[] = [
  'Purok 1A',
  'Purok 1B',
  'Purok 2A',
  'Purok 2B',
  'Purok 3A',
  'Purok 3B',
  'Purok 4',
  'Purok 5A',
  'Purok 5B',
  'Purok 6',
  'Purok 7',
  'Purok 8',
]

// Returns the fixed address for the application.
export type AddressOptions = {
  success: boolean
  message: string
  barangay: string
  municipality: string
  province: string
  zipCode: string
  country: string
  puroks: string[]
}

// Returns the fixed address options for the application.
export function getAddressOptions(): AddressOptions {
  return {
    success: true,
    message: 'Address options fetched successfully.',
    barangay: FIXED_ADDRESS.barangay,
    municipality: FIXED_ADDRESS.municipality,
    province: FIXED_ADDRESS.province,
    zipCode: FIXED_ADDRESS.zipCode,
    country: FIXED_ADDRESS.country,
    puroks: PUROKS,
  }
}

// Type definition for a family member row in the family members table.
export type FamilyMemberRow = {
  id: string
  name: string
  relation: string
  phone: string
}

// Type definition for the user's profile view, which includes personal and address information.
export type MyProfileView = {
  referenceId: string
  email: string
  firstName: string
  middleName: string
  lastName: string
  suffix: string
  /** YYYY-MM-DD */
  birthdate: string
  phoneNumber: string
  houseNumber: string
  barangay: string
  city: string
  province: string
  zipCode: string
  philHealthNo: string
  membershipType: string
  philHealthStatus: string
  familyMembers: FamilyMemberRow[]
}

export const emptyPatientInfo: PatientInfo = {
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  dateOfBirth: '',
  mobile: '',
  email: '',
  houseStreet: '',
  barangay: '',
  municipality: '',
  province: '',
  zipCode: '',
  philHealthNo: '',
  membershipType: '',
  philHealthStatus: '',
}

export function patientInfoFromProfile(profile: MyProfileView): PatientInfo {
  return {
    firstName: profile.firstName || '',
    middleName: profile.middleName || '',
    lastName: profile.lastName || '',
    suffix: profile.suffix || '',
    dateOfBirth: profile.birthdate || '',
    mobile: profile.phoneNumber || '',
    email: profile.email || '',
    houseStreet: profile.houseNumber || '',
    barangay: profile.barangay || '',
    municipality: profile.city || '',
    province: profile.province || '',
    zipCode: profile.zipCode || '',
    philHealthNo: profile.philHealthNo || '',
    membershipType: profile.membershipType || '',
    philHealthStatus: profile.philHealthStatus || '',
  }
}