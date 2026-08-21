import { Clock3 } from 'lucide-react'

export default function ApprovalBanner({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/40 rounded-2xl px-4 py-3 flex items-center gap-3 ${className}`}>
      <span className="w-9 h-9 shrink-0 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
        <Clock3 className="w-5 h-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
          Pending Approval
        </p>
        <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-snug">
          Your registration was successful. A health center staff member is
          reviewing your account.
        </p>
      </div>
    </div>
  )
}
