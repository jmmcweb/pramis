'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useDarkMode, DarkModeProvider } from '@/app/staff/DarkModeContext'
import { ProfilePhotoProvider, useProfilePhoto } from '@/app/staff/ProfilePhotoContext'
import SidebarFooter from '@/components/globals/SidebarFooter'
import { addDays } from '@/src/lib/dateUtils'

const navItems = [
  { href: '/staff', label: 'Homepage', icon: '/icon-home.png', exact: true },
  { href: '/staff/appointmentmanagement', label: 'Appointment Management', icon: '/icon-calendar.png' },
  { href: '/staff/events', label: 'Events', icon: '/icon-events.png' },
  { href: '/staff/services', label: 'Services', icon: '/icon-services.png' },
  { href: '/staff/patientrecord', label: 'Patient Record', icon: '/icon-patients.png' },
]

export default function MediTrackShell({ children }: { children: React.ReactNode }) {
  return (
    <DarkModeProvider>
      <ProfilePhotoProvider>
        <LayoutInner>{children}</LayoutInner>
      </ProfilePhotoProvider>
    </DarkModeProvider>
  )
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { darkMode, setDarkMode } = useDarkMode()
  const { photo } = useProfilePhoto()

  return (
    <div className={`flex min-h-screen ${darkMode ? 'bg-gradient-to-b from-[#050617] to-[#050617]' : 'bg-gradient-to-b from-violet-300 to-white'}`}>
      <style>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #e0e0e0; border-radius: 3px; }
        ::-webkit-scrollbar-thumb { background: #aaa; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #888; }
        * { scrollbar-width: thin; scrollbar-color: #aaa #e0e0e0; }
      `}</style>
      <aside className={`hidden lg:flex w-[360px] ${darkMode ? 'bg-[#050617] border-[rgba(255,255,255,0.08)]' : 'bg-[#F9F9F9] border-[rgba(15,60,95,0.12)]'} border-r fixed top-0 left-0 h-screen flex-col gap-5 pt-8 pb-6 px-5 shadow-[0_24px_60px_rgba(15,60,95,0.12)] overflow-hidden`}>
        <SidebarContent darkMode={darkMode} />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-[150] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className={`absolute left-0 top-0 h-full w-[300px] ${darkMode ? 'bg-[#050617] border-[rgba(255,255,255,0.08)]' : 'bg-[#F9F9F9] border-[rgba(15,60,95,0.12)]'} border-r flex flex-col gap-5 pt-8 pb-6 px-5 shadow-[0_24px_60px_rgba(15,60,95,0.25)] overflow-y-auto animate-[slideIn_0.2s_ease]`}>
            <SidebarContent darkMode={darkMode} onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      <main className="flex-1 lg:ml-[360px] flex flex-col min-w-0">
        <div className={`flex items-center justify-between gap-3 pl-4 lg:pl-7 pr-2 lg:pr-0 py-4 lg:py-5 ${darkMode ? 'bg-[rgba(45,27,78,0.65)]' : 'bg-white/65'}`}>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg border-none bg-transparent text-[#5a6b76] cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3 text-[18px] text-[#5a6b76] pr-2">
            <button onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false) }} className="relative">
              <img src="/icon-notification.png" alt="Notifications" className="w-7 h-7 object-contain" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full" />
            </button>
            <button onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }} className="w-9 h-9 rounded-full bg-[#2ea3e6] text-white flex items-center justify-center font-bold text-sm overflow-hidden">
              {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : 'EA'}
            </button>
          </div>
        </div>

        {notifOpen && <NotificationDropdown onClose={() => setNotifOpen(false)} darkMode={darkMode} />}
        {profileOpen && <ProfileDropdown onClose={() => setProfileOpen(false)} />}

        <div className={`flex-1 px-4 sm:px-6 lg:px-12 pt-5 pb-12 ${darkMode ? 'bg-[#050617]/40' : ''}`}>
          <div className="w-full max-w-full overflow-x-hidden">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

function SidebarContent({ darkMode, onNavigate }: { darkMode: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <>
        <div className="flex items-center gap-3 pl-4">
          <div className="w-[68px] h-[68px] flex-shrink-0">
            <img src="/meditrack-logo.png" alt="MediTrack" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className={`font-bebas text-[36px] lg:text-[50px] leading-none m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#0F588B]'}`}>MEDITRACK</h1>
            <p className={`font-asap text-[17px] tracking-[2px] leading-none -mt-1.5 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#0F588B]'}`}>Stay On Track With Us</p>
          </div>
        </div>

        <nav className="flex-1 mt-4">
          <p className="font-poppins text-[11px] font-bold text-gray-400 uppercase tracking-[1px] mb-3 pl-4">Menu</p>
          <ul className="list-none p-0 m-0 flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <li key={item.href} className={`rounded-[12px] transition-colors duration-300 ${isActive ? (darkMode ? 'bg-[#2d1b4e]' : 'bg-[#ddd6fe]') : (darkMode ? 'hover:bg-[#050617]/50' : 'hover:bg-[#E8E8E8]/50')}`}>
                  <Link
                    href={item.href}
                    onClick={() => onNavigate?.()}
                    className={`flex items-center gap-3.5 px-5 py-4 no-underline font-poppins text-[16px] text-left truncate ${isActive ? (darkMode ? 'text-white font-bold' : 'text-[#4E69D3] font-bold') : darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43] font-normal'}`}
                  >
                    <span className="inline-flex items-center justify-center w-7 h-7 flex-shrink-0">
                      <img src={item.icon} alt="" className="w-6 h-6 object-contain" />
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

function NotificationDropdown({ onClose, darkMode }: { onClose: () => void; darkMode: boolean }) {
  const [activeCategory, setActiveCategory] = useState('All')

  const fmtNotifDate = (offset: number) =>
    addDays(new Date(), offset).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const categoryColors: Record<string, string> = {
    All: '#4E69D3', Appointment: '#4CAF50', 'Record Management': '#FF9800', Events: '#9C27B0',
  }

  const notifications = [
    { id: 1, category: 'Appointment', title: 'New Appointment Booked', description: `Juan Dela Cruz booked an appointment for ${fmtNotifDate(0)} at 10:00 AM.`, time: '2 min ago', unread: true },
    { id: 2, category: 'Appointment', title: 'Appointment Rescheduled', description: `Maria Santos rescheduled her appointment to ${fmtNotifDate(0)}.`, time: '15 min ago', unread: true },
    { id: 3, category: 'Record Management', title: 'Patient Record Updated', description: 'Pedro Gonzales\' medical record has been updated.', time: '1 hr ago', unread: true },
    { id: 4, category: 'Events', title: 'New Event Created', description: `Health & Wellness Seminar has been scheduled for ${fmtNotifDate(2)}.`, time: '2 hr ago', unread: false },
    { id: 5, category: 'Record Management', title: 'Lab Results Uploaded', description: 'New lab results for Ana Lopez are now available.', time: '3 hr ago', unread: false },
    { id: 6, category: 'Events', title: 'Event Reminder', description: 'Team Meeting starts in 30 minutes.', time: '5 hr ago', unread: false },
    { id: 7, category: 'Appointment', title: 'Appointment Completed', description: 'Check-up for Jose Rizal has been marked as completed.', time: '1 day ago', unread: false },
  ]

  const filtered = activeCategory === 'All' ? notifications : notifications.filter(n => n.category === activeCategory)
  const categories = ['All', 'Appointment', 'Record Management', 'Events']

  return (
    <>
      <div className="fixed inset-0 z-[199]" onClick={onClose} />
      <div className={`absolute top-[70px] right-0 w-[min(450px,calc(100vw-16px))] max-h-[520px] max-w-[calc(100vw-16px)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] z-[200] flex flex-col overflow-hidden animate-[slideIn_0.2s_ease] ${darkMode ? 'bg-[#050617]' : 'bg-white'}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'}`}>
          <h3 className={`font-poppins text-lg font-bold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Notifications</h3>
          <div className="flex items-center gap-2">
            <button className="text-xs font-semibold text-[#4E69D3] bg-transparent border-none px-2 py-1 rounded-md font-poppins hover:bg-blue-50" onClick={() => {}}>Mark all as read</button>
            <button className={`w-7 h-7 border-none rounded-full cursor-pointer text-sm flex items-center justify-center ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] hover:bg-[#141a45]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} onClick={onClose}>&times;</button>
          </div>
        </div>
        <div className={`flex gap-1.5 px-4 py-3 border-b overflow-x-auto flex-shrink-0 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'}`}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all font-poppins ${
                activeCategory === cat
                  ? 'text-white border-transparent'
                  : darkMode
                    ? 'bg-transparent text-[#F9FAFB] border-[rgba(255,255,255,0.20)] hover:border-[var(--cat-color)] hover:text-[var(--cat-color)]'
                    : 'bg-transparent text-gray-500 border-gray-200 hover:border-[var(--cat-color)] hover:text-[var(--cat-color)]'
              }`}
              style={{ '--cat-color': categoryColors[cat], background: activeCategory === cat ? categoryColors[cat] : undefined } as React.CSSProperties & { '--cat-color': string }}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {filtered.length > 0 ? filtered.map(n => (
            <div key={n.id} className={`px-6 py-4.5 border-l-4 cursor-pointer transition-colors ${n.unread ? (darkMode ? 'bg-[#0f1438] hover:bg-[#141a45]' : 'bg-blue-50 hover:bg-blue-100') : (darkMode ? 'hover:bg-[#0f1438]' : 'hover:bg-gray-50')}`} style={{ borderLeftColor: categoryColors[n.category] }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded-full uppercase tracking-[0.5px]" style={{ background: categoryColors[n.category] }}>{n.category}</span>
                {n.unread && <span className="w-2 h-2 rounded-full bg-[#4E69D3] flex-shrink-0" />}
              </div>
              <p className={`text-sm font-bold my-1.5 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{n.title}</p>
              <p className={`text-xs my-0 leading-relaxed ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'}`}>{n.description}</p>
              <span className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>{n.time}</span>
            </div>
          )) : (
            <div className={`text-center py-10 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>No notifications</div>
          )}
        </div>
      </div>
    </>
  )
}

function ProfileDropdown({ onClose }: { onClose: () => void }) {
  const { darkMode, setDarkMode } = useDarkMode()
  const { photo } = useProfilePhoto()
  const router = useRouter()
  return (
    <>
      <div className="fixed inset-0 z-[199]" onClick={onClose} />
      <div className={`absolute top-[70px] right-0 w-[260px] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] z-[200] overflow-hidden animate-[slideIn_0.2s_ease] ${darkMode ? 'bg-[#050617]' : 'bg-white'}`}>
        <div className={`flex items-center gap-3 px-5 py-4 border-b ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'}`}>
            {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-5.5 h-5.5 ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'}`}>
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>
          <div className="min-w-0 leading-tight">
            <span className="text-[11px] font-bold text-[#4E69D3] uppercase tracking-[0.5px] block">MS-0001</span>
            <span className={`text-sm font-bold block ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Elaine Arceo</span>
            <span className={`text-xs block truncate ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'}`}>elaine@meditrack.com</span>
          </div>
        </div>
        <div className="py-2">
          <button className={`flex items-center gap-3 w-full px-5 py-2.5 border-none bg-transparent text-sm font-semibold cursor-pointer font-poppins text-left ${darkMode ? 'text-[#F9FAFB] hover:bg-[#0f1438]' : 'text-[#2A2E43] hover:bg-gray-50'}`} onClick={() => { router.push('/staff/profile'); onClose() }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-4.5 h-4.5 flex-shrink-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'}`}>
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            <span>Profile</span>
          </button>
          <button className={`flex items-center gap-3 w-full px-5 py-2.5 border-none bg-transparent text-sm font-semibold cursor-pointer font-poppins text-left ${darkMode ? 'text-[#F9FAFB] hover:bg-[#0f1438]' : 'text-[#2A2E43] hover:bg-gray-50'}`} onClick={() => { router.push('/staff/accountsettings'); onClose() }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-4.5 h-4.5 flex-shrink-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'}`}>
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <span>Account Settings</span>
          </button>
          <div className={`flex items-center gap-3 w-full px-5 py-2.5 text-sm font-semibold font-poppins ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-4.5 h-4.5 flex-shrink-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'}`}>
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
            <span>Dark Mode</span>
            <label className="relative inline-block w-[38px] h-5 ml-auto flex-shrink-0 cursor-pointer" onClick={e => e.stopPropagation()}>
              <input type="checkbox" className="opacity-0 w-0 h-0 peer" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
              <span className="absolute inset-0 bg-gray-300 rounded-full transition-colors before:content-[''] before:absolute before:h-4 before:w-4 before:left-[2px] before:bottom-[2px] before:bg-white before:rounded-full before:transition-transform peer-checked:bg-[#4E69D3] peer-checked:before:translate-x-[18px]" />
            </label>
          </div>
          <div className={`h-px my-1.5 ${darkMode ? 'bg-[rgba(255,255,255,0.10)]' : 'bg-gray-200'}`} />
          <button className={`flex items-center gap-3 w-full px-5 py-2.5 border-none bg-transparent text-sm font-semibold cursor-pointer font-poppins text-left ${darkMode ? 'text-red-400 hover:bg-[#0f1438]' : 'text-red-500 hover:bg-gray-50'}`} onClick={() => { signOut({ callbackUrl: '/login' }) }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4.5 h-4.5 text-red-500 flex-shrink-0">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </>
  )
}
