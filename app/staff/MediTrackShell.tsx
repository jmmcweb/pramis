'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useDarkMode, DarkModeProvider } from '@/app/staff/DarkModeContext'
import {
  ProfilePhotoProvider,
  useProfilePhoto,
} from '@/app/staff/ProfilePhotoContext'
import SidebarFooter from '@/components/globals/SidebarFooter'
import { useNotifications } from '@/components/patient/useNotifications'
import StaffStatusWatcher from '@/components/staff/StaffStatusWatcher'
import { useLogoutConfirmation } from '@/components/ui/LogoutConfirmDialog'
import type { PatientNotification } from '@/components/patient/notificationData'

const navItems: {
  href: string
  label: string
  icon: string
  exact?: boolean
  adminOnly?: boolean
}[] = [
  { href: '/staff', label: 'Homepage', icon: '/icon-home.png', exact: true },
  {
    href: '/staff/appointmentmanagement',
    label: 'Appointment Management',
    icon: '/icon-calendar.png',
  },
  {
    href: '/staff/appointmentschedule',
    label: 'Appointment Schedule',
    icon: '/calendar.png',
  },
  {
    href: '/staff/availability',
    label: 'My Availability',
    icon: '/care.png',
    adminOnly: true,
  },
  { href: '/staff/events', label: 'Events', icon: '/icon-events.png' },
  { href: '/staff/services', label: 'Services', icon: '/icon-services.png' },
  {
    href: '/staff/patientrecord',
    label: 'Patient Record',
    icon: '/icon-patients.png',
  },
  { href: '/staff/queueing', label: 'Queueing', icon: '/queue.png' },
]

export default function MediTrackShell({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DarkModeProvider>
      <ProfilePhotoProvider>
        <LayoutInner>{children}</LayoutInner>
      </ProfilePhotoProvider>
    </DarkModeProvider>
  )
}

