export type PatientInfo = {
  fullName: string
  dateOfBirth: string
  sex: string
  civilStatus: string
  mobile: string
  email: string
  houseStreet: string
  barangay: string
  municipality: string
  province: string
  philHealthNo: string
  membershipType: string
  philHealthStatus: string
}

export type FamilyMember = {
  id: string
  name: string
  relation: string
  phone: string
}

export const initialPatient: PatientInfo = {
  fullName: 'Carla Mae Villanueva',
  dateOfBirth: '1998-03-15',
  sex: 'Female',
  civilStatus: 'Single',
  mobile: '+63 912 345 6789',
  email: 'carla.villanueva@email.com',
  houseStreet: '123 Mabini Street',
  barangay: 'Sumapang Matanda',
  municipality: 'Balanga City',
  province: 'Bataan',
  philHealthNo: '26-123456789-0',
  membershipType: 'Employed',
  philHealthStatus: 'Active',
}

export const initialFamily: FamilyMember[] = [
  { id: 'fam-1', name: 'Mr. Ramon Villanueva', relation: 'Father', phone: '0917 555 1234' },
  { id: 'fam-2', name: 'Mrs. Liza Villanueva', relation: 'Mother', phone: '0918 555 9876' },
]
