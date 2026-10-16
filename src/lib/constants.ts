/**
 * Maximum input length constants.
 * Applied client-side (as HTML maxLength) and server-side as a safety net so a
 * malicious request can never overflow the corresponding database column.
 */

export const MAX = {
  // Personal names: first/middle/last/surname
  NAME: 30,
  // Short name fields
  SHORT_NAME: 50,
  // Phone numbers, including country code and formatting characters
  PHONE: 11,
  // Email per RFC 5321
  EMAIL: 30,
  // Password hash length; also a sane client cap
  PASSWORD: 16,
} as const;

export const FIELD_LABELS = {
  firstName: 'First name',
  middleName: 'Middle name',
  lastName: 'Last name',
  suffix: 'Suffix',
  phoneNumber: 'Mobile number',
  email: 'Email address',
  name: 'Name',
  password: 'Password',
} as const;
