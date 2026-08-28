import prisma from '@/lib/prisma'
import { FIXED_ADDRESS, PUROKS } from '@/src/data/patientInfo'
import type { PopulationData } from '@/src/data/population'

const AGE_GROUP_LABELS = [
  '0-4',
  '5-14',
  '15-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+',
] as const

function ageGroupIndex(age: number) {
  if (age <= 4) return 0
  if (age <= 14) return 1
  if (age <= 24) return 2
  if (age <= 34) return 3
  if (age <= 44) return 4
  if (age <= 54) return 5
  if (age <= 64) return 6
  return 7
}

// Extracts the purok from a given house number string, if present.
function extractPurok(houseNumber?: string | null) {
  if (!houseNumber) return null
  const haystack = houseNumber.toLowerCase()
  return PUROKS.find((p) => haystack.includes(p.toLowerCase())) ?? null
}

// 
export async function computePopulationData(): Promise<PopulationData> {
  const [patients, profiles] = await Promise.all([
    (prisma as any).patient.findMany({
      select: {
        patientid: true,
        userId: true,
        sex: true,
        birthdate: true,
        houseNumber: true,
      },
    }),
    (prisma as any).userProfile.findMany({
      select: { userId: true, birthdate: true, houseNumber: true },
    }),
  ])

  const usersWithPatient = new Set(
    patients.map((p: any) => p.userId).filter(Boolean),
  )

  type Person = { houseNumber: string | null; sex: string | null; birthdate: Date | null }
  const persons: Person[] = patients.map((p: any) => ({
    houseNumber: p.houseNumber,
    sex: p.sex,
    birthdate: p.birthdate,
  }))
  for (const profile of profiles) {
    if (!usersWithPatient.has(profile.userId)) {
      persons.push({
        houseNumber: profile.houseNumber,
        sex: null,
        birthdate: profile.birthdate,
      })
    }
  }

  const purokCounts = new Map<string, number>(PUROKS.map((p) => [p, 0]))
  const ageCounts = AGE_GROUP_LABELS.map(() => 0)
  let male = 0
  let female = 0
  const households = new Set<string>()

  const now = Date.now()
  const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000

  for (const person of persons) {
    const purok = extractPurok(person.houseNumber)
    if (purok) {
      purokCounts.set(purok, (purokCounts.get(purok) ?? 0) + 1)
    }

    const sex = person.sex?.trim().toLowerCase()
    if (sex === 'male' || sex === 'm') male++
    else if (sex === 'female' || sex === 'f') female++

    if (person.birthdate) {
      const age = Math.floor((now - new Date(person.birthdate).getTime()) / YEAR_MS)
      if (age >= 0) ageCounts[ageGroupIndex(age)]++
    }

    const houseKey = person.houseNumber?.trim().toLowerCase()
    if (houseKey) households.add(houseKey)
  }

  const total = persons.length
  const householdCount = households.size

  return {
    barangay: FIXED_ADDRESS.barangay,
    location: `${FIXED_ADDRESS.municipality}, ${FIXED_ADDRESS.province}`,
    total,
    households: householdCount,
    avgHouseholdSize: householdCount
      ? Math.round((total / householdCount) * 100) / 100
      : 0,
    male,
    female,
    patientRecords: patients.length,
    ageGroups: AGE_GROUP_LABELS.map((label, i) => ({
      label,
      value: ageCounts[i],
    })),
    puroks: PUROKS.map((label) => ({
      label,
      value: purokCounts.get(label) ?? 0,
    })),
  }
}
