import { UserRound } from 'lucide-react'
import type { StaffDirectoryEntry } from '@/lib/actions/staff'

export default function StaffList({
  staff,
  className = '',
}: {
  staff: StaffDirectoryEntry[]
  className?: string
}) {
  return (
    <div className={`bg-card rounded-3xl shadow-card p-5 ${className}`}>
      <h2 className="text-2xl font-bold text-brand mb-4">Health Center Staffs</h2>

      {staff.length === 0 ? (
        <p className="text-sm text-muted bg-surface rounded-2xl p-4">
          No staff accounts yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {staff.map((member) => (
            <li
              key={member.id}
              className="flex items-center gap-3 p-3 bg-surface rounded-2xl"
            >
              <div className="w-14 h-14 shrink-0 rounded-full bg-brand-tint text-brand flex items-center justify-center">
                <UserRound className="w-7 h-7" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-body truncate">{member.name}</h3>
                <p className="text-sm text-muted truncate">{member.role}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}