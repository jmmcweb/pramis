// Core audit-trail writer. This module intentionally avoids importing
// `next-auth`/`authOptions` so it can be used from `lib/authOptions.ts` without
// creating a circular dependency.

import { headers } from 'next/headers'
import prisma from '@/lib/prisma'
import { nextReferenceId } from '@/lib/referenceId'
import {
  AUDITED_ROLES,
  type AuditAction,
  type AuditActorType,
  type AuditEntity,
  type AuditStatus,
} from '@/lib/constants/audit'

export type AuditActor = {
  id?: string | null
  name?: string | null
  email?: string | null
  role?: string | null
  accountType?: string | null
}

export type AuditRecord = {
  action: AuditAction
  entity: AuditEntity
  description: string
  actor: AuditActor
  entityId?: string | null
  status?: AuditStatus
  metadata?: Record<string, any> | null
  // Records the entry even when the acting role is not an admin/staff role.
  force?: boolean
}

export const SYSTEM_ACTOR: AuditActor = {
  id: null,
  name: 'System',
  email: null,
  role: 'SYSTEM',
  accountType: 'SYSTEM',
}

// True when the given role is an admin or medical staff role, i.e. a role whose
// actions belong in the audit trail.
export function isAuditedRole(role?: string | null): boolean {
  return (AUDITED_ROLES as readonly string[]).includes(String(role ?? ''))
}

async function readRequestContext() {
  try {
    const headerList = await headers()
    const forwarded = headerList.get('x-forwarded-for') || ''
    const ip =
      forwarded.split(',')[0].trim() ||
      headerList.get('x-real-ip') ||
      headerList.get('cf-connecting-ip') ||
      null
    return { ipAddress: ip, userAgent: headerList.get('user-agent') }
  } catch {
    // headers() is unavailable outside of a request scope (e.g. scripts).
    return { ipAddress: null, userAgent: null }
  }
}

// Writes one append-only audit entry. Never throws: auditing must not break the
// business action that triggered it.
export async function writeAuditLog(input: AuditRecord): Promise<void> {
  try {
    const actor = input.actor ?? SYSTEM_ACTOR
    if (!isAuditedRole(actor.role) && !input.force) return

    const { ipAddress, userAgent } = await readRequestContext()

    await (prisma as any).auditLog.create({
      data: {
        logid: await nextReferenceId('AUD'),
        actorId: actor.id ?? null,
        actorName: actor.name ?? actor.email ?? null,
        actorEmail: actor.email ?? null,
        actorRole: actor.role || 'SYSTEM',
        actorType: (actor.accountType || 'SYSTEM') as AuditActorType,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        description: input.description,
        status: input.status ?? 'SUCCESS',
        metadata: input.metadata ?? null,
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    console.error('[writeAuditLog | Prisma | Error]:', error)
  }
}