// This file contains utility functions related to age calculations, including determining a person's age from their birthdate, checking if they meet a minimum age requirement, and parsing ISO date strings. It also defines a constant for the minimum account age.

export const MIN_ACCOUNT_AGE = 18


export function ageFromBirthdate(
  birthdate: Date | null | undefined,
  on: Date = new Date(),
): number | null {
  if (!birthdate || Number.isNaN(birthdate.getTime())) return null

  const year = on.getUTCFullYear() - birthdate.getUTCFullYear()
  const beforeBirthday =
    on.getUTCMonth() < birthdate.getUTCMonth() ||
    (on.getUTCMonth() === birthdate.getUTCMonth() &&
      on.getUTCDate() < birthdate.getUTCDate())

  const age = beforeBirthday ? year - 1 : year
  return age >= 0 ? age : null
}

export function isAtLeastAge(
  birthdate: Date | null | undefined,
  minimumAge: number = MIN_ACCOUNT_AGE,
  on: Date = new Date(),
): boolean {
  const age = ageFromBirthdate(birthdate, on)
  return age !== null && age >= minimumAge
}

export function parseISODate(value?: string | null): Date | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null

  const parsed = new Date(`${value.trim()}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return null

  if (
    parsed.getUTCFullYear() !== Number(match[1]) ||
    parsed.getUTCMonth() + 1 !== Number(match[2]) ||
    parsed.getUTCDate() !== Number(match[3])
  ) {
    return null
  }

  return parsed
}