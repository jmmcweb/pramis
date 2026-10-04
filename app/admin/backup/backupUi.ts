

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function card(darkMode: boolean): string {
  return cx(
    'rounded-xl border p-5 mb-6',
    darkMode ? 'bg-[#211a3d] border-white/10' : 'bg-white border-gray-200',
  )
}

export function heading(darkMode: boolean): string {
  return cx('text-sm font-bold', darkMode ? 'text-white' : 'text-[#1d4662]')
}

export function muted(darkMode: boolean): string {
  return cx('text-xs', darkMode ? 'text-gray-400' : 'text-gray-500')
}

export function secondaryButton(darkMode: boolean): string {
  return cx(
    'inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50',
    darkMode
      ? 'border-slate-600 text-slate-200 hover:bg-slate-700'
      : 'border-gray-300 text-[#2A2E43] hover:bg-gray-50',
  )
}

export function iconTile(darkMode: boolean, tone: StatusTone): string {
  return cx(
    'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
    tone === 'good'
      ? darkMode
        ? 'bg-[#171333] text-emerald-300'
        : 'bg-emerald-50 text-emerald-600'
      : tone === 'warn'
        ? darkMode
          ? 'bg-amber-500/15 text-amber-300'
          : 'bg-amber-50 text-amber-700'
        : darkMode
          ? 'bg-rose-500/15 text-rose-300'
          : 'bg-rose-50 text-rose-600',
  )
}

export type StatusTone = 'good' | 'warn' | 'bad'

export function dot(tone: StatusTone): string {
  return cx(
    'h-2 w-2 flex-shrink-0 rounded-full',
    tone === 'good'
      ? 'bg-emerald-500'
      : tone === 'warn'
        ? 'bg-amber-500'
        : 'bg-rose-500',
  )
}

export function mono(darkMode: boolean): string {
  return cx('font-mono text-xs', darkMode ? 'text-slate-300' : 'text-[#2A2E43]')
}