/**
 * Shared validation helpers.
 *
 * NOTE: `lib/actions/user.ts` and `lib/actions/patients.ts` already import
 * `isValidEmail` from this module, so keep the exported name identical.
 */

export function isValidEmail(value: string): boolean {
  // RFC 5321/5322-ish practical check; length is also capped in the caller.
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  return emailRegex.test(value.trim())
}

/** Philippines mobile number (9 + 9 digits), digits-only accepted. */
export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return /^[9]\d{9}$/.test(digits)
}

/** Allows a leading "63" country code in place of "9", still 10 digits total. */
export function isValidPhoneWithCountryCode(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return /^(63|0)?[9]\d{9}$/.test(digits)
}
