import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { hash } from 'bcrypt'
import prisma from '@/lib/prisma'
import { nextReferenceId } from '@/lib/referenceId'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { recordAudit } from '@/lib/actions/audit'
import { sendMail } from '@/lib/mailer'
import { APP_NAME, APP_BASE_URL } from '@/config/constants'

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

  if (!email || !roles.includes(role as (typeof roles)[number])) {
    return NextResponse.json(
      { message: 'Email and a valid role are required.' },
      { status: 400 },
    )
  }

  // Staff accounts never receive an admin-set password — the staff member sets
  // their own via an emailed one-time link. Patient/superadmin accounts still
  // require a password at creation.
  const isStaffRole = role === 'ADMIN' || role === 'MEDSTAFF'
  if (!isStaffRole && !password) {
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
      // Admins never set staff passwords: a random unusable password is stored
      // and the staff member sets their own through an emailed one-time link.
      const staff = await (prisma as any).staff.create({
        data: {
          staffid,
          firstName,
          lastName,
          email,
          password: await hash(crypto.randomUUID(), 12),
          mustChangePassword: true,
          role,
          position:
            body.position && typeof body.position === 'string'
              ? body.position
              : 'Nurse',
        },
      })

      // Generate a one-time set-password token and email the link (24h expiry).
      let inviteSent = false
      try {
        const rawToken = crypto.randomBytes(32).toString('hex')
        const expires = new Date()
        expires.setHours(expires.getHours() + 24)
        await (prisma as any).resetPasswordToken.deleteMany({
          where: { email },
        })
        await (prisma as any).resetPasswordToken.create({
          data: {
            email,
            token: crypto.createHash('sha256').update(rawToken).digest('hex'),
            expires,
          },
        })
        const setupLink = `${APP_BASE_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`
        inviteSent = await sendMail({
          to: email,
          subject: `Set Your Password - ${APP_NAME}`,
          content: `
            <p>Hi ${firstName},</p>
            <p>An account has been created for you on ${APP_NAME}. Click the link below to set your password:</p>
            <a href="${setupLink}">Set Your Password</a>
            <p>This link expires in 24 hours. After setting your password, you can sign in with this email address.</p>
            <p>Thank you!</p>
          `,
        })
      } catch (inviteError) {
        console.error(
          '[accounts POST] Failed to send set-password email:',
          inviteError,
        )
      }

      await recordAudit({
        action: 'CREATE',
        entity: 'ACCOUNT',
        entityId: staff.staffid,
        description: `Created ${role === 'ADMIN' ? 'admin' : 'medical staff'} account ${email} (${staff.staffid}). Password-setup link emailed to the staff member.`,
        metadata: {
          accountKind: 'staff',
          referenceId: staff.staffid,
          email,
          role,
          position: staff.position ?? null,
          inviteSent,
        },
      })

      return NextResponse.json(
        {
          success: true,
          userId: staff.staffid,
          referenceId: staff.staffid,
          role: staff.role,
          inviteSent,
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

    await recordAudit({
      action: 'CREATE',
      entity: 'ACCOUNT',
      entityId: user.id,
      description: `Created ${role === 'USER' ? 'patient' : role} account ${email} (${user.id}).`,
      metadata: {
        accountKind: 'user',
        referenceId: user.id,
        email,
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
      // Admins cannot change staff passwords — any password in the request is
      // ignored. Staff set/change their own password via emailed links or the
      // account security page.
      const previous = await (prisma as any).staff.findUnique({
        where: { staffid: id },
        select: { email: true, role: true, position: true },
      })
      await (prisma as any).staff.update({ where: { staffid: id }, data })

      await recordAudit({
        action: 'UPDATE',
        entity: 'STAFF',
        entityId: id,
        description: `Updated ${role === 'ADMIN' ? 'admin' : 'medical staff'} account ${email}.`,
        metadata: {
          accountKind: 'staff',
          email,
          role,
          previousEmail: previous?.email ?? null,
          previousRole: previous?.role ?? null,
          position: data.position ?? previous?.position ?? null,
        },
      })
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

      await recordAudit({
        action: 'UPDATE',
        entity: 'USER',
        entityId: id,
        description: `Updated patient account ${email}.${
          body.password && body.password !== '********'
            ? ' Password was reset.'
            : ''
        }`,
        metadata: {
          accountKind: 'user',
          email,
          role,
          passwordChanged: Boolean(
            body.password && body.password !== '********',
          ),
        },
      })
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
    if (kind === 'staff') {
      const target = await (prisma as any).staff.findUnique({
        where: { staffid: id },
        select: { email: true, role: true },
      })
      await (prisma as any).staff.delete({ where: { staffid: id } })
      await recordAudit({
        action: 'DELETE',
        entity: 'STAFF',
        entityId: id,
        description: `Deleted staff account ${target?.email ?? id} (${id}).`,
        metadata: {
          accountKind: 'staff',
          email: target?.email ?? null,
          role: target?.role ?? null,
        },
      })
    } else {
      const target = await (prisma as any).user.findUnique({
        where: { id },
        select: { email: true, role: true },
      })
      await (prisma as any).user.delete({ where: { id } })
      await recordAudit({
        action: 'DELETE',
        entity: 'USER',
        entityId: id,
        description: `Deleted patient account ${target?.email ?? id} (${id}).`,
        metadata: {
          accountKind: 'user',
          email: target?.email ?? null,
          role: target?.role ?? null,
        },
      })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Account deletion failed:', error)
    return NextResponse.json(
      { message: 'Unable to delete account.' },
      { status: 500 },
    )
  }
}
