export const APP_NAME = 'MediTrack'
export const APP_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://meditrack.vercel.app'
    : 'http://localhost:3000'

export const SCHOOL_NAME = 'MediTrack'

export const SMTP_FROM_NAME = 'MediTrack'
// The "From" address for outgoing emails. Must be a sender verified in the Brevo
// account (Brevo -> Senders, Domains & Dedicated IPs). SMTP_USER is only the SMTP
// login credential and is NOT a valid sender address.
export const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'lagazon.james.bsis@gmail.com'

export const USERS_PER_PAGE = 5
