'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { LogOut, Settings, UserRound } from 'lucide-react'

interface ProfileDropdownProps {
  onClose: () => void
  profileHref: string
  settingsHref: string
  photo?: string | null
  darkMode?: boolean
  onToggleDarkMode?: () => void
  profileLabel?: string
  fallbackName?: string
  fallbackInitial?: string
  accentClassName?: string
  showRoleId?: boolean
  positionClassName?: string
}

function getInitials(name?: string | null, fallback = ''): string {
  if (!name) return fallback
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return initials || fallback
}

export default function ProfileDropdown({
  onClose,
  profileHref,
  settingsHref,
  photo,
  darkMode,
  onToggleDarkMode,
  profileLabel = 'Profile',
  fallbackName = 'User',
  fallbackInitial = 'M',
  accentClassName,
  showRoleId = false,
  positionClassName = 'absolute top-full right-0 mt-2',
}: ProfileDropdownProps) {
  const router = useRouter()
  const { data: session } = useSession()

  const image = photo ?? session?.user?.image
  const name = session?.user?.name?.trim() || fallbackName
  const email = session?.user?.email?.trim()
  const initial = getInitials(session?.user?.name, fallbackInitial)

  const handleNavigate = (href: string) => {
    onClose()
    router.push(href)
  }

  const handleSignOut = () => {
    onClose()
    signOut({ callbackUrl: '/login' })
  }

  const isDark = darkMode ?? false
  const useThemed = darkMode !== undefined
  const containerClass = accentClassName
    ? 'bg-white dark:bg-[#050617] border border-line dark:border-[rgba(255,255,255,0.10)]'
    : 'bg-card border border-line'
  const themedContainerClass = isDark
    ? 'bg-[#050617] border border-[rgba(255,255,255,0.10)]'
    : 'bg-white border border-gray-200'
  const themedBodyClass = isDark ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'
  const themedItemClass = isDark
    ? 'text-[#F9FAFB] hover:bg-[#0f1438]'
    : 'text-[#2A2E43] hover:bg-gray-50'
  const themedItemIconClass = isDark ? 'text-[#F9FAFB]' : 'text-gray-500'
  const themedMutedClass = isDark ? 'text-[#F9FAFB]' : 'text-gray-500'

  return (
    <>
      <div className="fixed inset-0 z-[199]" onClick={onClose} />
      <div
        className={`${positionClassName} w-[min(280px,calc(100vw-16px))] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] z-[200] overflow-hidden animate-[slideIn_0.2s_ease] ${
          useThemed ? themedContainerClass : containerClass
        }`}
      >
        <div
          className={`flex items-center gap-3 px-4 py-4 border-b ${
            useThemed
              ? isDark
                ? 'border-[rgba(255,255,255,0.10)]'
                : 'border-gray-200'
              : 'border-line'
          }`}
        >
          {image ? (
            <Image
              src={image}
              alt=""
              aria-hidden="true"
              width={40}
              height={40}
              className={`w-10 h-10 rounded-full object-cover flex-shrink-0 ${
                useThemed
                  ? isDark
                    ? 'border border-[rgba(255,255,255,0.10)]'
                    : 'border border-gray-200'
                  : 'border border-line'
              }`}
            />
          ) : (
            <span
              className={`w-10 h-10 rounded-full font-bold flex items-center justify-center flex-shrink-0 ${
                accentClassName ?? 'bg-brand text-white'
              }`}
            >
              {initial}
            </span>
          )}
          <div className="min-w-0">
            <p
              className={`font-poppins text-sm font-bold m-0 truncate ${
                useThemed ? themedBodyClass : 'text-body'
              }`}
            >
              {name}
            </p>
            {email && (
              <p
                className={`text-xs m-0 truncate ${
                  useThemed ? themedMutedClass : 'text-muted'
                }`}
              >
                {email}
              </p>
            )}
            {showRoleId && session?.user?.id && (
              <p
                className={`text-[11px] font-bold uppercase tracking-[0.5px] m-0 truncate ${
                  useThemed ? 'text-[#4E69D3]' : 'text-brand'
                }`}
              >
                {session.user.id}
              </p>
            )}
          </div>
        </div>

        <div className="p-2 flex flex-col">
          <button
            onClick={() => handleNavigate(profileHref)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer border-none bg-transparent text-left ${
              useThemed
                ? themedItemClass
                : 'text-body hover:bg-brand-tint hover:text-brand'
            }`}
          >
            <UserRound
              className={`w-4.5 h-4.5 ${useThemed ? themedItemIconClass : ''}`}
              aria-hidden="true"
            />
            {profileLabel}
          </button>
          <button
            onClick={() => handleNavigate(settingsHref)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer border-none bg-transparent text-left ${
              useThemed
                ? themedItemClass
                : 'text-body hover:bg-brand-tint hover:text-brand'
            }`}
          >
            <Settings
              className={`w-4.5 h-4.5 ${useThemed ? themedItemIconClass : ''}`}
              aria-hidden="true"
            />
            Account Settings
          </button>
          {useThemed && (
            <div
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold font-poppins ${themedBodyClass}`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
                className={`w-4.5 h-4.5 flex-shrink-0 ${themedItemIconClass}`}
              >
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
              <span>Dark Mode</span>
              <label
                className="relative inline-block w-[38px] h-5 ml-auto flex-shrink-0 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0 peer"
                  checked={isDark}
                  onChange={() => onToggleDarkMode?.()}
                />
                <span className="absolute inset-0 bg-gray-300 rounded-full transition-colors before:content-[''] before:absolute before:h-4 before:w-4 before:left-[2px] before:bottom-[2px] before:bg-white before:rounded-full before:transition-transform peer-checked:bg-[#4E69D3] peer-checked:before:translate-x-[18px]" />
              </label>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer border-none bg-transparent text-left ${
              useThemed
                ? isDark
                  ? 'text-red-400 hover:bg-[#0f1438]'
                  : 'text-red-500 hover:bg-gray-50'
                : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
            }`}
          >
            <LogOut className="w-4.5 h-4.5" aria-hidden="true" />
            Log Out
          </button>
        </div>
      </div>
    </>
  )
}
