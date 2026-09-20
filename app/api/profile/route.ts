import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'
import { recordAudit } from '@/lib/actions/audit'

async function requireStaffSession() {
  const session = await getServerSession(authOptions)
  const role = (session?.user?.role || '') as string
  const isStaffRole = ['SUPERADMIN', 'ADMIN', 'MEDSTAFF'].includes(role)
  if (!session?.user?.id || !isStaffRole) {
    return null
  }
  return session
}

export async function GET() {
  const session = await requireStaffSession()
  if (!session) {
    return NextResponse.json({ message: 'Not authorized.' }, { status: 403 })
  }

  try {
    const staff = await (prisma as any).staff.findUnique({
      where: { staffid: session.user.id },
    })
    if (!staff) {
      return NextResponse.json({ message: 'Account not found.' }, { status: 404 })
    }

    return NextResponse.json({
      profile: {
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        role: staff.role,
        position: staff.position || '',
        phone: staff.phone || '',
        address: staff.address || '',
        department: staff.department || '',
        education: staff.education || '',
        license: staff.license || '',
        joinDate: staff.joinDate || '',
        emergencyContact: staff.emergencyContact || '',
      },
    })
  } catch (error) {
    console.error('Profile load failed:', error)
    return NextResponse.json(
      { message: 'Unable to load profile.' },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  const session = await requireStaffSession()
  if (!session) {
    return NextResponse.json({ message: 'Not authorized.' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { message: 'Invalid request body.' },
      { status: 400 },
    )
  }

  const stringField = (v: unknown) =>
    typeof v === 'string' ? v.trim() : ''

  const data: any = {
    firstName: stringField(body.firstName) || undefined,
    lastName: stringField(body.lastName) || undefined,
    position: stringField(body.position),
    phone: stringField(body.phone),
    address: stringField(body.address),
    department: stringField(body.department),
    education: stringField(body.education),
    license: stringField(body.license),
    joinDate: stringField(body.joinDate),
    emergencyContact: stringField(body.emergencyContact),
  }

  try {
    const before = await (prisma as any).staff.findUnique({
      where: { staffid: session.user.id },
      select: { firstName: true, lastName: true, position: true, email: true },
    })
    await (prisma as any).staff.update({
      where: { staffid: session.user.id },
      data,
    })

    await recordAudit({
      action: 'UPDATE',
      entity: 'PROFILE',
      entityId: session.user.id,
      description: `Updated their own staff profile (${session.user.email ?? session.user.id}).`,
      metadata: {
        email: before?.email ?? session.user.email ?? null,
        previousName: before
          ? `${before.firstName ?? ''} ${before.lastName ?? ''}`.trim()
          : null,
        position: data.position ?? before?.position ?? null,
        changedFields: Object.keys(data).filter(
          (key) => (data as any)[key] !== undefined,
        ),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Profile update failed:', error)
    return NextResponse.json(
      { message: 'Unable to update profile.' },
      { status: 500 },
    )
  }
}
