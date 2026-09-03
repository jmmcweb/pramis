import { redirect } from 'next/navigation'

// Queueing moved to the med-staff area. Keep the old URL working.
export default function PatientRecordPage() {
  redirect('/staff/queueing')
}
