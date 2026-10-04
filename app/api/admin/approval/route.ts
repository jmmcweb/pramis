import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { createNotification } from '@/lib/actions/notifications'
import { recordAudit } from '@/lib/actions/audit'
import { sendMailDetailed } from '@/lib/mailer'
import { accountApprovedEmailContent } from '@/lib/email-templates/accountApprovedEmail'
import { APP_NAME } from '@/config/constants'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (
    !session?.user?.id ||
    !['ADMIN', 'SUPERADMIN'].includes(session.user.role || '')
  ) {
    return null
  }
  return session
}

function statusLabel(status: string) {
  if (status === 'ACTIVE') return 'Approved'
  if (status === 'INACTIVE') return 'Rejected'
  return 'Pending'
}

// Emails the account holder that their application was approved.
// Never throws: the approval itself must succeed even when SMTP is
// unavailable, so failures are logged and reported back to the admin.
async function sendApprovalEmail({
  email,
  firstName,
}: {
  email?: string | null
  firstName?: string | null
}): Promise<{ emailSent: boolean; emailError?: string }> {
  if (!email) {
    return { emailSent: false, emailError: 'No email address on file.' }
  }

  try {
    const result = await sendMailDetailed({
      to: email,
      subject: `Your ${APP_NAME} account has been approved`,
      content: accountApprovedEmailContent(firstName),
    })

    if (!result.sent) {
      console.error(
        `[approval] Failed to send approval email to ${email}:`,
        result.message,
      )
      return { emailSent: false, emailError: result.message }
    }

    return { emailSent: true }
  } catch (error) {
    console.error(
      `[approval] Unexpected error sending approval email to ${email}:`,
      error,
    )
    return {
      emailSent: false,
      emailError: error instanceof Error ? error.message : 'Unknown error.',
    }
  }
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: 'Not authorized.' }, { status: 403 })
  }

  try {
    const users = await (prisma as any).user.findMany({
      include: { profile: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      accounts: [
        ...users.map((account: any) => ({
          kind: 'patient',
          id: account.id,
          referenceId: account.id,
          firstName: account.profile?.firstName || 'User',
          middleName: account.profile?.middleName || null,
          lastName: account.profile?.lastName || '',
          suffix: account.profile?.suffix || null,
          email: account.email,
          dateApplied: account.createdAt.toISOString().slice(0, 10),
          status: statusLabel(account.status),
          validId: account.profile?.validId || null,
          validIdType: account.profile?.validIdType || null,
          isPwd: account.profile?.isPwd ?? null,
          pwdIdImage: account.profile?.pwdIdImage || null,
        })),
      ],
    })
  } catch (error) {
    console.error('Approval list failed:', error)
    return NextResponse.json(
      { message: 'Unable to load approval requests.' },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: 'Not authorized.' }, { status: 403 })
  }

  const body = await request.json()
  const id = body.id?.toString()
  const action = body.action?.toString()

  if (action === 'approveAll' || body.approveAll) {
    try {
      const pendingUsers = await (prisma as any).user.findMany({
        where: { status: 'PENDING' },
        select: {
          id: true,
          email: true,
          profile: { select: { firstName: true } },
        },
      })

      // Emails are sent sequentially so a large batch cannot exhaust the
      // SMTP pool; one failure never blocks the rest.
      let emailsSent = 0
      const emailFailures: { email: string; reason: string }[] = []

      if (pendingUsers.length > 0) {
        await (prisma as any).user.updateMany({
          where: { status: 'PENDING' },
          data: { status: 'ACTIVE' },
        })

        for (const u of pendingUsers) {
          await createNotification({
            userId: u.id,
            category: 'Account',
            title: 'Account Approved',
            description:
              'Your account has been approved. You can now book appointments and manage your health records.',
          }).catch(() => {})

          const { emailSent, emailError } = await sendApprovalEmail({
            email: u.email,
            firstName: u.profile?.firstName,
          })

          if (emailSent) {
            emailsSent += 1
          } else {
            emailFailures.push({ email: u.email, reason: emailError ?? 'Unknown' })
          }
        }

        await recordAudit({
          action: 'APPROVE',
          entity: 'ACCOUNT',
          entityId: 'BULK',
          description: `Bulk approved ${pendingUsers.length} pending account application(s). Approval emails sent to ${emailsSent} recipient(s).`,
          status: 'SUCCESS',
          metadata: {
            count: pendingUsers.length,
            emailsSent,
            emailFailures,
          },
        }).catch(() => {})
      }

      return NextResponse.json({
        success: true,
        count: pendingUsers.length,
        emailsSent,
        emailFailures,
      })
    } catch (error) {
      console.error('Bulk approval failed:', error)
      return NextResponse.json(
        { message: 'Unable to complete bulk approval.' },
        { status: 500 },
      )
    }
  }

  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json(
      { message: 'A valid account and action are required.' },
      { status: 400 },
    )
  }

  try {
    const target = await (prisma as any).user.findUnique({
      where: { id },
      include: { profile: true },
    })
    const targetName = target?.profile
      ? `${target.profile.firstName ?? ''} ${target.profile.lastName ?? ''}`.trim()
      : (target?.email ?? id)

    const updated = await (prisma as any).user.update({
      where: { id },
      data: { status: action === 'approve' ? 'ACTIVE' : 'INACTIVE' },
    })

    // Only approvals trigger an email; rejections are communicated in-app.
    const { emailSent, emailError } =
      action === 'approve'
        ? await sendApprovalEmail({
            email: target?.email,
            firstName: target?.profile?.firstName,
          })
        : { emailSent: false, emailError: undefined }

    await recordAudit({
      action: action === 'approve' ? 'APPROVE' : 'REJECT',
      entity: 'ACCOUNT',
      entityId: id,
      description:
        action === 'approve'
          ? `Approved account application of ${targetName} (${target?.email ?? id}). Approval email ${emailSent ? 'sent' : 'not sent'}.`
          : `Rejected account application of ${targetName} (${target?.email ?? id}).`,
      status: 'SUCCESS',
      metadata: {
        email: target?.email ?? null,
        previousStatus: target?.status ?? null,
        status: updated.status,
        emailSent,
        ...(emailError ? { emailError } : {}),
      },
    })

    if (action === 'approve') {
      await createNotification({
        userId: id,
        category: 'Account',
        title: 'Account Approved',
        description:
          'Your account has been approved. You can now book appointments and manage your health records.',
      })
    } else {
      await createNotification({
        userId: id,
        category: 'Account',
        title: 'Account Rejected',
        description:
          'Your account application was rejected. Please contact the health center for more information.',
      })
    }

    return NextResponse.json({ success: true, emailSent, ...(emailError ? { emailError } : {}) })
  } catch (error) {
    console.error('Approval update failed:', error)
    return NextResponse.json(
      { message: 'Unable to update approval request.' },
      { status: 500 },
    )
  }
}
