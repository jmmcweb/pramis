import nodemailer from 'nodemailer'
import { SMTP_FROM_EMAIL, SMTP_FROM_NAME } from '@/config/constants'
import { defaultEmailTemplate } from './email-templates/defaultEmailTemplate'

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

// Sends an HTML email wrapped in the default template. Returns whether the
// message was accepted by the relay; never throws to the caller.
export async function sendMail({
  to,
  subject,
  content,
}: {
  to: string
  subject: string
  content: string
}): Promise<boolean> {
  if (!SMTP_FROM_EMAIL) {
    console.error('[sendMail] SMTP_FROM_EMAIL is not configured')
    return false
  }

  try {
    const mail = await transporter.sendMail({
      from: `${SMTP_FROM_NAME} <${SMTP_FROM_EMAIL}>`,
      to,
      subject,
      html: defaultEmailTemplate(content),
    })
    return mail.accepted.length > 0
  } catch (error) {
    console.error('[sendMail] Failed to send email:', error)
    return false
  }
}
