import { NextResponse } from 'next/server'
import { compare, hash } from 'bcrypt'
import prisma from '@/lib/prisma'
import { nextReferenceId } from '@/lib/referenceId'
import { notifyAllStaff } from '@/lib/actions/notifications'
import { PUROKS, FIXED_ADDRESS } from '@/src/data/patientInfo'

// structure for the signup payload
type SignupPayload = {
  email?: string
  code?: string
  password?: string
  firstName?: string
  middleName?: string
  lastName?: string
  suffix?: string
  birthday?: string
  gender?: string
  mobile?: string
  street?: string
  purok?: string
  barangay?: string
  city?: string
  province?: string
  zip?: string
  country?: string
  idType?: string
  idPhoto?: string
  isPwd?: boolean
  pwdIdImage?: string
}

//
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
  const middleName = payload.middleName?.trim()
  const lastName = payload.lastName?.trim()
  const suffix = payload.suffix?.trim()
  const birthday = payload.birthday?.trim()
  const gender = payload.gender?.trim()
  const mobile = payload.mobile?.trim()
  const street = payload.street?.trim()
  const purok = payload.purok?.trim()
  const barangay = payload.barangay?.trim()
  const city = payload.city?.trim()
  const province = payload.province?.trim()
  const zip = payload.zip?.trim()
  const country = FIXED_ADDRESS.country
  const idType = payload.idType?.trim()
  const idPhoto = payload.idPhoto?.trim()
  const isPwd = payload.isPwd
  const pwdIdImage = payload.pwdIdImage?.trim()

  // The captured/uploaded valid ID is a base64 data URL (e.g. data:image/jpeg;base64,...)
  if (idPhoto && !/^data:image\/(jpeg|png|webp);base64,/.test(idPhoto)) {
    return NextResponse.json(
      { message: 'The uploaded ID photo must be a JPEG, PNG, or WebP image.' },
      { status: 400 },
    )
  }
  if (idPhoto && idPhoto.length > 5_000_000) {
    return NextResponse.json(
      { message: 'The uploaded ID photo is too large (max ~3.5MB).' },
      { status: 400 },
    )
  }

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

  if (!purok || !PUROKS.includes(purok)) {
    return NextResponse.json(
      { message: 'Please select a valid purok in Barangay Sumapang Matanda.' },
      { status: 400 },
    )
  }

  if (typeof isPwd !== 'boolean') {
    return NextResponse.json(
      {
        message:
          'Please tell us whether you are a Person with Disability (PWD).',
      },
      { status: 400 },
    )
  }

  // The uploaded PWD ID photo follows the same rules as the valid ID photo.
  if (pwdIdImage && !/^data:image\/(jpeg|png|webp);base64,/.test(pwdIdImage)) {
    return NextResponse.json(
      { message: 'The PWD ID photo must be a JPEG, PNG, or WebP image.' },
      { status: 400 },
    )
  }
  if (pwdIdImage && pwdIdImage.length > 5_000_000) {
    return NextResponse.json(
      { message: 'The uploaded PWD ID photo is too large (max ~3.5MB).' },
      { status: 400 },
    )
  }

  if (isPwd && !pwdIdImage) {
    return NextResponse.json(
      { message: 'Please upload a photo of your PWD ID.' },
      { status: 400 },
    )
  }

  // Only keep the PWD ID photo when the applicant declared that they are a PWD.
  const declaredPwdIdImage = isPwd ? (pwdIdImage ?? null) : null

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

    const userId = await nextReferenceId('USR')
    const profileId = await nextReferenceId('PRF')
    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          id: userId,
          email,
          password: await hash(password, 12),
        } as any,
      }),
      (prisma as any).userProfile.create({
        data: {
          userprofileid: profileId,
          userId,
          firstName,
          middleName: middleName || null,
          lastName,
          suffix: suffix || null,
          birthdate: parsedBirthday,
          sex: gender,
          phoneNumber: mobile,
          houseNumber: `${street}, ${purok}`,
          barangay,
          city,
          province,
          zipCode: zip,
          validId: idPhoto || null,
          validIdType: idType || null,
          isPwd,
          pwdIdImage: declaredPwdIdImage,
        },
      }),
    ])

    await notifyAllStaff({
      category: 'Approval Request',
      title: 'New Account Registration',
      description: `${firstName} ${lastName} (${email}) signed up and is waiting for approval.`,
    })

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
