'use server'

import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/actions/guard'
import { nextReferenceId } from '@/lib/referenceId'

export type NotificationCategory =
  | 'Appointment'
  | 'Records'
  | 'Account'
  | 'Approval Request'

export type NotificationView = {
  id: string
  category: NotificationCategory
  title: string
  description: string
  time: string // '5 minutes ago'
  unread: boolean
}

export async function createNotification(input: {
  userId?: string
  staffId?: string
  category: NotificationCategory
  title: string
  description: string
}) {
  try {
    await (prisma as any).notification.create({
      data: {
        notificationid: await nextReferenceId('NTF'),
        userId: input.userId ?? null,
        staffId: input.staffId ?? null,
        category: input.category,
        title: input.title,
        description: input.description,
      },
    })
  } catch (error) {
    console.error('[createNotification | Prisma | Error]:', error)
  }
}

export async function notifyAllStaff(input: {
  category: NotificationCategory
  title: string
  description: string
}) {
  try {
    const [staffRows, userRows] = await Promise.all([
      (prisma as any).staff.findMany({
        where: { role: { in: ['ADMIN', 'MIDWIFE'] } },
        select: { staffid: true, email: true },
      }),
      (prisma as any).user.findMany({
        where: { role: { in: ['SUPERADMIN', 'ADMIN', 'STAFF', 'MIDWIFE'] } },
        select: { id: true, email: true },
      }),
    ])

    const staffEmails = new Set(
      staffRows.map((s: any) => String(s.email).toLowerCase()),
    )
    const targets: Array<{ userId?: string; staffId?: string }> = [
      ...staffRows.map((s: any) => ({ staffId: s.staffid })),
      ...userRows
        .filter((u: any) => !staffEmails.has(String(u.email).toLowerCase()))
        .map((u: any) => ({ userId: u.id })),
    ]

    for (const target of targets) {
      await createNotification({
        ...target,
        category: input.category,
        title: input.title,
        description: input.description,
      })
    }
  } catch (error) {
    console.error('[notifyAllStaff | Prisma | Error]:', error)
  }
}

function relativeTime(date: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function ownerFilter(session: any) {
  const id = session.user.id as string
  const role = (session.user.role as string) ?? ''
  if (role === 'USER') return { userId: id }
  try {
    const staffRow = await (prisma as any).staff.findUnique({
      where: { staffid: id },
      select: { staffid: true },
    })
    if (staffRow) return { staffId: id }
  } catch {
  }
  return { userId: id }
}

export async function getMyNotifications(): Promise<{
  success: boolean
  message: string
  notifications: NotificationView[]
  unreadCount: number
}> {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Unauthorized', notifications: [], unreadCount: 0 }
  }

  try {
    const rows = await (prisma as any).notification.findMany({
      where: await ownerFilter(session),
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const notifications: NotificationView[] = rows.map((row: any) => ({
      id: row.notificationid,
      category: row.category as NotificationCategory,
      title: row.title,
      description: row.description,
      time: relativeTime(new Date(row.createdAt)),
      unread: !row.readAt,
    }))

    return {
      success: true,
      message: 'Notifications fetched.',
      notifications,
      unreadCount: notifications.filter((n) => n.unread).length,
    }
  } catch (error) {
    console.error('[getMyNotifications | Prisma | Error]:', error)
    return { success: false, message: 'Failed to fetch notifications.', notifications: [], unreadCount: 0 }
  }
}

export async function markNotificationRead(
  id: string,
): Promise<{ success: boolean; message: string }> {
  const session = await requireUser()
  if (!session) return { success: false, message: 'Unauthorized' }
  if (!id) return { success: false, message: 'Notification ID is required.' }

  try {
    await (prisma as any).notification.updateMany({
      where: { notificationid: id, ...(await ownerFilter(session)), readAt: null },
      data: { readAt: new Date() },
    })
    return { success: true, message: 'Notification marked as read.' }
  } catch (error) {
    console.error('[markNotificationRead | Prisma | Error]:', error)
    return { success: false, message: 'Failed to mark notification as read.' }
  }
}

export async function markAllNotificationsRead(): Promise<{
  success: boolean
  message: string
}> {
  const session = await requireUser()
  if (!session) return { success: false, message: 'Unauthorized' }

  try {
    await (prisma as any).notification.updateMany({
      where: { ...(await ownerFilter(session)), readAt: null },
      data: { readAt: new Date() },
    })
    return { success: true, message: 'All notifications marked as read.' }
  } catch (error) {
    console.error('[markAllNotificationsRead | Prisma | Error]:', error)
    return { success: false, message: 'Failed to mark notifications as read.' }
  }
}