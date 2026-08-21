'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserRound } from 'lucide-react'
import MediTrackBrand from '@/components/globals/MediTrackBrand'
import SidebarFooter from '@/components/globals/SidebarFooter'
import { useDarkMode } from '@/components/globals/DarkModeContext'

// Permanent left navigation for desktop (1024px+). Mirrors the mobile bottom
// navigation items, routes, and icons. Hidden below `lg` — mobile/tablet keep
// the bottom nav untouched.
const items = [
  { key: 'home', label: 'Home', href: '/user', icon: '/home.png' },
  {
    key: 'appointment',
    label: 'Appointment',
    href: '/user/appointment',
    icon: '/appointment.png',
  },
  { key: 'records', label: 'Records', href: '/user/records', icon: '/record.png' },
  { key: 'you', label: 'You', href: '/user/profile', icon: UserRound },
]

export default function PatientSidebar() {
  const pathname = usePathname()
  const { darkMode } = useDarkMode()

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[360px] flex-col bg-card border-r border-line shadow-[10px_0_30px_rgb(15_88_139/0.1)] dark:shadow-[10px_0_30px_rgb(0_0_0/0.4)]">
      <div className="px-5 pt-8 pb-6 border-b border-line bg-gradient-to-b from-surface/60 to-transparent">
        <div className="scale-[1.2]">
          <MediTrackBrand compact />
        </div>
      </div>

      <nav aria-label="Primary" className="flex-1 px-3 pb-3 pt-3 space-y-1.5 overflow-y-auto">
        {items.map((item) => {
          const isActive =
            item.href === '/user'
              ? pathname === item.href
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 px-5 py-4 rounded-xl transition-colors ${
                isActive
                  ? 'bg-brand-tint text-brand font-bold shadow-sm'
                  : 'text-body hover:bg-brand-tint hover:text-brand'
              }`}
            >
              {typeof item.icon === 'string' ? (
                <img
                  src={item.icon}
                  alt=""
                  aria-hidden="true"
                  className={`w-6 h-6 transition-opacity ${
                    isActive ? 'opacity-100' : 'opacity-70'
                  }`}
                />
              ) : (
                <item.icon className="w-6 h-6" aria-hidden="true" />
              )}
              <span className="text-sm font-semibold">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <SidebarFooter darkMode={darkMode} className="pb-6" />
    </aside>
  )
}