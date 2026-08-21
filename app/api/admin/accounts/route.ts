import { NextResponse } from 'next/server'
import { hash } from 'bcrypt'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { nextReferenceId } from '@/lib/referenceId'

const roles = ['SUPERADMIN', 'ADMIN', 'STAFF', 'MIDWIFE', 'USER'] as const

async function requireAdminSession() {
  const session = await getServerSession(authOptions)
  if (
    !session?.user?.id ||
    !['SUPERADMIN', 'ADMIN'].includes(session.user.role || '')
  ) {
    return null
  }
  return session
}

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ message: 'Not authorized.' }, { status: 403 })
  }

  try {
    const [users, staff] = await Promise.all([
      (prisma as any).user.findMany({
        orderBy: { createdAt: 'desc' },
        include: { profile: true, patient: true },
      }),
      (prisma as any).staff.findMany({ orderBy: { createdAt: 'desc' } }),
    ])

    return NextResponse.json({
      users: [
        ...staff.map((account: any) => ({
          kind: 'staff',
          id: account.staffid,
          referenceId: account.referenceId || account.staffid,
          firstName: account.firstName,
          lastName: account.lastName,
          username: account.email.split('@')[0],
          email: account.email,
          password: '********',
          role: account.role === 'ADMIN' ? 'Admin' : 'Medical Staff',
          position: account.role === 'MIDWIFE' ? 'Midwife' : 'Nurse',
          dateJoined: account.createdAt,
        })),
        ...users.map((account: any) => ({
          kind: 'patient',
          id: account.id,
          referenceId: account.referenceId || account.id,
          firstName: account.profile?.firstName || 'User',
          lastName: account.profile?.lastName || '',
          username: account.email.split('@')[0],
          email: account.email,
          password: '********',
          role: account.role === 'USER' ? 'Patient' : 'Admin',
          hasRecord: Boolean(account.patient),
          dateJoined: account.createdAt,
        })),
      ],
    })
  } catch (error) {
    console.error('Account list failed:', error)
    return NextResponse.json(
      { message: 'Unable to load accounts.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ message: 'Not authorized.' }, { status: 403 })
  }

  let body: {
    email?: string
    password?: string
    role?: string
    firstName?: string
    lastName?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { message: 'Invalid request body.' },
      { status: 400 },
    )
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password?.trim()
  const role = body.role?.trim() || 'USER'
  const firstName = body.firstName?.trim() || 'New'
  const lastName = body.lastName?.trim() || 'Account'

  if (!email || !password || !roles.includes(role as (typeof roles)[number])) {
    return NextResponse.json(
      { message: 'Email, password, and a valid role are required.' },
      { status: 400 },
    )
  }

  if (role === 'SUPERADMIN' && session.user.role !== 'SUPERADMIN') {
    return NextResponse.json(
      { message: 'Only a superadmin can create a superadmin.' },
      { status: 403 },
    )
  }

  try {
    const existingUser = await (prisma as any).user.findUnique({
      where: { email },
    })
    const existingStaff = await (prisma as any).staff.findUnique({
      where: { email },
    })
    if (existingUser || existingStaff) {
      return NextResponse.json(
        { message: 'An account with this email already exists.' },
        { status: 409 },
      )
    }

    if (role === 'ADMIN' || role === 'MIDWIFE') {
      const staff = await (prisma as any).staff.create({
        data: {
          referenceId: await nextReferenceId(role === 'ADMIN' ? 'ADM' : 'MS'),
          firstName,
          lastName,
          email,
          password: await hash(password, 12),
          role,
        },
      })

      return NextResponse.json(
        {
          success: true,
          userId: staff.staffid,
          referenceId: staff.referenceId,
          role: staff.role,
        },
        { status: 201 },
      )
    }

    if (role !== 'USER' && role !== 'SUPERADMIN') {
      return NextResponse.json(
        { message: 'This role must be created as a staff account.' },
        { status: 400 },
      )
    }

    const user = await (prisma as any).user.create({
      data: {
        referenceId: await nextReferenceId('USR'),
        email,
        password: await hash(password, 12),
        role,
      },
    })

    return NextResponse.json(
      {
        success: true,
        userId: user.id,
        referenceId: user.referenceId,
        role: user.role,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Role account creation failed:', error)
    return NextResponse.json(
      { message: 'Unable to create account.' },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  const session = await requireAdminSession()
  if (!session)
    return NextResponse.json({ message: 'Not authorized.' }, { status: 403 })

  const body = await request.json()
  const id = body.id?.toString()
  const kind = body.kind?.toString()
  const email = body.email?.trim().toLowerCase()
  const role =
    body.role === 'Admin'
      ? 'ADMIN'
      : body.role === 'Medical Staff'
        ? body.position === 'Midwife'
          ? 'MIDWIFE'
          : 'STAFF'
        : 'USER'

  if (!id || !email)
    return NextResponse.json(
      { message: 'Account id and email are required.' },
      { status: 400 },
    )

  try {
    if (kind === 'staff') {
      const data: any = {
        firstName: body.firstName?.trim(),
        lastName: body.lastName?.trim(),
        email,
        role,
      }
      if (body.password && body.password !== '********')
        data.password = await hash(body.password, 12)
      await (prisma as any).staff.update({ where: { staffid: id }, data })
    } else {
      const data: any = { email, role }
      if (body.password && body.password !== '********')
        data.password = await hash(body.password, 12)
      await (prisma as any).user.update({ where: { id }, data })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Account update failed:', error)
    return NextResponse.json(
      { message: 'Unable to update account.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  const session = await requireAdminSession()
  if (!session)
    return NextResponse.json({ message: 'Not authorized.' }, { status: 403 })

  const body = await request.json()
  const id = body.id?.toString()
  const kind = body.kind?.toString()
  if (!id || !kind)
    return NextResponse.json(
      { message: 'Account id and type are required.' },
      { status: 400 },
    )
  if (id === session.user.id)
    return NextResponse.json(
      { message: 'You cannot delete your own account.' },
      { status: 400 },
    )

  try {
    if (kind === 'staff')
      await (prisma as any).staff.delete({ where: { staffid: id } })
    else await (prisma as any).user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Account deletion failed:', error)
    return NextResponse.json(
      { message: 'Unable to delete account.' },
      { status: 500 },
    )
  }
}
