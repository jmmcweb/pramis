export const puroks = ['Purok 1A', 'Purok 1B', 'Purok 2A AND 2B', 'Purok 3A', 'Purok 3B', 'Purok 4', 'Purok 5A', 'Purok 5B', 'Purok 6', 'Purok 7', 'Purok 8']

export const emptyForm = {
  lastName: '', givenName: '', middleName: '', suffix: '', maidenName: '',
  sex: '', bloodType: '', birthdate: '', age: '', placeOfBirth: '',
  civilStatus: '', religion: '', contactNumber: '',
  fatherLastName: '', fatherGivenName: '', fatherMiddleName: '',
  motherLastName: '', motherGivenName: '', motherMiddleName: '',
  region: 'Region 3', province: 'Bulacan', city: 'City of Malolos', barangay: 'Sumapang Matanda', street: '', postalCode: '3000',
  philHealthNo: '', memberName: '', spouseName: '', memberBirthdate: '',
  completeAddress: '', memberDependent: '', familyMemberRole: '', educationalAttainment: '',
  chiefComplaints: '', diagnosis: '', medications: '',
}

export const emptyImmunization = { bcg: '', hepaB24: '', hepaBLess24: '', pentavalent1: '', mcv1: '', opv1: '', rota1: '', pcv1: '', hepaB2: '', pneumonia: '', influenza: '' }
export const emptyMedical = { date: '', bp: '', hr: '', rr: '', weight: '', height: '', temperature: '' }

export const requiredFields = [
  'lastName', 'givenName', 'middleName', 'sex', 'bloodType', 'birthdate', 'age',
  'fatherLastName', 'fatherGivenName', 'fatherMiddleName',
  'motherLastName', 'motherGivenName', 'motherMiddleName',
  'philHealthNo', 'memberName', 'spouseName', 'completeAddress', 'memberDependent',
]

export interface PatientRecord {
  id: string; purok: string; date: string
  form: Record<string, string>
  immunizationRecords: Record<string, string>[]
  medicalRecords: Record<string, string>[]
  deceased: boolean
  deceasedDate?: string
}

const rawRecords: PatientRecord[] = [
  
]

const today = new Date()
const DAY = 86400000
const shiftDate = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const mdy = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`
const parseMdy = (s: string) => { const [m, d, y] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const parseIso = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }

const recordDelta = Math.round((today.getTime() - new Date(2026, 2, 27).getTime()) / DAY)
const immunizationDelta = Math.round((today.getTime() - new Date(2026, 5, 1).getTime()) / DAY) - 7

const shiftMdy = (s: string) => mdy(shiftDate(parseMdy(s), recordDelta))
const shiftIso = (s: string) => iso(shiftDate(parseIso(s), immunizationDelta))

export const initialRecords: PatientRecord[] = rawRecords.map(r => ({
  ...r,
  date: shiftMdy(r.date),
  deceasedDate: r.deceasedDate ? shiftMdy(r.deceasedDate) : undefined,
  medicalRecords: r.medicalRecords.map(m => m.date ? { ...m, date: iso(shiftDate(parseIso(m.date), recordDelta)) } : m),
  immunizationRecords: r.immunizationRecords.map(im => {
    const next: Record<string, string> = { ...im }
    for (const k of Object.keys(next)) next[k] = shiftIso(next[k])
    return next
  }),
}))
