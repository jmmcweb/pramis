// This file contains server-side actions related to user profile management, including fetching and updating user data, as well as handling password changes. It uses Prisma for database interactions and NextAuth for session management. The functions are designed to be used in a Next.js application with server-side rendering and caching capabilities.

'use server'

import prisma from '@/lib/prisma'
import { hash, compare } from 'bcrypt'
import { cache } from 'react'
import { cacheLife, cacheTag, revalidateTag } from 'next/cache'
import { getServerSession, Session } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { isValidEmail } from '@/lib/helper'
import { sanitizeUser, requireUser } from '@/lib/actions/guard'
import { nextReferenceId } from '@/lib/referenceId'
import {
  patientInfoFromProfile,
} from '@/src/data/patientInfo'
import type { MyProfileView } from '@/src/data/patientInfo'

const MIN_PASSWORD_LENGTH = 8

const table = 'user'

// Fetches the current user's data from the database based on their session ID. It checks for user authentication and returns the user's sanitized data if found, or an appropriate error message if not authenticated or if an error occurs during the database query.
async function getMeData(id: string) {
  'use cache'
  cacheTag('me')
  cacheLife('max')

  // Check if the user is authenticated by verifying the session ID. If not authenticated, return an error message.
  try {
    const me = await prisma[table].findFirst({
      where: {
        id: id as any,
      },
    })

    console.log(`---DB HIT: GET ME with ID: ${id} from database---`)

    if (!me) {
      return {
        success: true,
        payload: null,
      }
    }

    return {
      success: true,
      payload: sanitizeUser(me),
      message: 'My data fetched successfully!',
    }
  } catch (error) {
    console.error('[getMe | Prisma | Error]:', error)
    return {
      success: false,
      payload: null,
      message: 'Failed to get my data!',
    }
  }
}

// GET LOG IN USER
export const getMe = cache(async () => {
  const session = (await getServerSession(authOptions)) as Session | null

  if (!session || !session.user || !session.user.id) {
    return {
      success: false,
      payload: null,
      message: 'User not authenticated!',
    }
  }

  return getMeData(session.user.id)
})

// Converts a user object to a profile view object.
function toProfileView(user: any): MyProfileView {
  const p = user?.profile ?? {}
  return {
    referenceId: user?.id ?? '',
    email: user?.email ?? '',
    firstName: p.firstName ?? '',
    middleName: p.middleName ?? '',
    lastName: p.lastName ?? '',
    suffix: p.suffix ?? '',
    birthdate: p.birthdate
      ? new Date(p.birthdate).toISOString().slice(0, 10)
      : '',
    phoneNumber: p.phoneNumber ?? '',
    houseNumber: p.houseNumber ?? '',
    barangay: p.barangay ?? '',
    city: p.city ?? '',
    province: p.province ?? '',
    zipCode: p.zipCode ?? '',
    philHealthNo: p.philHealthNo ?? '',
    membershipType: p.membershipType ?? '',
    philHealthStatus: p.philHealthStatus ?? '',
    familyMembers: Array.isArray(user?.familyMembers)
      ? user.familyMembers.map((m: any) => ({
          id: m.familymemberid ?? '',
          name: m.name ?? '',
          relation: m.relation ?? '',
          phone: m.phone ?? '',
        }))
      : [],
  }
}

// Fetches the current user's profile data from the database, including personal information and family members. It checks for user authentication and returns the profile view object if found, or an appropriate error message if not authenticated or if an error occurs during the database query.
export async function getMyProfile(): Promise<{
  success: boolean
  message: string
  profile: MyProfileView | null
}> {
  const session = await requireUser()
  if (!session?.user?.id) {
    return { success: false, message: 'User not authenticated!', profile: null }
  }

  try {
    const user = await (prisma as any).user.findFirst({
      where: { id: session.user.id },
      include: { profile: true, familyMembers: { orderBy: { createdAt: 'asc' } } },
    })
    if (!user) {
      return { success: false, message: 'Account not found.', profile: null }
    }

    return {
      success: true,
      message: 'Profile fetched successfully!',
      profile: toProfileView(user),
    }
  } catch (error) {
    console.error('[getMyProfile | Prisma | Error]:', error)
    return { success: false, message: 'Failed to fetch profile.', profile: null }
  }
}

