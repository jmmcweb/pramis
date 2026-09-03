import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'
import { getPatients } from '@/lib/actions/patients'
import type { PatientListItem } from '@/lib/actions/patients'
import StaffPatientsTable from '@/components/patient/StaffPatientsTable'

// 
export const metadata: Metadata = {
  title: 'Patient Records | Meditrack',
  description: 'Manage patient records',
}

const VIEWER_ROLES = ['SUPERADMIN', 'ADMIN', 'MEDSTAFF']

export default async function PatientRecordPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  if (!VIEWER_ROLES.includes((session.user.role as string) ?? '')) {
    redirect('/login')
  }

  const res = await getPatients()
  const patients = (res.success ? res.patients : []) as PatientListItem[]

  return <StaffPatientsTable patients={patients} />
}
