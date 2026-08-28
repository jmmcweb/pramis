import { FIXED_ADDRESS, PUROKS } from '@/src/data/patientInfo'

export type PopulationData = {
  barangay: string
  location: string
  total: number
  households: number
  avgHouseholdSize: number
  male: number
  female: number
  patientRecords: number
  ageGroups: { label: string; value: number }[]
  puroks: { label: string; value: number }[]
}

export type PopulationView = {
  barangay: string
  location: string
  total: number
  households: number
  avgHouseholdSize: number
  male: number
  female: number
  patientRecords: number
  ageGroups: { label: string; value: number; color: string }[]
  puroks: { label: string; value: number; color: string }[]
  purokTotal: number
}

export const PUROK_COLORS = [
  '#4E69D3', // Purok 1A
  '#8B5CF6', // Purok 1B
  '#0EA5E9', // Purok 2A & 2B
  '#10B981', // Purok 3A
  '#F59E0B', // Purok 3B
  '#EF4444', // Purok 4
  '#EC4899', // Purok 5A
  '#14B8A6', // Purok 5B
  '#7C3AED', // Purok 6
  '#F97316', // Purok 7
  '#6366F1', // Purok 8
]

export const AGE_GROUP_COLORS = [
  '#4E69D3', // 0-4
  '#7C3AED', // 5-14
  '#0EA5E9', // 15-24
  '#10B981', // 25-34
  '#F59E0B', // 35-44
  '#EF4444', // 45-54
  '#8B5CF6', // 55-64
  '#EC4899', // 65+
]

export const DEFAULT_POPULATION: PopulationData = {
  barangay: FIXED_ADDRESS.barangay,
  location: `${FIXED_ADDRESS.municipality}, ${FIXED_ADDRESS.province}`,
  total: 8908,
  households: 1913,
  avgHouseholdSize: 4.66,
  male: 4481,
  female: 4427,
  patientRecords: 5432,
  ageGroups: [
    { label: '0-4', value: 1424 },
    { label: '5-14', value: 1738 },
    { label: '15-24', value: 1692 },
    { label: '25-34', value: 1268 },
    { label: '35-44', value: 1104 },
    { label: '45-54', value: 812 },
    { label: '55-64', value: 534 },
    { label: '65+', value: 336 },
  ],
  puroks: [
    { label: 'Purok 1A', value: 660 },
    { label: 'Purok 1B', value: 555 },
    { label: 'Purok 2A & 2B', value: 1142 },
    { label: 'Purok 3A', value: 630 },
    { label: 'Purok 3B', value: 459 },
    { label: 'Purok 4', value: 1318 },
    { label: 'Purok 5A', value: 510 },
    { label: 'Purok 5B', value: 466 },
    { label: 'Purok 6', value: 1253 },
    { label: 'Purok 7', value: 988 },
    { label: 'Purok 8', value: 500 },
  ],
}

export function toPopulationView(data: PopulationData): PopulationView {
  return {
    ...data,
    ageGroups: data.ageGroups.map((g, i) => ({
      ...g,
      color: AGE_GROUP_COLORS[i % AGE_GROUP_COLORS.length],
    })),
    puroks: data.puroks.map((p, i) => ({
      ...p,
      color: PUROK_COLORS[i % PUROK_COLORS.length],
    })),
    purokTotal: data.puroks.reduce((sum, p) => sum + p.value, 0),
  }
}

export { PUROKS }