function getInitials(name?: string | null): string {
  if (!name) return ''
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const currentPage = navItems.find((item) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`),
  )
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { darkMode, setDarkMode } = useDarkMode()
  const { photo } = useProfilePhoto()
  const { data: session } = useSession()

  const { notifications, unreadCount, refresh, markRead, markAllRead } =
    useNotifications()
  const { requestLogout, logoutDialog } = useLogoutConfirmation({ darkMode })

  return (
    <div
      className={`flex min-h-screen ${darkMode ? 'bg-[#0b1220]' : 'bg-slate-50'}`}
    >
      <StaffStatusWatcher />
      <style>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${darkMode ? '#111c30' : '#f1f5f9'}; border-radius: 6px; }
        ::-webkit-scrollbar-thumb { background: ${darkMode ? '#475569' : '#cbd5e1'}; border-radius: 6px; }
        ::-webkit-scrollbar-thumb:hover { background: ${darkMode ? '#64748b' : '#94a3b8'}; border-radius: 6px; }
        * { scrollbar-width: thin; scrollbar-color: ${darkMode ? '#475569 #111c30' : '#cbd5e1 #f1f5f9'}; }
      `}</style>
      <aside
        className={`fixed left-0 top-0 hidden h-screen w-[288px] flex-col gap-5 overflow-hidden border-r px-4 pb-6 pt-6 shadow-sm lg:flex ${darkMode ? 'border-white/10 bg-[#0b1220]' : 'border-slate-200 bg-white'}`}
      >
        <SidebarContent
          darkMode={darkMode}
          isAdmin={['SUPERADMIN', 'ADMIN'].includes(session?.user?.role ?? '')}
        />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-[150] lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className={`absolute left-0 top-0 flex h-full w-[288px] flex-col gap-5 overflow-y-auto border-r px-4 pb-6 pt-6 shadow-xl animate-[slideIn_0.2s_ease] ${darkMode ? 'border-white/10 bg-[#0b1220]' : 'border-slate-200 bg-white'}`}
          >
            <SidebarContent
              darkMode={darkMode}
              isAdmin={['SUPERADMIN', 'ADMIN'].includes(session?.user?.role ?? '')}
              onNavigate={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col lg:ml-[288px]">
        <header
          className={`sticky top-0 z-30 border-b backdrop-blur-lg ${darkMode ? 'border-white/10 bg-[#111c30]/95' : 'border-slate-200/80 bg-white/90'}`}
        >
          <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 lg:hidden ${darkMode ? 'border-white/10 bg-white/5 text-slate-200' : 'border-slate-200 bg-white text-slate-600'}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <h1
                className={`truncate text-base font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}
              >
                {currentPage?.label ?? 'PRAMIS'}
              </h1>
            </div>
            <div className={`flex shrink-0 items-center gap-3 text-base ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              <button
                onClick={() => {
                  if (!notifOpen) refresh()
                  setNotifOpen(!notifOpen)
                  setProfileOpen(false)
                }}
                aria-label="Open notifications"
                aria-expanded={notifOpen}
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 ${darkMode ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                <img
                  src="/icon-notification.png"
                  alt=""
                  aria-hidden="true"
                  className="h-5 w-5 object-contain"
                />
                {unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setProfileOpen(!profileOpen)
                  setNotifOpen(false)
                }}
                aria-label="Open profile menu"
                aria-expanded={profileOpen}
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand text-sm font-semibold text-white shadow-sm ring-2 ring-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30"
              >
                {photo ? (
                  <img
                    src={photo}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getInitials(session?.user?.name) || 'MS'
                )}
              </button>
            </div>
          </div>
        </header>

        {notifOpen && (
          <NotificationDropdown
            notifications={notifications}
            markAll={markAllRead}
            markOne={markRead}
            onClose={() => setNotifOpen(false)}
            darkMode={darkMode}
          />
        )}
        {profileOpen && (
          <ProfileDropdown
            onClose={() => setProfileOpen(false)}
            onSignOut={requestLogout}
          />
        )}
        {logoutDialog}

        <div
          className={`min-w-0 flex-1 px-4 pb-10 pt-5 sm:px-6 ${darkMode ? 'bg-[#0b1220]' : 'bg-slate-50'}`}
        >
          <div className="mx-auto w-full max-w-7xl overflow-x-hidden lg:pt-2">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

function SidebarContent({
  darkMode,
  isAdmin,
  onNavigate,
}: {
  darkMode: boolean
  isAdmin: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <>
      <div className="flex items-center gap-1.5 pl-4">
        <div className="w-[68px] h-[68px] flex-shrink-0">
          <img
            src="/logo.png"
            alt="PRAMIS"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex flex-col items-end justify-center min-w-0 w-fit">
          <p
            className={`font-bebas text-[36px] lg:text-[50px] leading-none tracking-[0.03em] m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#0F588B]'}`}
          >
            PRAMIS
          </p>
          <p
            className={`w-full flex justify-between font-asap text-[11px] lg:text-[15px] tracking-normal leading-none whitespace-nowrap mt-1 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#0F588B]'}`}
          >
            <span>Stay</span>
            <span>On</span>
            <span>Track</span>
            <span>With</span>
            <span>Us</span>
          </p>
        </div>
      </div>

      <nav className="flex-1 mt-4">
        <p className="font-poppins text-[11px] font-bold text-gray-400 uppercase tracking-[1px] mb-3 pl-4">
          Menu
        </p>
        <ul className="list-none p-0 m-0 flex flex-col gap-1">
          {navItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(item.href + '/')
              return (
                <li
                  key={item.href}
                  className={`rounded-xl transition-colors ${isActive ? (darkMode ? 'bg-sky-400/10' : 'bg-brand-tint') : darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                >
                  <Link
                    href={item.href}
                    onClick={() => onNavigate?.()}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm no-underline transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 ${isActive ? (darkMode ? 'font-semibold text-sky-200' : 'font-semibold text-brand') : darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-brand'}`}
                  >
                    <span className="inline-flex items-center justify-center w-7 h-7 flex-shrink-0">
                      <img
                        src={item.icon}
                        alt=""
                        className="w-6 h-6 object-contain"
                      />
                    </span>
                    {item.label}
                  </Link>
                </li>
              )
            })}
        </ul>
      </nav>

      <SidebarFooter darkMode={darkMode} />
    </>
  )
}

function NotificationDropdown({
  notifications,
  markAll,
  markOne,
  onClose,
  darkMode,
}: {
  notifications: PatientNotification[]
  markAll: () => void
  markOne: (id: string) => void
  onClose: () => void
  darkMode: boolean
}) {
  const [activeCategory, setActiveCategory] = useState('All')

  const categoryColors: Record<string, string> = {
    All: '#4E69D3',
    Appointment: '#4CAF50',
    Records: '#0F588B',
    Account: '#16A34A',
    'Approval Request': '#F59E0B',
  }

  const filtered =
    activeCategory === 'All'
      ? notifications
      : notifications.filter((n) => n.category === activeCategory)
  const categories = [
    'All',
    'Appointment',
    'Records',
    'Account',
    'Approval Request',
  ]
  const unreadCount = notifications.filter((n) => n.unread).length

  const markAllAsRead = () => {
    markAll()
  }

  const markRead = (id: string) => {
    markOne(id)
  }

  return (
    <>
      <div className="fixed inset-0 z-[199]" onClick={onClose} />
      <div
        className={`absolute top-[70px] right-0 w-[min(450px,calc(100vw-16px))] max-h-[520px] max-w-[calc(100vw-16px)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] z-[200] flex flex-col overflow-hidden animate-[slideIn_0.2s_ease] ${darkMode ? 'bg-[#050617]' : 'bg-white'}`}
      >
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'}`}
        >
          <h3
            className={`font-poppins text-lg font-bold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
          >
            Notifications
          </h3>
          <div className="flex items-center gap-2">
            <button
              disabled={unreadCount === 0}
              className="text-xs font-semibold text-[#4E69D3] bg-transparent border-none px-2 py-1 rounded-md font-poppins hover:bg-blue-50 disabled:opacity-50 cursor-pointer"
              onClick={markAllAsRead}
            >
              Mark all as read
            </button>
            <button
              className={`w-7 h-7 border-none rounded-full cursor-pointer text-sm flex items-center justify-center ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] hover:bg-[#141a45]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              onClick={onClose}
            >
              &times;
            </button>
          </div>
        </div>
        <div
          className={`flex gap-1.5 px-4 py-3 border-b overflow-x-auto flex-shrink-0 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'}`}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all font-poppins ${
                activeCategory === cat
                  ? 'text-white border-transparent'
                  : darkMode
                    ? 'bg-transparent text-[#F9FAFB] border-[rgba(255,255,255,0.20)] hover:border-[var(--cat-color)] hover:text-[var(--cat-color)]'
                    : 'bg-transparent text-gray-500 border-gray-200 hover:border-[var(--cat-color)] hover:text-[var(--cat-color)]'
              }`}
              style={
                {
                  '--cat-color': categoryColors[cat],
                  background:
                    activeCategory === cat ? categoryColors[cat] : undefined,
                } as React.CSSProperties & { '--cat-color': string }
              }
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {filtered.length > 0 ? (
            filtered.map((n) => (
              <div
                key={n.id}
                onClick={() => n.unread && markRead(n.id)}
                className={`px-6 py-4.5 border-l-4 cursor-pointer transition-colors ${n.unread ? (darkMode ? 'bg-[#0f1438] hover:bg-[#141a45]' : 'bg-blue-50 hover:bg-blue-100') : darkMode ? 'hover:bg-[#0f1438]' : 'hover:bg-gray-50'}`}
                style={{ borderLeftColor: categoryColors[n.category] }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-[11px] font-bold text-white px-2 py-0.5 rounded-full uppercase tracking-[0.5px]"
                    style={{ background: categoryColors[n.category] }}
                  >
                    {n.category}
                  </span>
                  {n.unread && (
                    <span className="w-2 h-2 rounded-full bg-[#4E69D3] flex-shrink-0" />
                  )}
                </div>
                <p
                  className={`text-sm font-bold my-1.5 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
                >
                  {n.title}
                </p>
                <p
                  className={`text-xs my-0 leading-relaxed ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'}`}
                >
                  {n.description}
                </p>
                <span
                  className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}
                >
                  {n.time}
                </span>
              </div>
            ))
          ) : (
            <div
              className={`text-center py-10 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}
            >
              No notifications
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function ProfileDropdown({
  onClose,
  onSignOut,
}: {
  onClose: () => void
  onSignOut: () => void
}) {
  const { darkMode, setDarkMode } = useDarkMode()
  const { photo } = useProfilePhoto()
  const { data: session } = useSession()
  const router = useRouter()
  return (
    <>
      <div className="fixed inset-0 z-[199]" onClick={onClose} />
      <div
        className={`absolute top-[70px] right-0 w-[260px] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] z-[200] overflow-hidden animate-[slideIn_0.2s_ease] ${darkMode ? 'bg-[#050617]' : 'bg-white'}`}
      >
        <div
          className={`flex items-center gap-3 px-5 py-4 border-b ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'}`}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'}`}
          >
            {photo ? (
              <img src={photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`w-5.5 h-5.5 ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'}`}
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>
          <div className="min-w-0 leading-tight">
            <span className="text-[11px] font-bold text-[#4E69D3] uppercase tracking-[0.5px] block">
              {session?.user?.id || ''}
            </span>
            <span
              className={`text-sm font-bold block ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
            >
              {session?.user?.name || 'Medical Staff'}
            </span>
            <span
              className={`text-xs block truncate ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'}`}
            >
              {session?.user?.email || ''}
            </span>
          </div>
        </div>
        <div className="py-2">
          <button
            className={`flex items-center gap-3 w-full px-5 py-2.5 border-none bg-transparent text-sm font-semibold cursor-pointer font-poppins text-left ${darkMode ? 'text-[#F9FAFB] hover:bg-[#0f1438]' : 'text-[#2A2E43] hover:bg-gray-50'}`}
            onClick={() => {
              router.push('/staff/profile')
              onClose()
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`w-4.5 h-4.5 flex-shrink-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'}`}
            >
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Profile</span>
          </button>
          <button
            className={`flex items-center gap-3 w-full px-5 py-2.5 border-none bg-transparent text-sm font-semibold cursor-pointer font-poppins text-left ${darkMode ? 'text-[#F9FAFB] hover:bg-[#0f1438]' : 'text-[#2A2E43] hover:bg-gray-50'}`}
            onClick={() => {
              router.push('/staff/accountsettings')
              onClose()
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`w-4.5 h-4.5 flex-shrink-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'}`}
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <span>Account Settings</span>
          </button>
          <div
            className={`flex items-center gap-3 w-full px-5 py-2.5 text-sm font-semibold font-poppins ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`w-4.5 h-4.5 flex-shrink-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'}`}
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
                checked={darkMode}
                onChange={() => setDarkMode(!darkMode)}
              />
              <span className="absolute inset-0 bg-gray-300 rounded-full transition-colors before:content-[''] before:absolute before:h-4 before:w-4 before:left-[2px] before:bottom-[2px] before:bg-white before:rounded-full before:transition-transform peer-checked:bg-[#4E69D3] peer-checked:before:translate-x-[18px]" />
            </label>
          </div>
          <div
            className={`h-px my-1.5 ${darkMode ? 'bg-[rgba(255,255,255,0.10)]' : 'bg-gray-200'}`}
          />
          <button
            className={`flex items-center gap-3 w-full px-5 py-2.5 border-none bg-transparent text-sm font-semibold cursor-pointer font-poppins text-left ${darkMode ? 'text-red-400 hover:bg-[#0f1438]' : 'text-red-500 hover:bg-gray-50'}`}
            onClick={() => {
              onClose()
              onSignOut()
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4.5 h-4.5 text-red-500 flex-shrink-0"
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </>
  )
}
