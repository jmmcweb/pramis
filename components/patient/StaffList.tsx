import { UserRound } from 'lucide-react'

const staff = [
  { name: 'Dr. Juan Dela Cruz', role: 'Physician' },
  { name: 'Ms. Maria Santos', role: 'Nurse' },
  { name: 'Mrs. Ana Reyes', role: 'Midwife' },
]

export default function StaffList({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-card rounded-3xl shadow-card p-5 ${className}`}>
      <h2 className="text-2xl font-bold text-brand mb-4">Health Center Staffs</h2>

      <ul className="space-y-3">
        {staff.map((member) => (
          <li
            key={member.name}
            className="flex items-center gap-3 p-3 bg-surface rounded-2xl"
          >
            <div className="w-14 h-14 shrink-0 rounded-full bg-brand-tint text-brand flex items-center justify-center">
              <UserRound className="w-7 h-7" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-bold text-body">{member.name}</h3>
              <p className="text-sm text-muted">{member.role}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
