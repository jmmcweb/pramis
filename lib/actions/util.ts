// This file contains utility functions for user management, including password reset functionality. It provides functions to handle forgot password requests and reset passwords securely. The functions interact with the database to manage user accounts and send email notifications for password resets.

'use server'

import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { hash } from 'bcrypt'
import { APP_NAME, APP_BASE_URL } from '@/config/constants'
import { isValidEmail } from '../helper'
import { sendMail } from '@/lib/mailer'

const MIN_PASSWORD_LENGTH = 8

const NEUTRAL_RESET_MESSAGE =
  'If an account exists for that email, a password reset link has been sent.'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// Handles a forgot password request by generating a reset token and sending an email to the user with a password reset link. It checks if the provided email exists in the User or Staff tables, generates a secure token, stores it in the database with an expiration time, and sends an email with the reset link. If the email does not exist, it still returns a neutral message to avoid revealing account existence.
export async function forgotPassword(_prevState: any, formData: FormData) {
  const email = formData.get('email')?.toString().trim()

  console.log('[forgotPassword] Request received for email:', email)

  if (!email || !isValidEmail(email)) {
    console.log('[forgotPassword] Invalid email format')
    return {
      success: false,
      payload: null,
      errors: { email: 'Please enter a valid email address.' },
      message: 'Please enter a valid email address.',
    }
  }

  try {
    // Check both User and Staff tables for the account
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    })

    const staff = await prisma.staff.findUnique({
      where: { email },
    })

    const account = user ?? staff
    const accountType = user ? 'user' : staff ? 'staff' : null

    console.log('[forgotPassword] User found:', user ? 'YES' : 'NO')
    console.log('[forgotPassword] Staff found:', staff ? 'YES' : 'NO')
    console.log('[forgotPassword] Account type:', accountType)

    if (account) {
      const rawToken = crypto.randomBytes(32).toString('hex')
      const tokenHash = hashToken(rawToken)

      const expires = new Date()
      expires.setHours(expires.getHours() + 1)

      await prisma.resetPasswordToken.deleteMany({ where: { email } })
      await prisma.resetPasswordToken.create({
        data: { email, token: tokenHash, expires },
      })

      const resetLink = `${APP_BASE_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(
        email,
      )}`
      const content = `
        <p>Hi,</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link expires in 1 hour. If you did not request this, please ignore this email.</p>
        <p>Thank you!</p>
      `

      console.log('[forgotPassword] Attempting to send email to:', email)
      console.log('[forgotPassword] Reset link:', resetLink)

      const emailSent = await sendMail({
        to: email,
        subject: `Password Reset Request - ${APP_NAME}`,
        content,
      })

      console.log(
        '[forgotPassword] Email send result:',
        emailSent ? 'SUCCESS' : 'FAILED',
      )
    } else {
      console.log('[forgotPassword] No account found - skipping email send')
    }
    return {
      success: true,
      payload: null,
      errors: null,
      message: NEUTRAL_RESET_MESSAGE,
    }
  } catch (error) {
    console.error('[forgotPassword] Error:', error)
    return {
      success: true,
      payload: null,
      errors: null,
      message: NEUTRAL_RESET_MESSAGE,
    }
  }
}

// Resets a user's password based on the provided token and new password. It validates the input fields (token, email, password, confirmPassword) and checks for the existence and validity of the reset token in the database. If the token is valid and not expired, it updates the user's password in the User or Staff table, deletes any existing reset tokens for that email, and sends a confirmation email to the user. The function returns a success status, message, and any validation errors if applicable.

export async function resetPassword(_prevState: any, formData: FormData) {
  const token = formData.get('token')?.toString().trim()
  const email = formData.get('email')?.toString().trim()
  const password = formData.get('password')?.toString().trim()
  const confirmPassword = formData.get('confirmPassword')?.toString().trim()

  const errors: Record<string, string> = {}

  if (!password) {
    errors.password = 'Password is required.'
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
  }

  if (!confirmPassword) {
    errors.confirmpassword = 'Please confirm your password.'
  }

  if (password && confirmPassword && password !== confirmPassword) {
    errors.confirmpassword = 'Passwords do not match.'
  }

  if (!token || !email) {
    return {
      success: false,
      payload: null,
      errors: { token: 'Invalid reset link.' },
      message: 'Invalid reset link.',
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      payload: null,
      errors,
      message: 'Please fix the errors above.',
    }
  }

  try {
    const resetToken = await prisma.resetPasswordToken.findUnique({
      where: { token: hashToken(token) },
    })

    if (!resetToken || resetToken.email !== email) {
      return {
        success: false,
        payload: null,
        errors: { token: 'Invalid or expired token.' },
        message: 'Invalid or expired token.',
      }
    }

    if (resetToken.expires < new Date()) {
      await prisma.resetPasswordToken.delete({ where: { id: resetToken.id } })
      return {
        success: false,
        payload: null,
        errors: { token: 'Token has expired.' },
        message: 'Token has expired.',
      }
    }

    // Check both User and Staff tables for the account
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    })

    const staff = await prisma.staff.findUnique({
      where: { email },
    })

    const hashedPassword = await hash(password, 12)

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, updatedAt: new Date() },
      })
    } else if (staff) {
      await prisma.staff.update({
        where: { staffid: staff.staffid },
        data: { password: hashedPassword, updatedAt: new Date() },
      })
    } else {
      return {
        success: false,
        payload: null,
        errors: { token: 'Invalid or expired token.' },
        message: 'Invalid or expired token.',
      }
    }

    // Delete all reset tokens for this email after successful password reset
    await prisma.resetPasswordToken.deleteMany({ where: { email } })

    // Send confirmation email to the user
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

    return {
      success: true,
      payload: null,
      message: 'Password reset successful.',
    }
  } catch (error) {
    console.error('Error in resetPassword function: ', error)
    return {
      success: false,
      payload: null,
      message: 'Failed to reset password',
    }
  }
}
