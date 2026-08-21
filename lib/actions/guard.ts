import { getServerSession, Session } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

const ADMIN_ROLES = ['SUPERADMIN', 'ADMIN']

const STAFF_ROLES = ['STAFF']

// Result returned to the client when a guard denies access. Server actions
// return this shape instead of throwing so the calling form can render it.
export const unauthorized = {
  success: false as const,
  payload: null,
  message: 'You are not authorized to perform this action.',
}

// Returns the current session, or null if the caller is not signed in.
export async function getSession(): Promise<Session | null> {
  return (await getServerSession(authOptions)) as Session | null
}

// Guards a server action for any signed-in user. Returns the session, or an
// `unauthorized` result the caller should return as-is when null.
export async function requireUser(): Promise<Session | null> {
  const session = await getSession()
  if (!session?.user?.id) return null
  return session
}

// Guards a server action for admins (SUPERADMIN/ADMIN).
export async function requireAdmin(): Promise<Session | null> {
  const session = await getSession()
  if (!session?.user?.id) return null
  if (!ADMIN_ROLES.includes((session.user.role as string) ?? '')) return null
  return session
}

// Guards a server action for staff (STAFF).
export async function requireStaff(): Promise<Session | null> {
  const session = await getSession()
  if (!session?.user?.id) return null
  if (!STAFF_ROLES.includes((session.user.role as string) ?? '')) return null
  return session
}

// Account approval gate for the patient dashboard. This branch's schema has
// no approval workflow (no `status` field on User), so every signed-in user
// is treated as already approved. Admins are reported as such.
export async function getAccountAccess(): Promise<{
  status: string
  approved: boolean
  admin: boolean
} | null> {
  const session = await getSession()
  if (!session?.user?.id) return null
  const admin = ADMIN_ROLES.includes((session.user.role as string) ?? '')
  return { status: 'APPROVED', approved: true, admin }
}

// Strips the password hash (and any other secrets) before a user row is sent
// to the client. Accepts a single row or an array.
export function sanitizeUser<T extends { password?: unknown } | null>(
  user: T
): T {
  if (!user) return user
  const { password, ...safe } = user as Record<string, unknown>
  return safe as T
}

export function sanitizeUsers<T extends { password?: unknown }>(
  users: T[] | null | undefined
): T[] {
  if (!users) return []
  return users.map((u) => sanitizeUser(u))
}
