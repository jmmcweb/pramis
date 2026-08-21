'use server'

import prisma from '@/lib/prisma'
import { hash, compare } from 'bcrypt'
import { cache } from 'react'
import { cacheLife, cacheTag, revalidateTag } from 'next/cache'
import { getServerSession, Session } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { isValidEmail } from '@/lib/helper'
import { sanitizeUser } from '@/lib/actions/guard'

const MIN_PASSWORD_LENGTH = 8

const table = 'user'

async function getMeData(id: string) {
  'use cache'
  cacheTag('me')
  cacheLife('max')

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