// Updates the current user's profile data in the database based on the provided form data. It checks for user authentication, validates the input fields, and updates the user's personal information and family members. The function returns a success status, message, and the updated profile view object if successful, or an appropriate error message if not authenticated or if validation fails.
export async function updateMyProfile(
  _prevState: any,
  formData: FormData
): Promise<{
  success: boolean
  message: string | null
  errors?: Record<string, string>
  payload?: MyProfileView | null
}> {
  const session = await requireUser()
  if (!session?.user?.id) {
    return { success: false, message: 'User not authenticated!' }
  }

  const id = session.user.id

  const firstName = formData.get('firstName')?.toString().trim() || ''
  const middleName = formData.get('middleName')?.toString().trim() || ''
  const lastName = formData.get('lastName')?.toString().trim() || ''
  const suffix = formData.get('suffix')?.toString().trim() || ''
  const birthdate = formData.get('birthdate')?.toString().trim() || ''
  const phoneNumber = formData.get('phoneNumber')?.toString().trim() || ''
  const email = formData.get('email')?.toString().trim().toLowerCase() || ''
  const houseNumber = formData.get('houseNumber')?.toString().trim() || ''
  const barangay = formData.get('barangay')?.toString().trim() || ''
  const city = formData.get('city')?.toString().trim() || ''
  const province = formData.get('province')?.toString().trim() || ''
  const zipCode = formData.get('zipCode')?.toString().trim() || ''
  const philHealthNo = formData.get('philHealthNo')?.toString().trim() || ''
  const membershipType = formData.get('membershipType')?.toString().trim() || ''
  const philHealthStatus = formData.get('philHealthStatus')?.toString().trim() || ''

  const familyNames = formData.getAll('familyName').map((v) => v.toString().trim())
  const familyRelations = formData.getAll('familyRelation').map((v) => v.toString().trim())
  const familyPhones = formData.getAll('familyPhone').map((v) => v.toString().trim())
  const familyRowCount = Math.max(familyNames.length, familyRelations.length, familyPhones.length)
  const familyRows: { name: string; relation: string; phone: string | null }[] = []
  let familyError: string | null = null
  for (let i = 0; i < familyRowCount; i++) {
    const name = familyNames[i] ?? ''
    const relation = familyRelations[i] ?? ''
    const phone = familyPhones[i] ?? ''
    if (!name && !relation && !phone) continue
    if (!name || !relation) {
      familyError = 'Each family member needs at least a name and a relation.'
      break
    }
    familyRows.push({ name, relation, phone: phone || null })
  }

  let errors: Record<string, string> = {}

  const requiredFields: Array<[string, string, string]> = [
    ['firstName', 'First name', firstName],
    ['lastName', 'Last name', lastName],
    ['birthdate', 'Date of birth', birthdate],
    ['phoneNumber', 'Mobile number', phoneNumber],
    ['email', 'Email address', email],
    ['houseNumber', 'House no./street', houseNumber],
    ['barangay', 'Barangay', barangay],
    ['city', 'Municipality/city', city],
    ['province', 'Province', province],
    ['zipCode', 'ZIP code', zipCode],
  ]

  requiredFields.forEach(([key, label, value]) => {
    if (!value) {
      errors[key] = `${label} is required.`
    }
  })

  if (email && !isValidEmail(email)) {
    errors['email'] = 'Please enter a valid email address.'
  }

  let parsedBirthdate: Date | null = null
  if (birthdate) {
    parsedBirthdate = new Date(`${birthdate}T00:00:00.000Z`)
    if (Number.isNaN(parsedBirthdate.getTime())) {
      errors['birthdate'] = 'Please provide a valid date of birth.'
    }
  }

  if (familyError) {
    errors['familyMembers'] = familyError
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, message: null, errors }
  }

  // Check if the email is already taken by another user (excluding the current user). If the email is taken, return an error message indicating that the email is already registered to another account.
  try {
    const emailTaken = await (prisma as any).user.findFirst({
      where: { email, NOT: { id } },
      select: { id: true },
    })
    if (emailTaken) {
      return {
        success: false,
        message: `Email ${email} is already registered to another account.`,
        errors: { email: 'This email is already registered.' },
      }
    }

    const profileData = {
      firstName,
      middleName: middleName || null,
      lastName,
      suffix: suffix || null,
      birthdate: parsedBirthdate,
      phoneNumber,
      houseNumber,
      barangay,
      city,
      province,
      zipCode,
      philHealthNo: philHealthNo || null,
      membershipType: membershipType || null,
      philHealthStatus: philHealthStatus || null,
      updatedAt: new Date(),
    }

    await (prisma as any).$transaction([
      (prisma as any).userProfile.upsert({
        where: { userId: id },
        update: profileData,
        create: {
          userprofileid: await nextReferenceId('PRF'),
          userId: id,
          ...profileData,
        },
      }),
      (prisma as any).user.update({
        where: { id },
        data: { email, updatedAt: new Date() },
      }),
      (prisma as any).familyMember.deleteMany({ where: { userId: id } }),
      ...(familyRows.length
        ? [
            (prisma as any).familyMember.createMany({
              data: await Promise.all(
                familyRows.map(async (m) => ({
                  familymemberid: await nextReferenceId('FAM'),
                  userId: id,
                  ...m,
                })),
              ),
            }),
          ]
        : []),
    ])

    const fresh = await (prisma as any).user.findFirst({
      where: { id },
      include: { profile: true, familyMembers: { orderBy: { createdAt: 'asc' } } },
    })

    return {
      success: true,
      message: 'Profile updated successfully!',
      payload: fresh ? toProfileView(fresh) : null,
    }
  } catch (error) {
    console.error('[updateMyProfile | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to update profile. Please try again.',
    }
  }
}

