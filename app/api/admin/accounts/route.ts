import { NextResponse } from 'next/server'
import { hash } from 'bcrypt'
import prisma from '@/lib/prisma'
import { nextReferenceId } from '@/lib/referenceId'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

const roles = ['SUPERADMIN', 'ADMIN', 'MEDSTAFF', 'USER'] as const

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
        include: { profile: true, patients: true },
      }),
      (prisma as any).staff.findMany({ orderBy: { createdAt: 'desc' } }),
    ])

    return NextResponse.json({
      users: [
        ...staff.map((account: any) => ({
          kind: 'staff',
          id: account.staffid,
          referenceId: account.staffid,
          firstName: account.firstName,
          middleName: account.middleName || null,
          lastName: account.lastName,
          suffix: account.suffix || null,
          username: account.email.split('@')[0],
          email: account.email,
          password: '********',
          role: account.role === 'ADMIN' ? 'Admin' : 'Medical Staff',
          position: account.position || 'Nurse',
          dateJoined: account.createdAt,
        })),
        ...users.map((account: any) => ({
          kind: 'patient',
          id: account.id,
          referenceId: account.id,
          firstName: account.profile?.firstName || 'User',
          lastName: account.profile?.lastName || '',
          username: account.email.split('@')[0],
          email: account.email,
          password: '********',
          role: account.role === 'USER' ? 'Patient' : 'Admin',
          hasRecord: account.patients.length > 0,
          dateJoined: account.createdAt,
          profile: account.profile
            ? {
                firstName: account.profile.firstName,
                middleName: account.profile.middleName,
                lastName: account.profile.lastName,
                suffix: account.profile.suffix,
                birthdate: account.profile.birthdate,
                phoneNumber: account.profile.phoneNumber,
                houseNumber: account.profile.houseNumber,
                barangay: account.profile.barangay,
                city: account.profile.city,
                province: account.profile.province,
                zipCode: account.profile.zipCode,
                philHealthNo: account.profile.philHealthNo,
                membershipType: account.profile.membershipType,
                philHealthStatus: account.profile.philHealthStatus,
                validIdType: account.profile.validIdType,
              }
            : null,
          patientRecord: account.patients[0] ?? null,
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
    position?: string
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

    if (role === 'ADMIN' || role === 'MEDSTAFF') {
      const staffid = await nextReferenceId(role === 'ADMIN' ? 'ADM' : 'MS')
      const staff = await (prisma as any).staff.create({
        data: {
          staffid,
          firstName,
          lastName,
          email,
          password: await hash(password, 12),
          role,
          position:
            body.position && typeof body.position === 'string'
              ? body.position
              : 'Nurse',
        },
      })

      return NextResponse.json(
        {
          success: true,
          userId: staff.staffid,
          referenceId: staff.staffid,
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

    const userId = await nextReferenceId('USR')
    const user = await (prisma as any).user.create({
      data: {
        id: userId,
        email,
        password: await hash(password, 12),
        role,
      },
    })

    return NextResponse.json(
      {
        success: true,
        userId: user.id,
        referenceId: user.id,
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
        ? 'MEDSTAFF'
        : 'USER'

  if (!id || !email)
    return NextResponse.json(
      { message: 'Account id and email are required.' },
      { status: 400 },
    )

  try {
    if (kind === 'staff') {
      // Staff accounts can only hold staff roles.
      if (role !== 'ADMIN' && role !== 'MEDSTAFF') {
        return NextResponse.json(
          { message: 'Staff accounts must be Admin or Medical Staff.' },
          { status: 400 },
        )
      }
      const data: any = {
        firstName: body.firstName?.trim(),
        middleName: body.middleName?.trim() || null,
        lastName: body.lastName?.trim(),
        suffix: body.suffix?.trim() || null,
        email,
        role,
      }
      if (body.position && typeof body.position === 'string')
        data.position = body.position
      if (body.password && body.password !== '********')
        data.password = await hash(body.password, 12)
      await (prisma as any).staff.update({ where: { staffid: id }, data })
    } else {
      // Patient/user accounts stay as USER role here.
      if (role !== 'USER') {
        return NextResponse.json(
          { message: 'Create a staff account to assign an admin role.' },
          { status: 400 },
        )
      }
      const data: any = { email, role }
      if (body.password && body.password !== '********')
        data.password = await hash(body.password, 12)
      await (prisma as any).user.update({ where: { id }, data })
      // Keep the patient profile name fields in sync with the edit form.
      const profileData = {
        middleName: body.middleName?.trim() || null,
        suffix: body.suffix?.trim() || null,
      }
      const existingProfile = await (prisma as any).userProfile.findUnique({
        where: { userId: id },
      })
      if (existingProfile) {
        await (prisma as any).userProfile.update({
          where: { userId: id },
          data: profileData,
        })
      } else {
        const profileId = await nextReferenceId('PRF')
        await (prisma as any).userProfile.create({
          data: {
            userprofileid: profileId,
            userId: id,
            firstName: body.firstName?.trim() || 'User',
            lastName: body.lastName?.trim() || '',
            ...profileData,
            birthdate: new Date('1970-01-01T00:00:00.000Z'),
            phoneNumber: '',
            houseNumber: '',
            barangay: '',
            city: '',
            province: '',
            zipCode: '',
          },
        })
      }
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
