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
import { recordAudit } from '@/lib/actions/audit'
import { nextReferenceId } from '@/lib/referenceId'
import { FIXED_ADDRESS, normalizeSex, patientInfoFromProfile } from '@/src/data/patientInfo'
import type { FamilyMemberRow, MyProfileView } from '@/src/data/patientInfo'

const MIN_PASSWORD_LENGTH = 8

// Fetches the current user's data from the database based on their session ID. It checks for user authentication and returns the user's sanitized data if found, or an appropriate error message if not authenticated or if an error occurs during the database query.
//
// For staff accounts the session id is `staff.staffid`, so we query the Staff
// table (by `staffid`) instead of the User table (by `id`). The session's
// `accountType` field tells us which table to use.
async function getMeData(id: string, accountType?: string) {
  'use cache'
  cacheTag('me')
  cacheLife('max')

  // Check if the user is authenticated by verifying the session ID. If not authenticated, return an error message.
  try {
    const isStaff = accountType === 'staff'
    const me = isStaff
      ? await prisma.staff.findUnique({ where: { staffid: id } })
      : await prisma.user.findFirst({ where: { id } })

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

  return getMeData(session.user.id, session.user.accountType)
})

// Converts a user object to a profile view object.
function toProfileView(user: any): MyProfileView {
  const p = user?.profile ?? {}
  const patient = user?.patients?.find((item: any) => !item.familyMemberId)
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
    sex: normalizeSex(p.sex || patient?.sex),
    phoneNumber: p.phoneNumber ?? '',
    houseNumber: p.houseNumber ?? '',
    barangay: p.barangay ?? '',
    city: p.city ?? '',
    province: p.province ?? '',
    zipCode: p.zipCode ?? '',
    purok: p.purok ?? '',
    philHealthNo: p.philHealthNo ?? '',
    bloodType: p.bloodType ?? '',
    religion: p.religion ?? '',
    fathersName: p.fathersName ?? '',
    mothersName: p.mothersName ?? '',
    membershipType: p.membershipType ?? '',
    philHealthStatus: p.philHealthStatus ?? '',
    familyMembers: Array.isArray(user?.familyMembers)
      ? user.familyMembers.map((m: any) => ({
          id: m.familymemberid ?? '',
          name: m.name ?? '',
          relation: m.relation ?? '',
          phone: m.phone ?? '',
          birthdate: m.birthdate
            ? new Date(m.birthdate).toISOString().slice(0, 10)
            : '',
          sex: m.sex ?? '',
          houseNumber: m.houseNumber ?? '',
          barangay: m.barangay ?? '',
          city: m.city ?? '',
          province: m.province ?? '',
          zipCode: m.zipCode ?? '',
          purok: m.purok ?? '',
          philHealthNo: m.philHealthNo ?? '',
          bloodType: m.bloodType ?? '',
          religion: m.religion ?? '',
          fathersName: m.fathersName ?? '',
          mothersName: m.mothersName ?? '',
          isPwd: m.isPwd ?? null,
        }))
      : [],
  }
}

// True when a Prisma error is caused by a column that does not exist yet in
// the deployed database (for example `FamilyMember.isPwd` before the
// migration is applied). Used to degrade gracefully instead of breaking the
// whole profile page.
function isMissingColumnError(error: unknown, column: string): boolean {
  const message =
    error instanceof Error
      ? `${error.message} ${(error as any)?.cause?.message ?? ''} ${(error as any)?.meta ? JSON.stringify((error as any).meta) : ''}`
      : String(error ?? '')
  return (
    message.toLowerCase().includes(column.toLowerCase()) &&
    (message.toLowerCase().includes('does not exist') ||
      message.toLowerCase().includes('unknown column') ||
      message.toLowerCase().includes('no such column'))
  )
}

function parseOptionalBoolean(value: string | undefined): boolean | null {
  const normalized = value?.trim().toLowerCase()
  if (normalized === 'yes' || normalized === 'true') return true
  if (normalized === 'no' || normalized === 'false') return false
  return null
}

