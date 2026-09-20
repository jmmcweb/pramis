import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { createNotification } from '@/lib/actions/notifications'
import { recordAudit } from '@/lib/actions/audit'

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
        select: { id: true, email: true },
      })

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
        }

        await recordAudit({
          action: 'APPROVE',
          entity: 'ACCOUNT',
          entityId: 'BULK',
          description: `Bulk approved ${pendingUsers.length} pending account application(s).`,
          status: 'SUCCESS',
          metadata: { count: pendingUsers.length },
        }).catch(() => {})
      }

      return NextResponse.json({ success: true, count: pendingUsers.length })
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

    await recordAudit({
      action: action === 'approve' ? 'APPROVE' : 'REJECT',
      entity: 'ACCOUNT',
      entityId: id,
      description: `${action === 'approve' ? 'Approved' : 'Rejected'} account application of ${targetName} (${target?.email ?? id}).`,
      status: 'SUCCESS',
      metadata: {
        email: target?.email ?? null,
        previousStatus: target?.status ?? null,
        status: updated.status,
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Approval update failed:', error)
    return NextResponse.json(
      { message: 'Unable to update approval request.' },
      { status: 500 },
    )
  }
}
