import AuditLogsClient from './AuditLogsClient'
import { getAuditLogs, type AuditLogFilters } from '@/lib/actions/audit'

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const pick = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }

  const filters: AuditLogFilters = {
    search: pick('search') || undefined,
    action: pick('action') || undefined,
    entity: pick('entity') || undefined,
    role: pick('role') || undefined,
    from: pick('from') || undefined,
    to: pick('to') || undefined,
  }
  const page = Number.parseInt(pick('page') || '1', 10) || 1

  const result = await getAuditLogs(filters, page)

  return (
    <AuditLogsClient
      initialResult={result}
      initialFilters={filters}
    />
  )
}
