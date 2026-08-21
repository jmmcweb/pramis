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
  { id: 'PTN-2610204', purok: 'Purok 1A', date: '03-27-2026', deceased: false, form: { ...emptyForm, lastName: 'Richards', givenName: 'Alden', middleName: 'P.', sex: 'Male', bloodType: 'O+', birthdate: '1990-05-15', age: '36', placeOfBirth: 'Manila', civilStatus: 'Married', religion: 'Roman Catholic', contactNumber: '09171234567', fatherLastName: 'Richards', fatherGivenName: 'Michael', fatherMiddleName: 'D.', motherLastName: 'Santos', motherGivenName: 'Maria', motherMiddleName: 'L.', street: 'Purok 1A', philHealthNo: 'PHN-123456789', memberName: 'Alden P. Richards', spouseName: 'Sarah R. Richards', memberBirthdate: '1990-05-15', completeAddress: '123 Rizal Street, Poblacion, Manila', memberDependent: 'No', educationalAttainment: 'College Graduate', chiefComplaints: 'Patient complains of persistent headache and dizziness for the past 3 days.', diagnosis: 'Hypertension - Stage 1. Patient advised to monitor blood pressure regularly.', medications: 'Prescribed Losartan 50mg once daily. Follow-up in 2 weeks.' }, immunizationRecords: [{ bcg: '2026-01-15', hepaB24: '2026-01-15', pentavalent1: '2026-02-15', mcv1: '2026-03-15', opv1: '2026-02-15', rota1: '2026-02-15', pcv1: '2026-02-15', hepaB2: '2026-03-15', influenza: '2026-06-01' }], medicalRecords: [{ date: '2026-03-27', bp: '140/90', hr: '78', rr: '16', weight: '75', height: '5.8', temperature: '36.8' }] },
  { id: 'PTN-2610215', purok: 'Purok 1B', date: '03-27-2026', deceased: false, form: { ...emptyForm, lastName: 'Cruz', givenName: 'Dodong', middleName: 'C.', sex: 'Male', street: 'Purok 1B' }, immunizationRecords: [], medicalRecords: [] },
  { id: 'PTN-2610205', purok: 'Purok 2A AND 2B', date: '03-27-2026', deceased: false, form: { ...emptyForm, lastName: 'Santos', givenName: 'Judith', middleName: 'A.', sex: 'Female', street: 'Purok 2A AND 2B' }, immunizationRecords: [], medicalRecords: [] },
  { id: 'PTN-2610206', purok: 'Purok 3A', date: '03-26-2026', deceased: false, form: { ...emptyForm, lastName: 'Reyes', givenName: 'Maria', middleName: 'L.', sex: 'Female', street: 'Purok 3A' }, immunizationRecords: [], medicalRecords: [] },
  { id: 'PTN-2610207', purok: 'Purok 3B', date: '03-26-2026', deceased: false, form: { ...emptyForm, lastName: 'Gonzales', givenName: 'Pedro', middleName: 'M.', sex: 'Male', street: 'Purok 3B' }, immunizationRecords: [], medicalRecords: [] },
  { id: 'PTN-2610208', purok: 'Purok 4', date: '03-25-2026', deceased: false, form: { ...emptyForm, lastName: 'Flores', givenName: 'Ana', middleName: 'B.', sex: 'Female', street: 'Purok 4' }, immunizationRecords: [], medicalRecords: [] },
  { id: 'PTN-2610209', purok: 'Purok 5A', date: '03-25-2026', deceased: false, form: { ...emptyForm, lastName: 'Dela Cruz', givenName: 'Juan', middleName: 'T.', sex: 'Male', street: 'Purok 5A' }, immunizationRecords: [], medicalRecords: [] },
  { id: 'PTN-2610210', purok: 'Purok 5B', date: '03-24-2026', deceased: false, form: { ...emptyForm, lastName: 'Villanueva', givenName: 'Sofia', middleName: 'D.', sex: 'Female', street: 'Purok 5B' }, immunizationRecords: [], medicalRecords: [] },
  { id: 'PTN-2610211', purok: 'Purok 6', date: '03-24-2026', deceased: false, form: { ...emptyForm, lastName: 'Ramos', givenName: 'Carlos', middleName: 'S.', sex: 'Male', street: 'Purok 6' }, immunizationRecords: [], medicalRecords: [] },
  { id: 'PTN-2610212', purok: 'Purok 7', date: '03-23-2026', deceased: false, form: { ...emptyForm, lastName: 'Mendoza', givenName: 'Lisa', middleName: 'G.', sex: 'Female', street: 'Purok 7' }, immunizationRecords: [], medicalRecords: [] },
  { id: 'PTN-2610213', purok: 'Purok 3A', date: '02-15-2026', deceased: true, deceasedDate: '03-10-2026', form: { ...emptyForm, lastName: 'Fernandez', givenName: 'Ramon', middleName: 'S.', sex: 'Male', bloodType: 'A+', birthdate: '1945-08-20', age: '80', placeOfBirth: 'Malolos', civilStatus: 'Widowed', religion: 'Roman Catholic', contactNumber: '09181234567', fatherLastName: 'Fernandez', fatherGivenName: 'Jose', fatherMiddleName: 'M.', motherLastName: 'Garcia', motherGivenName: 'Elena', motherMiddleName: 'R.', street: 'Purok 3A', philHealthNo: 'PHN-987654321', memberName: 'Ramon S. Fernandez', spouseName: 'Luz F. Fernandez', memberBirthdate: '1945-08-20', completeAddress: '456 Mabini St., Sumapang Matanda, Malolos', memberDependent: 'No', educationalAttainment: 'Elementary Graduate', chiefComplaints: 'Patient complains of severe chest pain and shortness of breath.', diagnosis: 'Myocardial Infarction. Patient was referred to hospital.', medications: 'Administered Aspirin 325mg, Nitroglycerin 0.4mg SL.' }, immunizationRecords: [], medicalRecords: [{ date: '2026-03-01', bp: '160/100', hr: '92', rr: '22', weight: '68', height: '5.6', temperature: '37.1' }] },
  { id: 'PTN-2610214', purok: 'Purok 5A', date: '01-10-2026', deceased: true, deceasedDate: '03-22-2026', form: { ...emptyForm, lastName: 'Mercado', givenName: 'Nelia', middleName: 'D.', sex: 'Female', bloodType: 'B+', birthdate: '1938-03-12', age: '88', placeOfBirth: 'Manila', civilStatus: 'Widowed', religion: 'Roman Catholic', contactNumber: '09171239876', fatherLastName: 'Mercado', fatherGivenName: 'Teodoro', fatherMiddleName: 'R.', motherLastName: 'Luna', motherGivenName: 'Sofia', motherMiddleName: 'T.', street: 'Purok 5A', philHealthNo: 'PHN-456123789', memberName: 'Nelia D. Mercado', spouseName: 'Deceased', memberBirthdate: '1938-03-12', completeAddress: '789 Rizal Ave., Sumapang Matanda, Malolos', memberDependent: 'No', educationalAttainment: 'High School Level', chiefComplaints: 'Patient complains of difficulty breathing and fatigue.', diagnosis: 'Congestive Heart Failure. Patient was referred to specialist.', medications: 'Prescribed Furosemide 40mg daily, Enalapril 5mg daily.' }, immunizationRecords: [], medicalRecords: [{ date: '2026-03-15', bp: '150/95', hr: '88', rr: '24', weight: '62', height: '5.2', temperature: '36.9' }] },
  { id: 'PTN-2610216', purok: 'Purok 1B', date: '02-08-2026', deceased: true, deceasedDate: '04-02-2026', form: { ...emptyForm, lastName: 'Roman', givenName: 'Gregorio', middleName: 'A.', sex: 'Male', bloodType: 'O+', birthdate: '1954-11-02', age: '72', placeOfBirth: 'Malolos', civilStatus: 'Married', religion: 'Roman Catholic', contactNumber: '09171234561', fatherLastName: 'Roman', fatherGivenName: 'Luis', fatherMiddleName: 'B.', motherLastName: 'Reyes', motherGivenName: 'Carmen', motherMiddleName: 'S.', street: 'Purok 1B', philHealthNo: 'PHN-789123456', memberName: 'Gregorio A. Roman', spouseName: 'Teresa R. Roman', memberBirthdate: '1954-11-02', completeAddress: '12 Mabini St., Sumapang Matanda, Malolos', memberDependent: 'No', educationalAttainment: 'High School Graduate', chiefComplaints: 'Patient complains of persistent cough with blood-streaked sputum for 2 weeks.', diagnosis: 'Pneumonia. Patient was referred to hospital for chest X-ray.', medications: 'Prescribed Amoxicillin 500mg thrice daily, Paracetamol 500mg as needed.' }, immunizationRecords: [], medicalRecords: [{ date: '2026-03-28', bp: '130/85', hr: '86', rr: '20', weight: '58', height: '5.5', temperature: '38.2' }] },
  { id: 'PTN-2610217', purok: 'Purok 4', date: '02-20-2026', deceased: true, deceasedDate: '05-06-2026', form: { ...emptyForm, lastName: 'Bautista', givenName: 'Corazon', middleName: 'M.', sex: 'Female', bloodType: 'AB+', birthdate: '1968-07-15', age: '58', placeOfBirth: 'Bulacan', civilStatus: 'Widowed', religion: 'Iglesia Ni Cristo', contactNumber: '09171234562', fatherLastName: 'Bautista', fatherGivenName: 'Manuel', fatherMiddleName: 'C.', motherLastName: 'Santos', motherGivenName: 'Josefina', motherMiddleName: 'L.', street: 'Purok 4', philHealthNo: 'PHN-456789123', memberName: 'Corazon M. Bautista', spouseName: 'Deceased', memberBirthdate: '1968-07-15', completeAddress: '34 Del Pilar St., Sumapang Matanda, Malolos', memberDependent: 'No', educationalAttainment: 'College Graduate', chiefComplaints: 'Patient complains of abdominal pain and jaundice for the past week.', diagnosis: 'Liver Cirrhosis. Patient was referred for further evaluation.', medications: 'Prescribed Spironolactone 25mg daily, dietary restriction advised.' }, immunizationRecords: [], medicalRecords: [{ date: '2026-04-20', bp: '110/70', hr: '80', rr: '18', weight: '52', height: '5.1', temperature: '36.6' }] },
  { id: 'PTN-2610218', purok: 'Purok 6', date: '03-05-2026', deceased: true, deceasedDate: '06-14-2026', form: { ...emptyForm, lastName: 'Salazar', givenName: 'Ernesto', middleName: 'R.', sex: 'Male', bloodType: 'B-', birthdate: '1981-01-30', age: '45', placeOfBirth: 'Malolos', civilStatus: 'Married', religion: 'Roman Catholic', contactNumber: '09171234563', fatherLastName: 'Salazar', fatherGivenName: 'Rogelio', fatherMiddleName: 'D.', motherLastName: 'Cruz', motherGivenName: 'Lourdes', motherMiddleName: 'P.', street: 'Purok 6', philHealthNo: 'PHN-321654987', memberName: 'Ernesto R. Salazar', spouseName: 'Vivian S. Salazar', memberBirthdate: '1981-01-30', completeAddress: '56 Bonifacio St., Sumapang Matanda, Malolos', memberDependent: 'No', educationalAttainment: 'College Level', chiefComplaints: 'Patient collapsed at home with severe headache and slurred speech.', diagnosis: 'Cerebrovascular Accident (Stroke). Emergency referral done.', medications: 'Admitted to hospital. Antihypertensive therapy initiated.' }, immunizationRecords: [], medicalRecords: [{ date: '2026-05-30', bp: '180/110', hr: '95', rr: '22', weight: '84', height: '5.9', temperature: '37.0' }] },
  { id: 'PTN-0001001', purok: 'Purok 1A', date: '04-01-2026', deceased: false, form: { ...emptyForm, lastName: 'Patient', givenName: 'One', middleName: '', sex: 'Male', street: 'Purok 1A' }, immunizationRecords: [], medicalRecords: [] },
  { id: 'PTN-0001002', purok: 'Purok 1B', date: '04-01-2026', deceased: false, form: { ...emptyForm, lastName: 'Patient', givenName: 'Two', middleName: '', sex: 'Female', street: 'Purok 1B' }, immunizationRecords: [], medicalRecords: [] },
  { id: 'PTN-0001003', purok: 'Purok 2A AND 2B', date: '04-01-2026', deceased: false, form: { ...emptyForm, lastName: 'Patient', givenName: 'Three', middleName: '', sex: 'Male', street: 'Purok 2A AND 2B' }, immunizationRecords: [], medicalRecords: [] },
  { id: 'PTN-0001004', purok: 'Purok 3A', date: '04-01-2026', deceased: false, form: { ...emptyForm, lastName: 'Patient', givenName: 'Four', middleName: '', sex: 'Female', street: 'Purok 3A' }, immunizationRecords: [], medicalRecords: [] },
  { id: 'PTN-0001005', purok: 'Purok 3B', date: '04-01-2026', deceased: false, form: { ...emptyForm, lastName: 'Patient', givenName: 'Five', middleName: '', sex: 'Male', street: 'Purok 3B' }, immunizationRecords: [], medicalRecords: [] },
  { id: 'PTN-0001006', purok: 'Purok 4', date: '04-01-2026', deceased: false, form: { ...emptyForm, lastName: 'Patient', givenName: 'Six', middleName: '', sex: 'Female', street: 'Purok 4' }, immunizationRecords: [], medicalRecords: [] },
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
