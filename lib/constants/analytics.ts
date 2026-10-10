export const ANALYTICS_RANGES = [
  { key: '7D', label: 'Past 7 Days', days: 7 },
  { key: '1M', label: 'Past 1 Month', days: 30 },
  { key: '3M', label: 'Past 3 Months', days: 90 },
  { key: '6M', label: 'Past 6 Months', days: 180 },
  { key: '12M', label: 'Past 1 Year', days: 365 },
  { key: 'ALL', label: 'All Time', days: 0 },
  { key: 'YEAR', label: 'By Year', days: 0 },
] as const

export type AnalyticsRangeKey = (typeof ANALYTICS_RANGES)[number]['key']

export const ANALYTICS_YEAR_RANGE_KEY = 'YEAR' as const

export function isYearRangeKey(key: AnalyticsRangeKey): boolean {
  return key === ANALYTICS_YEAR_RANGE_KEY
}

export const ANALYTICS_REPORT_SECTIONS = [
  { key: 'summary', label: 'Key performance indicators' },
  { key: 'executiveSummary', label: 'Executive summary & key findings' },
  { key: 'serviceShare', label: 'Service utilization' },
  { key: 'reasons', label: 'Top appointment reasons' },
  { key: 'outcomes', label: 'Appointment outcomes' },
  { key: 'peakHours', label: 'Peak hours' },
  { key: 'ageGroups', label: 'Age group distribution' },
  { key: 'diseases', label: 'Disease / case reports' },
  { key: 'sexByService', label: 'Sex by service' },
  { key: 'immunization', label: 'Immunization activity' },
  { key: 'bloodTypes', label: 'Blood type distribution' },
  { key: 'vitals', label: 'Average vital signs' },
  { key: 'pwdStats', label: 'PWD & senior citizen overview' },
  { key: 'dailyTrend', label: 'Daily appointment trend' },
  { key: 'weeklyTrend', label: 'Weekly appointment trend' },
  { key: 'monthlyTrend', label: 'Monthly rollup' },
  { key: 'serviceMatrix', label: 'Service breakdown table' },
  { key: 'topPatients', label: 'Most frequent patients' },
  { key: 'patientAppendix', label: 'Patient-level appendix' },
] as const

export type AnalyticsReportSectionKey =
  (typeof ANALYTICS_REPORT_SECTIONS)[number]['key']

export const DEFAULT_ANALYTICS_REPORT_SECTIONS: AnalyticsReportSectionKey[] =
  ANALYTICS_REPORT_SECTIONS.map((s) => s.key)

export const ANALYTICS_DETAIL_SECTIONS = [
  { key: 'serviceShare', label: 'Service utilization' },
  { key: 'reasons', label: 'Top appointment reasons' },
  { key: 'outcomes', label: 'Appointment outcomes' },
  { key: 'peakHours', label: 'Peak hours' },
  { key: 'ageGroups', label: 'Age group distribution' },
  { key: 'diseases', label: 'Disease / case reports' },
  { key: 'sexByService', label: 'Sex by service' },
  { key: 'immunization', label: 'Immunization activity' },
  { key: 'bloodTypes', label: 'Blood type distribution' },
  { key: 'repeatVisits', label: 'Repeat visits' },
  { key: 'walkIns', label: 'Walk-in appointments' },
  { key: 'pwd', label: 'PWD patients' },
  { key: 'senior', label: 'Senior citizen patients' },
] as const

export type AnalyticsDetailSection =
  (typeof ANALYTICS_DETAIL_SECTIONS)[number]['key']

/** Human-readable title for a drill-down section. */
export function analyticsDetailSectionLabel(
  section: AnalyticsDetailSection,
): string {
  return (
    ANALYTICS_DETAIL_SECTIONS.find((s) => s.key === section)?.label ??
    'Patient details'
  )
}

export type AnalyticsDetailColumn = {
  key: string
  label: string
  align?: 'left' | 'right'
}

export const ANALYTICS_DETAIL_COLUMNS: Record<
  string,
  AnalyticsDetailColumn[]
