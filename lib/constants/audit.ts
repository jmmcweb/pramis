// Shared constants and labels for the audit trail. This module is deliberately
// NOT a "use server" file so the constants can be imported by client components.

// Only actions performed by these roles are recorded in the audit trail.
export const AUDITED_ROLES = ['SUPERADMIN', 'ADMIN', 'MEDSTAFF'] as const

export const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'ARCHIVE',
  'RESTORE',
  'APPROVE',
  'REJECT',
  'STATUS_CHANGE',
  'LOGIN',
  'LOGIN_FAILED',
  'LOGOUT',
  'PASSWORD_CHANGE',
  'PASSWORD_RESET',
  'NOTIFY',
  'VIEW',
] as const

export const AUDIT_ENTITIES = [
  'ACCOUNT',
  'USER',
  'STAFF',
  'PATIENT',
  'APPOINTMENT',
  'QUEUE',
  'MEDICAL_RECORD',
  'SERVICE',
  'EVENT',
  'AUTH',
  'PROFILE',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]
export type AuditEntity = (typeof AUDIT_ENTITIES)[number]
export type AuditStatus = 'SUCCESS' | 'FAILURE'
export type AuditActorType = 'USER' | 'STAFF' | 'SYSTEM'

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  ARCHIVE: 'Archived',
  RESTORE: 'Restored',
  APPROVE: 'Approved',
  REJECT: 'Rejected',
  STATUS_CHANGE: 'Status Changed',
  LOGIN: 'Signed In',
  LOGIN_FAILED: 'Failed Sign In',
  LOGOUT: 'Signed Out',
  PASSWORD_CHANGE: 'Password Changed',
  PASSWORD_RESET: 'Password Reset',
  NOTIFY: 'Notification Sent',
  VIEW: 'Viewed',
}

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  ACCOUNT: 'Account',
  USER: 'User',
  STAFF: 'Staff',
  PATIENT: 'Patient',
  APPOINTMENT: 'Appointment',
  QUEUE: 'Queue',
  MEDICAL_RECORD: 'Medical Record',
  SERVICE: 'Service',
  EVENT: 'Event',
  AUTH: 'Authentication',
  PROFILE: 'Profile',
}

export const AUDIT_ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MEDSTAFF: 'Medical Staff',
  USER: 'Patient',
  SYSTEM: 'System',
}