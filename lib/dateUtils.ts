export const now = new Date()

// Add a specified number of days to a given date and return the new date.
export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

// Subtract a specified number of days from a given date and return the new date.
export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Format a given date into MM-DD-YYYY format.
export const toMMDDYYYY = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`


export const fmtLong = (d: Date) =>
  `${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} | ${d.toLocaleDateString('en-US', { weekday: 'long' })}`

export const fmtShort = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
