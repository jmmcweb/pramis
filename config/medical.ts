export const RECORD_STATUSES = [
  'Stable',
  'Under Observation',
  'Needs Follow-up',
  'Referred',
] as const

export type RecordStatus = (typeof RECORD_STATUSES)[number]