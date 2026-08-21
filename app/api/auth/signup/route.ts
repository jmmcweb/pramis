import { NextResponse } from 'next/server'
import { compare, hash } from 'bcrypt'
import { randomUUID } from 'crypto'
import prisma from '@/lib/prisma'
import { nextReferenceId } from '@/lib/referenceId'

type SignupPayload = {
  email?: string
  code?: string
  password?: string
  firstName?: string
  lastName?: string
  birthday?: string
  gender?: string
  mobile?: string
  street?: string
  barangay?: string
  city?: string
  province?: string
  zip?: string
  country?: string
}

export async function POST(request: Request) {
  let payload: SignupPayload

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { message: 'Invalid request body.' },
      { status: 400 },
    )
  }

  const email = payload.email?.trim().toLowerCase()
  const code = payload.code?.trim()
  const password = payload.password?.trim()
  const firstName = payload.firstName?.trim()
  const lastName = payload.lastName?.trim()
  const birthday = payload.birthday?.trim()
  const gender = payload.gender?.trim()
  const mobile = payload.mobile?.trim()
  const street = payload.street?.trim()
  const barangay = payload.barangay?.trim()
  const city = payload.city?.trim()
  const province = payload.province?.trim()
  const zip = payload.zip?.trim()
  const country = payload.country?.trim()

  if (
    !email ||
    !code ||
    !password ||
    !firstName ||
    !lastName ||
    !birthday ||
    !gender ||
    !mobile ||
    !street ||
    !barangay ||
    !city ||
    !province ||
    !zip ||
    !country
  ) {
    return NextResponse.json(
      { message: 'Please complete all required signup details.' },
      { status: 400 },
    )
  }

  const parsedBirthday = new Date(`${birthday}T00:00:00.000Z`)
  if (Number.isNaN(parsedBirthday.getTime())) {
    return NextResponse.json(
      { message: 'Please provide a valid birthday.' },
      { status: 400 },
    )
  }

  try {
    const verificationRows = await prisma.$queryRawUnsafe<
      Array<{ codeHash: string; expiresAt: Date }>
    >(
      `SELECT "codeHash", "expiresAt"
       FROM "VerificationCode"
       WHERE "email" = $1
       LIMIT 1`,
      email,
    )
    const verification = verificationRows[0]
    if (
      !verification ||
      verification.expiresAt < new Date() ||
      !(await compare(code, verification.codeHash))
    ) {
      return NextResponse.json(
        { message: 'Your verification code is invalid or expired.' },
        { status: 400 },
      )
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json(
        { message: 'An account with this email already exists.' },
        { status: 409 },
      )
    }

    const userId = randomUUID() as any
    const referenceId = await nextReferenceId('USR')
    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          id: userId,
          referenceId,
          email,
          password: await hash(password, 12),
        } as any,
      }),
      (prisma as any).userProfile.create({
        data: {
          userId,
          firstName,
          lastName,
          birthdate: parsedBirthday,
          phoneNumber: mobile,
          houseNumber: street,
          barangay,
          city,
          province,
          zipCode: zip,
        },
      }),
    ])

    return NextResponse.json(
      { success: true, requiresVerification: true, userId: user.id },
      { status: 201 },
    )
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { message: 'An account with this email already exists.' },
        { status: 409 },
      )
    }

    console.error('Signup failed:', error)
    return NextResponse.json(
      { message: 'Unable to create your account.' },
      { status: 500 },
    )
  }
}