// Updates the current user's profile data in the database based on the provided form data. It checks for user authentication, validates the input fields, and updates the user's personal information and family members. The function returns a success status, message, and the updated profile view object if successful, or an appropriate error message if not authenticated or if validation fails.
export async function updateMe(_prevState: any, formData: FormData) {
  const session = await getServerSession(authOptions)
  const id = session?.user?.id as string

  const name = formData.get('name')?.toString().trim() || null
  const email = formData.get('email')?.toString().trim() || null
  const image = formData.get('image')?.toString().trim() || null
  const updatedAt = new Date()

  const removeImage = formData.get('removeProfile') === 'true'

  try {
    let updateData: Record<string, any> = {
      updatedAt: updatedAt,
    }
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (image) updateData.image = image

    if (removeImage) {
      updateData.image = null
    }

    const requiredFields = [
      { key: 'name', label: 'Name', value: name },
      { key: 'email', label: 'Email', value: email },
    ]

    let errors: Record<string, string> = {}
    requiredFields.forEach(({ key, label, value }) => {
      if (!value) {
        errors[key] = `${label} is required.`
      }
    })


    if (email && !isValidEmail(email)) {
      errors['email'] = 'Please enter a valid email address.'
    }

    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        errors,
        input: {
          name,
          email,
          id,
        },
        message: null,
      }
    }

    const userExist = await prisma[table].findFirst({
      where: {
        email: email,
      },
    })

    if (userExist) {
      if (String(userExist.id) !== id) {
        return {
          success: false,
          payload: null,
          message: `Email ${email} already exists. Please use a different email.`,
        }
      }
    }

    const updatedUser = await prisma[table].update({
      where: {
        id: id as any,
      },
      data: updateData,
    })

    revalidateTag('me', 'max')

    return {
      success: true,
      payload: sanitizeUser(updatedUser),
      message: 'Profile updated successfully!',
    }
  } catch (error) {
    console.error('lib/actions/me.ts: ', error)
    return {
      success: false,
      payload: null,
      message: 'Failed to update profile. Please call admin.',
    }
  }
}

// Updates the current user's password in the database based on the provided form data. It checks for user authentication, validates the input fields, and updates the user's password if the current password is correct and the new password meets the required criteria. The function returns a success status, message, and the updated user data if successful, or an appropriate error message if not authenticated or if validation fails.

export async function updateMePassword(_prevState: any, formData: FormData) {
  const session = (await getServerSession(authOptions)) as Session | null
  if (!session || !session.user || !session.user.id) {
    return {
      success: false,
      payload: null,
      message: 'User not authenticated!',
    }
  }

  const id = session.user.id

  const current_password = formData.get('current_password')?.toString().trim()
  const new_password = formData.get('new_password')?.toString().trim()
  const confirm_password = formData.get('confirm_password')?.toString().trim()

  let errors: Record<string, string> = {}

  const requiredFields = [
    {
      key: 'current_password',
      label: 'Current Password',
      value: current_password,
    },
    { key: 'new_password', label: 'New Password', value: new_password },
    {
      key: 'confirm_password',
      label: 'Confirm Password',
      value: confirm_password,
    },
  ]

  requiredFields.forEach(({ key, label, value }) => {
    if (!value) {
      errors[key] = `${label} is required.`
    }
  })

  if (new_password !== confirm_password) {
    errors['confirm_password'] =
      'New password and confirm password do not match.'
  }

  if (new_password && new_password.length < MIN_PASSWORD_LENGTH) {
    errors['new_password'] =
      `New password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors,
      input: { id },
      message: null,
    }
  }

  try {
    const me = await prisma[table].findFirst({
      where: { id: id as any },
    })
    if (
      !me ||
      !me.password ||
      !(await compare(current_password!, me.password))
    ) {
      return {
        success: false,
        errors: { current_password: 'Current password is incorrect.' },
        input: { id },
        message: null,
      }
    }

    const hashedPassword = await hash(new_password, 12)

    const updatedUser = await prisma[table].update({
      where: { id: id as any },
      data: { password: hashedPassword, updatedAt: new Date() },
    })

    revalidateTag('me', 'max')

    return {
      success: true,
      payload: sanitizeUser(updatedUser),
      message: 'Password updated successfully.',
    }
  } catch (error) {
    console.error('[updateMePassword | Prisma | Error]:', error)
    return {
      success: false,
      payload: null,
      message: 'Failed to update password.',
    }
  }
}