> = {
  serviceShare: [
    { key: 'patientName', label: 'Patient' },
    { key: 'service', label: 'Service' },
    { key: 'reason', label: 'Reason' },
    { key: 'outcome', label: 'Outcome' },
    { key: 'date', label: 'Date' },
  ],
  reasons: [
    { key: 'patientName', label: 'Patient' },
    { key: 'reason', label: 'Reason' },
    { key: 'service', label: 'Service' },
    { key: 'outcome', label: 'Outcome' },
    { key: 'date', label: 'Date' },
  ],
  outcomes: [
    { key: 'patientName', label: 'Patient' },
    { key: 'outcome', label: 'Outcome' },
    { key: 'service', label: 'Service' },
    { key: 'slot', label: 'Time' },
    { key: 'date', label: 'Date' },
  ],
  peakHours: [
    { key: 'patientName', label: 'Patient' },
    { key: 'slot', label: 'Time slot' },
    { key: 'service', label: 'Service' },
    { key: 'outcome', label: 'Outcome' },
    { key: 'date', label: 'Date' },
  ],
  ageGroups: [
    { key: 'patientName', label: 'Patient' },
    { key: 'age', label: 'Age', align: 'right' },
    { key: 'sex', label: 'Sex' },
    { key: 'service', label: 'Service' },
    { key: 'date', label: 'Date' },
  ],
  diseases: [
    { key: 'patientName', label: 'Patient' },
    { key: 'disease', label: 'Condition' },
    { key: 'diagnosis', label: 'Diagnosis' },
    { key: 'age', label: 'Age', align: 'right' },
    { key: 'checkedBy', label: 'Recorded by' },
    { key: 'date', label: 'Date' },
  ],
  sexByService: [
    { key: 'patientName', label: 'Patient' },
    { key: 'sex', label: 'Sex' },
    { key: 'age', label: 'Age', align: 'right' },
    { key: 'service', label: 'Service' },
    { key: 'date', label: 'Date' },
  ],
  immunization: [
    { key: 'patientName', label: 'Patient' },
    { key: 'age', label: 'Age', align: 'right' },
    { key: 'service', label: 'Service / vaccine' },
    { key: 'outcome', label: 'Outcome' },
    { key: 'date', label: 'Date' },
  ],
  bloodTypes: [
    { key: 'patientName', label: 'Patient' },
    { key: 'bloodType', label: 'Blood type' },
    { key: 'age', label: 'Age', align: 'right' },
    { key: 'sex', label: 'Sex' },
    { key: 'service', label: 'Service' },
    { key: 'date', label: 'Date' },
  ],
  repeatVisits: [
    { key: 'patientName', label: 'Patient' },
    { key: 'visits', label: 'Visits', align: 'right' },
    { key: 'age', label: 'Age', align: 'right' },
    { key: 'sex', label: 'Sex' },
    { key: 'service', label: 'Service' },
    { key: 'date', label: 'Last visit' },
  ],
  walkIns: [
    { key: 'patientName', label: 'Patient' },
    { key: 'age', label: 'Age', align: 'right' },
    { key: 'sex', label: 'Sex' },
    { key: 'service', label: 'Service' },
    { key: 'outcome', label: 'Outcome' },
    { key: 'date', label: 'Date' },
  ],
  pwd: [
    { key: 'patientName', label: 'Patient' },
    { key: 'age', label: 'Age', align: 'right' },
    { key: 'sex', label: 'Sex' },
    { key: 'service', label: 'Service' },
    { key: 'date', label: 'Date' },
  ],
  senior: [
    { key: 'patientName', label: 'Patient' },
    { key: 'age', label: 'Age', align: 'right' },
    { key: 'sex', label: 'Sex' },
    { key: 'service', label: 'Service' },
    { key: 'date', label: 'Date' },
  ],
}

export const DEFAULT_ANALYTICS_DETAIL_COLUMNS: AnalyticsDetailColumn[] = [
  { key: 'patientName', label: 'Patient' },
  { key: 'age', label: 'Age', align: 'right' },
  { key: 'sex', label: 'Sex' },
  { key: 'bloodType', label: 'Blood type' },
  { key: 'service', label: 'Service' },
  { key: 'address', label: 'Address' },
  { key: 'contact', label: 'Contact' },
  { key: 'date', label: 'Date' },
]

export const ANALYTICS_PATIENT_DETAIL_COLUMNS: AnalyticsDetailColumn[] = [
  { key: 'address', label: 'Address' },
  { key: 'contact', label: 'Contact' },
  { key: 'bloodType', label: 'Blood type' },
  { key: 'philHealth', label: 'PhilHealth' },
]

export const ANALYTICS_APPENDIX_COLUMNS: AnalyticsDetailColumn[] = [
  { key: 'patientName', label: 'Patient' },
  { key: 'age', label: 'Age', align: 'right' },
  { key: 'sex', label: 'Sex' },
  { key: 'service', label: 'Service' },
  { key: 'reason', label: 'Reason' },
  { key: 'outcome', label: 'Outcome' },
  { key: 'diagnosis', label: 'Diagnosis' },
  { key: 'date', label: 'Date' },
]
