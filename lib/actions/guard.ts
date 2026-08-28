import { getServerSession, Session } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'

const ADMIN_ROLES = ['SUPERADMIN', 'ADMIN']

const STAFF_ROLES = ['STAFF', 'MIDWIFE']

export const unauthorized = {
  success: false as const,
  payload: null,
  message: 'You are not authorized to perform this action.',
}

export async function getSession(): Promise<Session | null> {
  return (await getServerSession(authOptions)) as Session | null
}

export async function requireUser(): Promise<Session | null> {
  const session = await getSession()
  if (!session?.user?.id) return null
  return session
}

export async function requireAdmin(): Promise<Session | null> {
  const session = await getSession()
  if (!session?.user?.id) return null
  if (!ADMIN_ROLES.includes((session.user.role as string) ?? '')) return null
  return session
}

export async function requireStaff(): Promise<Session | null> {
  const session = await getSession()
  if (!session?.user?.id) return null
  if (!STAFF_ROLES.includes((session.user.role as string) ?? '')) return null
  return session
}

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
