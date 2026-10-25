'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserRound } from 'lucide-react'
import MediTrackBrand from '@/components/globals/MediTrackBrand'
import SidebarFooter from '@/components/globals/SidebarFooter'
import { useDarkMode } from '@/components/globals/DarkModeContext'

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
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[288px] flex-col border-r border-line bg-card shadow-sm lg:flex">
      <div className="border-b border-line px-5 py-6">
        <div>
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
              className={`flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 ${
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