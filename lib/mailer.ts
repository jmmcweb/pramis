import nodemailer from 'nodemailer'
import { SMTP_FROM_EMAIL, SMTP_FROM_NAME } from '@/config/constants'
import { defaultEmailTemplate } from './email-templates/defaultEmailTemplate'

// Port 465 uses implicit TLS, 587/2525 negotiate TLS with STARTTLS.
const SMTP_PORT = Number(process.env.SMTP_PORT || 587)
const SMTP_SECURE = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE === 'true'
  : SMTP_PORT === 465

// Fail fast instead of letting a request hang when the relay is unreachable.
const SMTP_TIMEOUT_MS = 10_000

export type SendMailOptions = {
  to: string
  subject: string
  content: string
}

// Result of an SMTP send/verify attempt. `message`/`code`/`command`/`response`
// are only populated when the attempt fails (`sent === false`).
export type SendMailResult = {
  sent: boolean
  accepted: string[]
  messageId?: string
  rejected?: string[]
  response?: string
  code?: string
  command?: string
  message?: string
}

// True when every credential needed to reach the SMTP relay is present.
export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_KEY,
  )
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

// Lazily create a single transporter instance, reusing the underlying pool.
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      requireTLS: !SMTP_SECURE,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_KEY,
      },
      connectionTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: SMTP_TIMEOUT_MS,
    })
  }

  return transporter
}

// Maps raw nodemailer/SMTP failures to an actionable message.
function describeSmtpError(error: unknown): SendMailResult {
  const err = error as {
    code?: string
    command?: string
    response?: string
    message?: string
  }

  const response = err?.response?.trim()
  const detail = `${response ?? ''} ${err?.message ?? ''}`
  let hint: string | undefined

  if (/525|Unauthorized IP/i.test(detail)) {
    hint =
      'The SMTP relay rejected this server IP. In Brevo open Settings > Security > Authorized IPs, then authorize the outbound IP or click "Deactivate blocking".'
  } else if (/535|EAUTH/i.test(detail)) {
    hint =
      'Authentication failed. SMTP_USER must be the SMTP login (e.g. xxxxx@smtp-brevo.com) and SMTP_KEY the SMTP key - not the account email or an API key.'
  } else if (/55[03]|sender/i.test(detail)) {
    hint = `The sender address was rejected. Add "${SMTP_FROM_EMAIL}" as a verified sender in your SMTP provider (Brevo > Senders & Domains).`
  } else if (err?.code === 'ETIMEDOUT' || err?.code === 'ESOCKET') {
    hint = `Could not reach ${process.env.SMTP_HOST}:${SMTP_PORT}. Check SMTP_HOST/SMTP_PORT and that the network allows outbound SMTP.`
  }

  return {
    sent: false,
    accepted: [],
    code: err?.code,
    command: err?.command,
    response,
    message: [err?.message, response && `(${response})`, hint]
      .filter(Boolean)
      .join(' ')
      .trim(),
  }
}

// Verifies credentials + TLS handshake without sending a message.
export async function verifyMailer(): Promise<SendMailResult> {
  if (!isSmtpConfigured()) {
    return {
      sent: false,
      accepted: [],
      message:
        'Email service is not configured. Add SMTP_HOST, SMTP_USER, and SMTP_KEY to .env.local.',
    }
  }

  try {
    await getTransporter().verify()
    return { sent: true, accepted: [] }
  } catch (error) {
    return describeSmtpError(error)
  }
}

// Send an email using the configured SMTP transporter.
// Returns the result so callers can surface the real failure reason.
export async function sendMailDetailed({
  to,
  subject,
  content,
}: SendMailOptions): Promise<SendMailResult> {
  const fromEmail = SMTP_FROM_EMAIL || process.env.SMTP_USER

  console.log('[sendMail] Attempting to send email:', {
    from: `${SMTP_FROM_NAME} <${fromEmail}>`,
    to,
    subject,
    smtpHost: process.env.SMTP_HOST,
    smtpUser: process.env.SMTP_USER,
  })

  if (!isSmtpConfigured()) {
    console.error('[sendMail] SMTP is not configured')
    return {
      sent: false,
      accepted: [],
      message:
        'Email service is not configured. Add SMTP_HOST, SMTP_USER, and SMTP_KEY to .env.local.',
    }
  }

  if (!fromEmail) {
    console.error('[sendMail] No sender email configured')
    return {
      sent: false,
      accepted: [],
      message:
        'No sender email configured. Set SMTP_FROM_EMAIL to an address verified with your SMTP provider.',
    }
  }

  try {
    const mail = await getTransporter().sendMail({
      from: `${SMTP_FROM_NAME} <${fromEmail}>`,
      to,
      subject,
      html: defaultEmailTemplate(content),
    })

    console.log('[sendMail] Email send result:', {
      to,
      subject,
      messageId: mail.messageId,
      accepted: mail.accepted,
      rejected: mail.rejected,
      response: mail.response,
    })

    if (mail.accepted.length === 0) {
      return {
        sent: false,
        accepted: [],
        rejected: mail.rejected,
        response: mail.response,
        message: `The SMTP relay accepted no recipients. Rejected: ${
          mail.rejected?.join(', ') || 'unknown'
        }.`,
      }
    }

    return {
      sent: true,
      messageId: mail.messageId,
      accepted: mail.accepted as string[],
      rejected: mail.rejected,
      response: mail.response,
    }
  } catch (error) {
    const failure = describeSmtpError(error)
    console.error(
      '[sendMail] Failed to send email:',
      failure.code,
      failure.response,
      failure.message,
    )
    console.error(error)
    return failure
  }
}

// Send an email using the configured SMTP transporter.
export async function sendMail(options: SendMailOptions): Promise<boolean> {
  const result = await sendMailDetailed(options)
  return result.sent
}
