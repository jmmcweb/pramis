import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { createNotification } from '@/lib/actions/notifications'

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
      orderBy: { createdAt: 'asc' },
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
  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json(
      { message: 'A valid account and action are required.' },
      { status: 400 },
    )
  }

  try {
    const updated = await (prisma as any).user.update({
      where: { id },
      data: { status: action === 'approve' ? 'ACTIVE' : 'INACTIVE' },
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
