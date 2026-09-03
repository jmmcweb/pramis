// Guard functions for user authorization and session management in the Meditrack application. These functions ensure that users have the appropriate permissions to access certain features or perform specific actions within the application. They also provide utility functions for sanitizing user data before returning it to the client.

import { getServerSession, Session } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'

const ADMIN_ROLES = ['SUPERADMIN', 'ADMIN']

const STAFF_ROLES = ['MEDSTAFF']

export const unauthorized = {
  success: false as const,
  payload: null,
  message: 'You are not authorized to perform this action.',
}

// Retrieves the current user session from the server. If a session exists, it returns the session object; otherwise, it returns null.
export async function getSession(): Promise<Session | null> {
  return (await getServerSession(authOptions)) as Session | null
}

// Checks if the current user session exists and returns the session object if it does. If no session exists, it returns null.
export async function requireUser(): Promise<Session | null> {
  const session = await getSession()
  if (!session?.user?.id) return null
  return session
}

// Checks if the current user session exists and if the user has an admin role. If both conditions are met, it returns the session object; otherwise, it returns null.
export async function requireAdmin(): Promise<Session | null> {
  const session = await getSession()
  if (!session?.user?.id) return null
  if (!ADMIN_ROLES.includes((session.user.role as string) ?? '')) return null
  return session
}

// Checks if the current user session exists and if the user has a staff role. If both conditions are met, it returns the session object; otherwise, it returns null.
export async function requireStaff(): Promise<Session | null> {
  const session = await getSession()
  if (!session?.user?.id) return null
  if (!STAFF_ROLES.includes((session.user.role as string) ?? '')) return null
  return session
}

// Retrieves the account access information for the current user session. It checks if the user has an admin or staff role and returns the account status, approval status, and admin status. If the user is not authorized or if there is an error fetching the data, it returns null.
export async function getAccountAccess(): Promise<{
  status: string
  approved: boolean
  admin: boolean
} | null> {
  const session = await getSession()
  if (!session?.user?.id) return null
  const role = (session.user.role as string) ?? ''
  const admin = ADMIN_ROLES.includes(role)

  if (admin || STAFF_ROLES.includes(role)) {
    return { status: 'ACTIVE', approved: true, admin }
  }

  // If the user is not an admin or staff, fetch the user's status from the database to determine their account access.
  try {
    const user = await (prisma as any).user.findFirst({
      where: { id: session.user.id },
      select: { status: true },
    })
    const status = (user?.status as string) ?? 'PENDING'
    return { status, approved: status === 'ACTIVE', admin }
  } catch {
    return { status: 'PENDING', approved: false, admin }
  }
}

// Sanitizes a user object by removing sensitive information such as the password. It returns a new object containing only the safe properties of the user.
export function sanitizeUser<T extends { password?: unknown } | null>(
  user: T
): T {
  if (!user) return user
  const { password, ...safe } = user as Record<string, unknown>
  return safe as T
}

// Sanitizes an array of user objects by removing sensitive information such as passwords. It returns a new array containing only the safe properties of each user.
export function sanitizeUsers<T extends { password?: unknown }>(
  users: T[] | null | undefined
): T[] {
  if (!users) return []
  return users.map((u) => sanitizeUser(u))
}
