export const ANALYTICS_RANGES = [
  { key: '7D', label: 'Past 7 Days', days: 7 },
  { key: '1M', label: 'Past 1 Month', days: 30 },
  { key: '3M', label: 'Past 3 Months', days: 90 },
  { key: '6M', label: 'Past 6 Months', days: 180 },
  { key: '9M', label: 'Past 9 Months', days: 270 },
  { key: '12M', label: 'Past 12 Months', days: 365 },
] as const

export type AnalyticsRangeKey =
  (typeof ANALYTICS_RANGES)[number]['key']