function toFamilyMemberRow(m: any): FamilyMemberRow {
  return {
    id: m.familymemberid ?? '',
    name: m.name ?? '',
    relation: m.relation ?? '',
    phone: m.phone ?? '',
    birthdate: m.birthdate
      ? new Date(m.birthdate).toISOString().slice(0, 10)
      : '',
    sex: m.sex ?? '',
    houseNumber: m.houseNumber ?? '',
    barangay: m.barangay ?? '',
    city: m.city ?? '',
    province: m.province ?? '',
    zipCode: m.zipCode ?? '',
    purok: m.purok ?? '',
    philHealthNo: m.philHealthNo ?? '',
    bloodType: m.bloodType ?? '',
    religion: m.religion ?? '',
    fathersName: m.fathersName ?? '',
    mothersName: m.mothersName ?? '',
    isPwd: (m as any).isPwd ?? null,
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
    let user: any = null
    try {
      user = await (prisma as any).user.findFirst({
        where: { id: session.user.id },
        include: {
          profile: true,
          patients: { select: { familyMemberId: true, sex: true } },
          familyMembers: { orderBy: { createdAt: 'asc' } },
        },
      })
    } catch (error) {
      // Older deployments may not have `FamilyMember.isPwd` yet.
      if (!isMissingColumnError(error, 'isPwd')) throw error
      user = await (prisma as any).user.findFirst({
        where: { id: session.user.id },
        include: {
          profile: true,
          patients: { select: { familyMemberId: true, sex: true } },
          familyMembers: {
            orderBy: { createdAt: 'asc' },
            select: {
              familymemberid: true,
              name: true,
              relation: true,
              phone: true,
              birthdate: true,
              sex: true,
              houseNumber: true,
              barangay: true,
              city: true,
              province: true,
              zipCode: true,
              purok: true,
              philHealthNo: true,
              bloodType: true,
              religion: true,
              fathersName: true,
              mothersName: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      })
    }
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
    return {
      success: false,
      message: 'Failed to fetch profile.',
      profile: null,
    }
  }
}

// Saves one family member on its own, so members can be added or edited
// without putting the main profile into "Edit Information" mode.
export async function saveFamilyMember(_prevState: any, formData: FormData) {
  const session = await requireUser()
  if (!session?.user?.id) {
    return {
      success: false,
      message: 'User not authenticated!',
      errors: { name: 'User not authenticated!' },
    }
  }
  const id = session.user.id
  const familyMemberId = formData.get('familyMemberId')?.toString().trim() || ''
  const name = formData.get('name')?.toString().trim() || ''
  const relation = formData.get('relation')?.toString().trim() || ''
  const phone = formData.get('phone')?.toString().trim() || ''
  const birthdateRaw = formData.get('birthdate')?.toString().trim() || ''
  const sex = formData.get('sex')?.toString().trim() || ''
  const houseNumber = formData.get('houseNumber')?.toString().trim() || ''
  const purok = formData.get('purok')?.toString().trim() || ''
  // Family members share the account holder's catchment: only the street +
  // purok are entered. Barangay / city / province / ZIP are always fixed to
  // Sumapang Matanda, Malolos, Bulacan 3000.
  const barangay = FIXED_ADDRESS.barangay
  const city = FIXED_ADDRESS.municipality
  const province = FIXED_ADDRESS.province
  const zipCode = FIXED_ADDRESS.zipCode
  const philHealthNo = formData.get('philHealthNo')?.toString().trim() || ''
  const bloodType = formData.get('bloodType')?.toString().trim() || ''
  const religion = formData.get('religion')?.toString().trim() || ''
  const fathersName = formData.get('fathersName')?.toString().trim() || ''
  const mothersName = formData.get('mothersName')?.toString().trim() || ''
  const isPwd = parseOptionalBoolean(
    formData.get('isPwd')?.toString() ?? undefined,
  )
  const errors: Record<string, string> = {}
  if (!name) errors['name'] = 'Full name is required.'
  if (!relation) errors['relation'] = 'Relation is required.'
  let parsedBirthdate: Date | null = null
  if (birthdateRaw) {
    parsedBirthdate = new Date(`${birthdateRaw}T00:00:00.000Z`)
    if (Number.isNaN(parsedBirthdate.getTime())) {
      errors['birthdate'] = 'Please provide a valid date of birth.'
    }
  }
  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: 'Please fix the highlighted family member fields.',
      errors,
    }
  }
  try {
    let existing: any = null
    if (familyMemberId) {
      existing = await (prisma as any).familyMember.findFirst({
        where: { familymemberid: familyMemberId, userId: id },
      })
      if (!existing) {
        return {
          success: false,
          message: 'Family member not found.',
          errors: { name: 'Family member not found.' },
        }
      }
    }
    let supportsIsPwd = true
    if (existing && !('isPwd' in existing)) supportsIsPwd = false
    if (!existing) {
      try {
        await (prisma as any).familyMember.findFirst({
          where: { userId: id },
          select: { familymemberid: true, isPwd: true },
        })
      } catch (error) {
        if (isMissingColumnError(error, 'isPwd')) supportsIsPwd = false
        else throw error
      }
    }
    const data: Record<string, unknown> = {
      name,
      relation,
      phone: phone || null,
      birthdate: parsedBirthdate,
      sex: sex || null,
      houseNumber: houseNumber || null,
      barangay: barangay || null,
      city: city || null,
      province: province || null,
      zipCode: zipCode || null,
      purok: purok || null,
      philHealthNo: philHealthNo || null,
      bloodType: bloodType || null,
      religion: religion || null,
      fathersName: fathersName || null,
      mothersName: mothersName || null,
      updatedAt: new Date(),
    }
    if (supportsIsPwd) data.isPwd = isPwd
    const saved = existing
      ? await (prisma as any).familyMember.update({
          where: { familymemberid: existing.familymemberid },
          data,
        })
      : await (prisma as any).familyMember.create({
          data: {
            familymemberid: await nextReferenceId('FAM'),
            userId: id,
            ...data,
          },
        })
    try {
      revalidateTag('me', 'max')
    } catch {
      // Best effort only; the save already succeeded.
    }
    await recordAudit({
      action: existing ? 'UPDATE' : 'CREATE',
      entity: 'PROFILE',
      entityId: id,
      description: existing
        ? `Updated family member ${saved.name}.`
        : `Added family member ${saved.name}.`,
      metadata: { self: true, familyMemberId: saved.familymemberid },
    })
    return {
      success: true,
      message: existing
        ? 'Family member updated successfully!'
        : 'Family member added successfully!',
      member: toFamilyMemberRow(saved),
    }
  } catch (error) {
    console.error('[saveFamilyMember | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to save family member. Please try again.',
      errors: { name: 'Failed to save family member. Please try again.' },
    }
  }
}
// Deletes one family member without requiring profile edit mode. Members
// already linked to patient records or appointments are kept intact.
export async function deleteFamilyMember(familyMemberId: string) {
  const session = await requireUser()
  if (!session?.user?.id) {
    return { success: false, message: 'User not authenticated!' }
  }
  const trimmedId = familyMemberId?.trim()
  if (!trimmedId) {
    return { success: false, message: 'Family member not found.' }
  }
  try {
    const existing = await (prisma as any).familyMember.findFirst({
      where: { familymemberid: trimmedId, userId: session.user.id },
      include: {
        patients: { select: { patientid: true } },
        appointments: { select: { appointmentid: true } },
      },
    })
    if (!existing) {
      return { success: false, message: 'Family member not found.' }
    }
    if (existing.patients?.length || existing.appointments?.length) {
      return {
        success: false,
        message:
          'This family member already has patient records or appointments and cannot be removed.',
      }
    }
    await (prisma as any).familyMember.delete({
      where: { familymemberid: existing.familymemberid },
    })
    try {
      revalidateTag('me', 'max')
    } catch {
      // Best effort only; the delete already succeeded.
    }
    await recordAudit({
      action: 'DELETE',
      entity: 'PROFILE',
      entityId: session.user.id,
      description: `Removed family member ${existing.name}.`,
      metadata: { self: true, familyMemberId: existing.familymemberid },
    })
    return { success: true, message: 'Family member removed successfully!' }
  } catch (error) {
    console.error('[deleteFamilyMember | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to remove family member. Please try again.',
    }
  }
}


// Updates only the account holder's own personal information. Family
// members are saved separately via saveFamilyMember / deleteFamilyMember so
// adding family never requires "Edit Information" mode.
export async function updateMyProfile(
  _prevState: any,
  formData: FormData,
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
  const sex = formData.get('sex')?.toString().trim() || ''
  const phoneNumber = formData.get('phoneNumber')?.toString().trim() || ''
  const email = formData.get('email')?.toString().trim().toLowerCase() || ''
  const houseNumber = formData.get('houseNumber')?.toString().trim() || ''
  const barangay = formData.get('barangay')?.toString().trim() || ''
  const city = formData.get('city')?.toString().trim() || ''
  const province = formData.get('province')?.toString().trim() || ''
  const zipCode = formData.get('zipCode')?.toString().trim() || ''
  const purok = formData.get('purok')?.toString().trim() || ''
  const philHealthNo = formData.get('philHealthNo')?.toString().trim() || ''
  const membershipType = formData.get('membershipType')?.toString().trim() || ''
  const philHealthStatus =
    formData.get('philHealthStatus')?.toString().trim() || ''
  const bloodType = formData.get('bloodType')?.toString().trim() || ''
  const religion = formData.get('religion')?.toString().trim() || ''
  const fathersName = formData.get('fathersName')?.toString().trim() || ''
  const mothersName = formData.get('mothersName')?.toString().trim() || ''

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
      sex: sex || null,
      phoneNumber,
      houseNumber,
      barangay,
      city,
      province,
      zipCode,
      purok: purok || null,
      philHealthNo: philHealthNo || null,
      membershipType: membershipType || null,
      philHealthStatus: philHealthStatus || null,
      bloodType: bloodType || null,
      religion: religion || null,
      fathersName: fathersName || null,
      mothersName: mothersName || null,
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
    ])

    const fresh = await (prisma as any).user.findFirst({
      where: { id },
      include: {
        profile: true,
        familyMembers: { orderBy: { createdAt: 'asc' } },
      },
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
  const accountType = session?.user?.accountType as string
  const isStaff = accountType === 'staff'

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

    if (email) {
      let emailConflict: any = null
      if (isStaff) {
        emailConflict = await prisma.staff.findFirst({
          where: { email, NOT: { staffid: id } },
        })
      } else {
        emailConflict = await prisma.user.findFirst({
          where: { email, NOT: { id } },
        })
      }
      if (emailConflict) {
        return {
          success: false,
          payload: null,
          message: `Email ${email} already exists. Please use a different email.`,
        }
      }
    }

    const updatedUser = isStaff
      ? await prisma.staff.update({
          where: { staffid: id },
          data: updateData,
        })
      : await prisma.user.update({
          where: { id },
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
  const accountType = session.user.accountType
  const isStaff = accountType === 'staff'

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
    // Staff records live in the Staff table (keyed by staffid); user records
    // live in the User table (keyed by id). The session's accountType tells us
    // which table to query.
    const me = isStaff
      ? await prisma.staff.findUnique({ where: { staffid: id } })
      : await prisma.user.findFirst({ where: { id } })

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

    const updatedUser = isStaff
      ? await prisma.staff.update({
          where: { staffid: id },
          data: { password: hashedPassword, updatedAt: new Date() },
        })
      : await prisma.user.update({
          where: { id },
          data: { password: hashedPassword, updatedAt: new Date() },
        })

    revalidateTag('me', 'max')

    await recordAudit({
      action: 'PASSWORD_CHANGE',
      entity: 'PROFILE',
      entityId: id,
      description: 'Changed own account password.',
      metadata: { self: true },
    })

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
