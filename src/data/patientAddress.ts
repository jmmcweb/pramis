

export type PatientAddressLike = {
  houseNumber?: string | null
  purok?: string | null
  barangay?: string | null
  city?: string | null
}

export function patientAddressLines(p: PatientAddressLike): string[] {
  const clean = (v?: string | null) => (v || '').trim()
  const street = [clean(p.houseNumber), clean(p.purok)]
    .filter(Boolean)
    .join(', ')
  const locality = [clean(p.barangay), clean(p.city)].filter(Boolean).join(', ')
  return [street, locality].filter(Boolean)
}
