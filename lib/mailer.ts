import nodemailer from 'nodemailer'
import { SMTP_FROM_EMAIL, SMTP_FROM_NAME } from '@/config/constants'
import { defaultEmailTemplate } from './email-templates/defaultEmailTemplate'

// Create a transporter instance
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_KEY,
  },
})

// Verify SMTP connection on startup
transporter.verify((error) => {
  if (error) {
    console.error('[SMTP] Connection verification failed:', error.message)
  } else {
    console.log('[SMTP] Connection verified successfully')
  }
})

// Send an email using the configured SMTP transporter
export async function sendMail({
  to,
  subject,
  content,
}: {
  to: string
  subject: string
  content: string
}): Promise<boolean> {
  const fromEmail = SMTP_FROM_EMAIL || process.env.SMTP_USER

  console.log('[sendMail] Attempting to send email:', {
    from: `${SMTP_FROM_NAME} <${fromEmail}>`,
    to,
    subject,
    smtpHost: process.env.SMTP_HOST,
    smtpUser: process.env.SMTP_USER,
  })

  if (!fromEmail) {
    console.error('[sendMail] No sender email configured')
    return false
  }

  try {
    const mail = await transporter.sendMail({
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

    return mail.accepted.length > 0
  } catch (error) {
    console.error('[sendMail] Failed to send email:', error)
    return false
  }
}
