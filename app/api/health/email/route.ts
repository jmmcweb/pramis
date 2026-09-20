import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { isSmtpConfigured, verifyMailer } from '@/lib/mailer'
import { SMTP_FROM_EMAIL } from '@/config/constants'

// GET /api/health/email
// Admin-only SMTP diagnostic: verifies the relay credentials and TLS handshake
// without sending a message. Use this to confirm email delivery is working.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (
    !session?.user?.id ||
    !['SUPERADMIN', 'ADMIN'].includes(session.user.role || '')
  ) {
    return NextResponse.json({ message: 'Not authorized.' }, { status: 403 })
  }

  const configured = isSmtpConfigured()
  const result = await verifyMailer()

  const payload = {
    configured,
    ok: result.sent,
    from: SMTP_FROM_EMAIL,
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    reason: result.sent ? null : result.message,
    smtpCode: result.sent ? null : result.code,
    smtpResponse: result.sent ? null : result.response,
  }

  return NextResponse.json(payload, { status: result.sent ? 200 : 502 })
}
