// This file contains the HTML content for the account approved email template.

import { APP_BASE_URL, APP_NAME } from '@/config/constants'

export function accountApprovedEmailContent(firstName?: string | null): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'

  return `
    <p style="margin:0 0 16px;">${greeting}</p>
    <p style="margin:0 0 16px;">
      Good news! Your <strong>${APP_NAME}</strong> account has been
      <strong>approved</strong>.
    </p>
    <p style="margin:0 0 16px;">
      You can now sign in and start booking appointments, viewing your health
      records, and managing your profile.
    </p>
    <p style="margin:0 0 24px;">
      <a
        href="${APP_BASE_URL}/login"
        style="display:inline-block;background:#16A34A;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;"
      >
        Sign In Now
      </a>
    </p>
    <p style="margin:0 0 16px;">
      If you have any questions, please contact the ${APP_NAME} health center.
    </p>
    <p style="margin:0;">Thank you!</p>
  `
}
