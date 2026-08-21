'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ButtonSignOut } from '@/components/ButtonsAuth'
import {
  User,
  UserPen,
  CircleUserRound,
  ShieldEllipsis,
  LayoutDashboard,
  X,
  Moon,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useUnsavedChanges } from '@/store/useUnsavedChanges'
import { useDarkMode } from '@/components/globals/DarkModeContext'

export default function DrawerProfile() {
  const router = useRouter()
  const drawerRef = useRef<HTMLDivElement>(null)
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const { isDirty, setDirty } = useUnsavedChanges()
  const { darkMode, setDarkMode } = useDarkMode()

  const [pendingNav, setPendingNav] = useState<string | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  function handleNavClick(href: string) {
    if (isDirty) {
      setPendingNav(href)
    } else {
      setIsOpen(false)
      router.push(href)
    }
  }

  function confirmLeave() {
    setDirty(false)
    setIsOpen(false)
    if (pendingNav) {
      router.push(pendingNav)
    }
    setPendingNav(null)
  }

  function cancelLeave() {
    setPendingNav(null)
  }

  return (
    <div className="relative" ref={drawerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="button button--circle"
      >
        <User />
      </button>
      {isOpen && (
        <div className="animated absolute right-0 mt-2 w-48 bg-background border border-secondary rounded z-10 dark:border-gray-600">
          <div className="px-2 py-3 border-b border-secondary flex gap-2 dark:border-gray-600">
            <div className="min-w-8">
              {session?.user?.image ? (
                <Image
                  src={session?.user?.image}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                  width={32}
                  height={32}
                />
              ) : (
                <CircleUserRound size={24} className="inline mr-2 mb-1" />
              )}
            </div>
            <div>
              <p>{session?.user?.name}</p>
              <p className="text-gray-500 dark:text-gray-400">{session?.user?.email}</p>
            </div>
          </div>
          <div className="flex flex-col justify-center py-3 px-1">
            {(session?.user?.role === 'SUPERADMIN' ||
              session?.user?.role === 'ADMIN') && (
              <button
                onClick={() => handleNavClick('/dashboard')}
                className="hover:bg-primary p-2 rounded animated text-left"
              >
                <LayoutDashboard className="inline mr-2 mb-1" />
                Dashboard
              </button>
            )}

            <button
              onClick={() => handleNavClick('/dashboard/user/profile')}
              className="hover:bg-primary p-2 rounded animated text-left"
            >
              <UserPen className="inline mr-2 mb-1" />
              Profile
            </button>

            <button
              onClick={() => handleNavClick('/dashboard/user/security')}
              className="hover:bg-primary p-2 rounded animated text-left"
            >
              <ShieldEllipsis className="inline mr-2 mb-1" />
              Security
            </button>

            <div className="flex items-center justify-between px-2 py-1">
              <span className="flex items-center gap-2 text-sm">
                <Moon size={18} />
                Dark Mode
              </span>
              <label className="relative inline-block w-[38px] h-5 cursor-pointer">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0 peer"
                  checked={darkMode}
                  onChange={() => setDarkMode(!darkMode)}
                />
                <span className="absolute inset-0 bg-gray-300 rounded-full transition-colors peer-checked:bg-[#4E69D3] after:content-[''] after:absolute after:h-4 after:w-4 after:left-[2px] after:bottom-[2px] after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-[18px]" />
              </label>
            </div>

            <ButtonSignOut />
          </div>
        </div>
      )}

      {pendingNav && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={cancelLeave}
        >
          <div
            className="bg-background rounded w-full max-w-md p-6 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg">Unsaved Changes</h2>
              <button className="button button--circle" onClick={cancelLeave}>
                <X size={24} />
              </button>
            </div>
            <p className="mb-5">
              You have unsaved changes. Do you want to leave without saving?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="button button--secondary"
                onClick={cancelLeave}
              >
                Stay
              </button>
              <button className="button button--accent" onClick={confirmLeave}>
                Don&apos;t Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
