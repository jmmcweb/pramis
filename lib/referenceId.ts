import prisma from '@/lib/prisma'

// Prefix reference for generation of id
const REFERENCE_TABLES = {
  USR: { table: 'users', column: 'id' },
  ADM: { table: 'Staff', column: 'staffid' },
  MS: { table: 'Staff', column: 'staffid' },
  PRF: { table: 'UserProfile', column: 'userprofileid' },
  FAM: { table: 'FamilyMember', column: 'familymemberid' },
  SVC: { table: 'Service', column: 'serviceid' },
  EVT: { table: 'Event', column: 'eventid' },
  PTN: { table: 'Patient', column: 'patientid' },
  APT: { table: 'Appointment', column: 'appointmentid' },
  MED: { table: 'MedicalHistory', column: 'medhisid' },
  WIQ: { table: 'WalkInQueue', column: 'qid' },
  NTF: { table: 'Notification', column: 'notificationid' },
  AUD: { table: 'audit_logs', column: 'logid' },
} as const

export type ReferencePrefix = keyof typeof REFERENCE_TABLES

// Gets the next id for a given prefix by querying the corresponding table and column in the database. It retrieves the maximum numeric part of the existing ids with the specified prefix, increments it by 1, and returns the new id in the format "PREFIX-NEXT_NUMBER".
export async function nextReferenceId(prefix: ReferencePrefix) {
  const { table, column } = REFERENCE_TABLES[prefix]
  const rows = await prisma.$queryRawUnsafe<Array<{ next: number }>>(
    `SELECT COALESCE(MAX(CAST(SPLIT_PART("${column}", '-', 2) AS INTEGER)), 1000) + 1 AS next
     FROM "${table}"
     WHERE "${column}" LIKE $1`,
    `${prefix}-%`,
  )

  return `${prefix}-${rows[0]?.next || 1001}`
}