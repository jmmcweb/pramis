'use server'

import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { hash } from 'bcrypt'
import { APP_NAME, APP_BASE_URL } from '@/config/constants'
import { isValidEmail } from '../helper'
import { sendMail } from '@/lib/mailer'

const table = 'resetPasswordToken' 
const MIN_PASSWORD_LENGTH = 8 

const NEUTRAL_RESET_MESSAGE =
  'If an account exists for that email, a password reset link has been sent.' 

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function forgotPassword(_prevState: any, formData: FormData) {
  const email = formData.get('email')?.toString().trim()

  if (!email || !isValidEmail(email)) {
    return {
      success: false,
      payload: null,
      message: 'Please enter a valid email address.',
    }
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    })

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex')
      const tokenHash = hashToken(rawToken)

      const expires = new Date()
      expires.setHours(expires.getHours() + 1)

      await prisma[table].deleteMany({ where: { email } })
      await prisma[table].create({
        data: { email, token: tokenHash, expires },
      })

      const resetLink = `${APP_BASE_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(
        email
      )}`
      const content = `
        <p>Hi,</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link expires in 1 hour. If you did not request this, please ignore this email.</p>
        <p>Thank you!</p>
      `

      await sendMail({
        to: email,
        subject: `Password Reset Request - ${APP_NAME}`,
        content,
      })
    }
    return { success: true, payload: null, message: NEUTRAL_RESET_MESSAGE }
  } catch (error) {
    console.error('Error in forgotPassword function: ', error)
    return { success: true, payload: null, message: NEUTRAL_RESET_MESSAGE }
  }
}

export async function resetPassword(_prevState: any, formData: FormData) {
  const token = formData.get('token')?.toString().trim()
  const email = formData.get('email')?.toString().trim()
  const password = formData.get('password')?.toString().trim()
  const confirmPassword = formData.get('confirmPassword')?.toString().trim()

  if (!token || !email || !password) {
    return { success: false, payload: null, message: 'All fields are required.' }
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      payload: null,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    }
  }

  if (password !== confirmPassword) {
    return { success: false, payload: null, message: 'Passwords do not match.' }
  }

  try {
    const resetToken = await prisma[table].findUnique({
      where: { token: hashToken(token) },
    })

    if (!resetToken || resetToken.email !== email) {
      return { success: false, payload: null, message: 'Invalid or expired token.' }
    }

    if (resetToken.expires < new Date()) {
      await prisma[table].delete({ where: { id: resetToken.id } })
      return { success: false, payload: null, message: 'Token has expired.' }
    }

    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    })
    if (!user) {
      return { success: false, payload: null, message: 'Invalid or expired token.' }
    }

    const hashedPassword = await hash(password, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, updatedAt: new Date() },
    })

    await prisma[table].deleteMany({ where: { email } })

    await sendMail({
      to: email,
      subject: `Password Reset Successful - ${APP_NAME}`,
      content: `
        <p>Hi,</p>
        <p>Your password has been successfully reset.</p>
        <p>If you did not perform this action, please contact our support team immediately.</p>
        <p>Thank you!</p>
      `,
    })

    return { success: true, payload: null, message: 'Password reset successful.' }
  } catch (error) {
    console.error('Error in resetPassword function: ', error)
    return { success: false, payload: null, message: 'Failed to reset password' }
  }
}
