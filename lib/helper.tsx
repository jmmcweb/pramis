// Validates email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return /^[9]\d{9}$/.test(digits)
}
