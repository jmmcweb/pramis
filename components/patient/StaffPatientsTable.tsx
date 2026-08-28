'use client'

import { useDarkMode } from '@/app/staff/DarkModeContext'
import PatientsTable from '@/components/patient/PatientsTable'
import type { PatientListItem } from '@/lib/actions/patients'

export default function StaffPatientsTable({ patients }: { patients: PatientListItem[] }) {
  const { darkMode } = useDarkMode()
  return <PatientsTable patients={patients} darkMode={darkMode} />
}
