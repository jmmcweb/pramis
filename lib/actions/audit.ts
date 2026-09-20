'use server'

import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { requireAdmin } from '@/lib/actions/guard'
import {
  writeAuditLog,
  type AuditActor,
  type AuditRecord,
} from '@/lib/audit'
import {
  type AuditAction,
  type AuditEntity,
  type AuditStatus,
} from '@/lib/constants/audit'

export type AuditLogInput = {
  action: AuditAction
  entity: AuditEntity
  description: string
  entityId?: string | null
  status?: AuditStatus
  metadata?: Record<string, any> | null
  // Snapshot of the acting account. Only required when the action happens
  // before/outside of an authenticated admin or staff session (e.g. a failed
  // sign in attempt), otherwise the current session is used automatically.
  actor?: AuditActor | null
  // Records the entry even when the acting role is not an admin/staff role.
  force?: boolean
}

export type AuditLogItem = {
  logid: string
  actorId: string | null
  actorName: string | null
  actorEmail: string | null
  actorRole: string
  actorType: string
  action: string
  entity: string
  entityId: string | null
  description: string
  status: string
  metadata: any
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

// Resolves the acting account from the current session, falling back to the
// supplied actor snapshot when there is no active session.
export async function resolveAuditActor(
  fallback?: AuditActor | null,
): Promise<AuditActor> {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    const authUser = session.user as any
    return {
      id: authUser.id ?? null,
      name: authUser.name ?? null,
      email: authUser.email ?? null,
      role: authUser.role ?? 'USER',
      accountType: authUser.accountType ?? 'USER',
    }
  }
  return (
    fallback ?? {
      id: null,
      name: 'System',
      email: null,
      role: 'SYSTEM',
      accountType: 'SYSTEM',
    }
  )
}

// Records one audit entry for the currently signed-in admin or medical staff
// account. Entries are skipped silently when the actor is not an admin/staff
// account, unless `force` is set.
export async function recordAudit(input: AuditLogInput): Promise<void> {
  // When an explicit actor snapshot is supplied (e.g. password reset via a
  // public link where there is no session), use it directly instead of
  // reaching into the session.
  const actor = input.actor ?? (await resolveAuditActor())
  const record: AuditRecord = { ...input, actor }
  await writeAuditLog(record)
}

export type AuditLogFilters = {
  search?: string
  action?: string
  entity?: string
  role?: string
  from?: string
  to?: string
}

export type AuditLogStats = {
  total: number
  today: number
  admins: number
  staff: number
}

export type AuditLogResult = {
  success: boolean
  message: string | null
  logs: AuditLogItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
  stats: AuditLogStats
}

const PER_PAGE = 15

const EMPTY_STATS: AuditLogStats = {
  total: 0,
  today: 0,
  admins: 0,
  staff: 0,
}

function buildWhere(filters: AuditLogFilters) {
  const where: any = {}
  const search = filters.search?.trim()
  if (search) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { actorName: { contains: search, mode: 'insensitive' } },
      { actorEmail: { contains: search, mode: 'insensitive' } },
      { entityId: { contains: search, mode: 'insensitive' } },
      { logid: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (filters.action && filters.action !== 'ALL') where.action = filters.action
  if (filters.entity && filters.entity !== 'ALL') where.entity = filters.entity
  if (filters.role && filters.role !== 'ALL') {
    // SUPERADMIN entries are grouped under "Admin" in the UI, so filtering by
    // Admin must include them.
    where.actorRole =
      filters.role === 'ADMIN'
        ? { in: ['SUPERADMIN', 'ADMIN'] }
        : filters.role
  }

  const createdAt: any = {}
  if (filters.from) {
    const from = new Date(`${filters.from}T00:00:00.000Z`)
    if (!Number.isNaN(from.getTime())) createdAt.gte = from
  }
  if (filters.to) {
    const to = new Date(`${filters.to}T23:59:59.999Z`)
    if (!Number.isNaN(to.getTime())) createdAt.lte = to
  }
  if (Object.keys(createdAt).length > 0) where.createdAt = createdAt

  return where
}

// Returns a filtered, paginated page of audit entries plus summary counters.
export async function getAuditLogs(
  filters: AuditLogFilters = {},
  page = 1,
): Promise<AuditLogResult> {
  const session = await requireAdmin()
  if (!session) {
    return {
      success: false,
      message: 'Unauthorized',
      logs: [],
      total: 0,
      page: 1,
      perPage: PER_PAGE,
      totalPages: 0,
      stats: EMPTY_STATS,
    }
  }

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1

  try {
    const where = buildWhere(filters)

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const [total, rows, admins, staff, today] = await Promise.all([
      (prisma as any).auditLog.count({ where }),
      (prisma as any).auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * PER_PAGE,
        take: PER_PAGE,
      }),
      (prisma as any).auditLog.count({
        where: { actorRole: { in: ['SUPERADMIN', 'ADMIN'] } },
      }),
      (prisma as any).auditLog.count({ where: { actorRole: 'MEDSTAFF' } }),
      (prisma as any).auditLog.count({
        where: { createdAt: { gte: startOfToday } },
      }),
    ])

    const logs: AuditLogItem[] = rows.map((row: any) => ({
      ...row,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt),
    }))

    return {
      success: true,
      message: null,
      logs,
      total,
      page: safePage,
      perPage: PER_PAGE,
      totalPages: Math.max(1, Math.ceil(total / PER_PAGE)),
      stats: { total, today, admins, staff },
    }
  } catch (error) {
    console.error('[getAuditLogs | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to load audit logs.',
      logs: [],
      total: 0,
      page: safePage,
      perPage: PER_PAGE,
      totalPages: 0,
      stats: EMPTY_STATS,
    }
  }
}