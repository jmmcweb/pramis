import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { hash } from 'bcrypt'
import { APP_NAME } from '@/config/constants'
import { isSmtpConfigured, sendMailDetailed } from '@/lib/mailer'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { message: 'Invalid request body.' },
      { status: 400 },
    )
  }

  const email = body.email?.trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ message: 'Email is required.' }, { status: 400 })
  }

  if (!isSmtpConfigured()) {
    return NextResponse.json(
      {
        message:
          'Email service is not configured. Add SMTP_HOST, SMTP_USER, and SMTP_KEY to .env.local.',
      },
      { status: 503 },
    )
  }

  const code = crypto.randomInt(100000, 1000000).toString()
  const codeHash = await hash(code, 10)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "VerificationCode" ("id", "email", "codeHash", "expiresAt", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT ("email") DO UPDATE SET
         "codeHash" = EXCLUDED."codeHash",
         "expiresAt" = EXCLUDED."expiresAt",
         "createdAt" = CURRENT_TIMESTAMP`,
      email,
      codeHash,
      expiresAt,
    )

    const result = await sendMailDetailed({
      to: email,
      subject: `${APP_NAME} verification code`,
      content: `<p>Your verification code is:</p><p style="font-size: 28px; font-weight: bold; letter-spacing: 8px;">${code}</p><p>This code expires in 10 minutes.</p>`,
    })

    if (!result.sent) {
      console.error('[verification] Email delivery failed:', result)
      return NextResponse.json(
        {
          message: 'We could not send the email. Check your SMTP settings.',
          // Surface the provider response in development only.
          ...(process.env.NODE_ENV !== 'production' && {
            reason: result.message,
            smtpCode: result.code,
            smtpResponse: result.response,
          }),
        },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Verification email failed:', error)
    return NextResponse.json(
      { message: 'Unable to send verification email.' },
      { status: 500 },
    )
  }
}
