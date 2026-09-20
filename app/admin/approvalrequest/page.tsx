'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useDarkMode } from '@/app/admin/DarkModeContext'
import Image from 'next/image'

type AccountStatus = 'Pending' | 'Approved' | 'Rejected'

type StaffPosition = 'Nurse' | 'Midwife' | 'Barangay Health Worker (BHW)'

type BaseAccount = {
  databaseId?: string
  firstName: string
  middleName?: string | null
  lastName: string
  suffix?: string | null
  email: string
  dateApplied: string
  status: AccountStatus
}

type StaffAccount = BaseAccount & {
  kind: 'staff'
  id: string
  position: StaffPosition
}

type PatientAccount = BaseAccount & {
  kind: 'patient'
  id: string
  validId?: string | null
  validIdType?: string | null
}

const PER_PAGE = 8

const STATUS_COLORS: Record<AccountStatus, { badge: string; dot: string }> = {
  Pending: {
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500 animate-pulse',
  },
  Approved: { badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  Rejected: { badge: 'bg-red-100 text-red-600', dot: 'bg-red-500' },
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function addYear(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  d.setFullYear(d.getFullYear() + 1)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

//middle name collapses to an initial when present.
const fullName = (a: BaseAccount) => {
  const middle = a.middleName?.trim()
  const initial = middle ? `${middle[0].toUpperCase()}.` : ''
  const suffix = a.suffix?.trim() || ''
  return `${a.lastName}, ${a.firstName}${initial ? ` ${initial}` : ''}${
    suffix ? ` ${suffix}` : ''
  }`
}

export default function UserManagementPage() {
  const { darkMode } = useDarkMode()
  const [staff, setStaff] = useState<StaffAccount[]>([])
  const [patients, setPatients] = useState<PatientAccount[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'staff' | 'patient'>('all')
  const [tabOpen, setTabOpen] = useState(false)
  const [staffFilter, setStaffFilter] = useState<'All' | StaffPosition>('All')
  const [viewing, setViewing] = useState<StaffAccount | PatientAccount | null>(
    null,
  )
  const [rejecting, setRejecting] = useState(false)
  const [showRejected, setShowRejected] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/admin/approval')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load approval requests')
        return response.json()
      })
      .then((data) => {
        if (!active || !Array.isArray(data.accounts)) return
        const dbPatients = data.accounts
          .filter(
            (account: StaffAccount | PatientAccount) =>
              account.kind === 'patient',
          )
          .map((account: PatientAccount) => ({
            ...account,
            databaseId: account.id,
            id: account.id,
          }))
        setPatients(dbPatients)
      })
      .catch(() =>
        toast.error('Unable to load approval requests from the database'),
      )
    return () => {
      active = false
    }
  }, [])

  const pendingCount = patients.filter((p) => p.status === 'Pending').length
  const approvedCount = patients.filter((p) => p.status === 'Approved').length
  const visibleStaff = useMemo(() => {
    if (staffFilter === 'All') return staff
    return staff.filter((item) => item.position === staffFilter)
  }, [staff, staffFilter])
  const allUsers = useMemo(() => {
    return [...staff, ...patients].sort(
      (a, b) =>
        b.dateApplied.localeCompare(a.dateApplied) || b.id.localeCompare(a.id),
    )
  }, [staff, patients])
  const pendingUsers = useMemo(() => {
    return [...patients.filter((p) => p.status === 'Pending')].sort(
      (a, b) =>
        b.dateApplied.localeCompare(a.dateApplied) || b.id.localeCompare(a.id),
    )
  }, [patients])

  const rejectedUsers = useMemo(() => {
    return [...patients.filter((p) => p.status === 'Rejected')].sort(
      (a, b) =>
        b.dateApplied.localeCompare(a.dateApplied) || b.id.localeCompare(a.id),
    )
  }, [patients])

  const [pendingLoading, setPendingLoading] = useState(false)

  const handleApproveAll = async () => {
    const pendingList = patients.filter((p) => p.status === 'Pending')
    if (pendingList.length === 0) {
      toast.info('No pending user approval requests found.')
      return
    }

    setPendingLoading(true)
    try {
      const response = await fetch('/api/admin/approval', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approveAll' }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        toast.error(data.message || 'Unable to complete bulk approval')
        return
      }

      setPatients((prev) =>
        prev.map((a) =>
          a.status === 'Pending' ? { ...a, status: 'Approved' } : a,
        ),
      )
      toast.success(
        `Successfully approved all ${pendingList.length} pending user account(s)!`,
      )
    } catch {
      toast.error('Failed to execute bulk approval.')
    } finally {
      setPendingLoading(false)
    }
  }

  const handleAction = async (
    account: StaffAccount | PatientAccount,
    action: 'approve' | 'reject',
  ) => {
    if (account.kind === 'staff') {
      toast.error(
        'Staff accounts are managed separately and cannot be approved here',
      )
      return
    }
    const response = await fetch('/api/admin/approval', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: account.databaseId || account.id, action }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      toast.error(data.message || 'Unable to update approval request')
      return
    }
    const status: AccountStatus = action === 'approve' ? 'Approved' : 'Rejected'
    setPatients((prev) =>
      prev.map((a) => (a.id === account.id ? { ...a, status } : a)),
    )
    toast.success(
      action === 'approve'
        ? `${fullName(account)} has been approved`
        : `${fullName(account)} has been rejected`,
    )
    setRejecting(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h1
            className={`text-2xl sm:text-3xl ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'} m-0 text-left`}
          >
            Approval Request
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          darkMode={darkMode}
          value={patients.length}
          label="Patients / Users"
          color="#0EA5E9"
          icon={
            <>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </>
          }
        />
        <StatCard
          darkMode={darkMode}
          value={approvedCount}
          label="Approved Accounts"
          color="#16A34A"
          icon={
            <>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </>
          }
        />
        <StatCard
          darkMode={darkMode}
          value={pendingCount}
          label="Pending Approvals"
          color="#F59E0B"
          icon={
            <>
              <path d="M12 8v4l2.5 2.5" />
              <circle cx="12" cy="12" r="9" />
            </>
          }
        />
      </div>

      {/* Dedicated Section Only for Pending User Approvals */}
      <div
        className={`mb-6 p-5 rounded-xl border ${
          darkMode
            ? 'bg-[#2d1b4e] border-amber-500/30'
            : 'bg-amber-50/70 border-amber-200'
        } shadow-sm`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-amber-200/70 dark:border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 8v4l2.5 2.5" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <div>
              <h2
                className={`text-base font-semibold m-0 flex items-center gap-2.5 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
              >
                Pending User Approvals
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500 text-white">
                  {pendingUsers.length}
                </span>
              </h2>
              <p
                className={`text-xs m-0 mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
              >
                Users awaiting health center verification to access appointment
                booking
              </p>
            </div>
          </div>
          {pendingUsers.length > 0 && (
            <button
              onClick={handleApproveAll}
              disabled={pendingLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-bold font-poppins rounded-xl border-none shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {pendingLoading
                ? 'Approving All...'
                : `Approve All (${pendingUsers.length})`}
            </button>
          )}
        </div>

        {pendingUsers.length === 0 ? (
          <div
            className={`p-6 text-center rounded-xl text-sm font-semibold ${darkMode ? 'bg-[#0f1438] text-gray-400' : 'bg-white text-gray-500'}`}
          >
            ✓ All user registration requests have been processed. No pending
            approvals.
          </div>
        ) : (
          <ApprovalTable
            key="pending-section"
            darkMode={darkMode}
            rows={pendingUsers}
            onView={setViewing}
            onAction={handleAction}
            title="Pending Approvals"
            idPrefix="PTN"
          />
        )}
      </div>

      <div
        className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.10)]'} border rounded-xl p-4 sm:p-5 shadow-sm`}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-4 border-b border-gray-100 dark:border-white/10">
          <div className="relative w-fit">
            <button
              onClick={() => setTabOpen((o) => !o)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium font-poppins cursor-pointer border transition-colors ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:border-[#4E69D3]' : 'bg-white text-[#4E69D3] border-[#4E69D3] hover:bg-[#E8EAF6]'}`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {activeTab === 'all'
                ? `All Users (${allUsers.length})`
                : activeTab === 'staff'
                  ? `Medical Staff (${staff.length})`
                  : `Patients / Users (${patients.length})`}
              <svg
                className={`transition-transform ${tabOpen ? 'rotate-180' : ''}`}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {tabOpen && (
              <>
                <div
                  className="fixed inset-0 z-[99]"
                  onClick={() => setTabOpen(false)}
                />
                <div
                  className={`absolute left-0 top-[calc(100%+6px)] w-[240px] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] z-[100] overflow-hidden ${darkMode ? 'bg-[#0f1438] border-[rgba(255,255,255,0.10)]' : 'bg-white border-gray-200'} border`}
                >
                  {[
                    {
                      id: 'all' as const,
                      label: 'All Users',
                      count: allUsers.length,
                    },
                    {
                      id: 'patient' as const,
                      label: 'Patients / Users',
                      count: patients.length,
                    },
                  ].map((option) => {
                    const isActive = activeTab === option.id
                    return (
                      <button
                        key={option.id}
                        onClick={() => {
                          setActiveTab(option.id)
                          setViewing(null)
                          setStaffFilter('All')
                          setShowRejected(false)
                          setTabOpen(false)
                        }}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-[14px] font-semibold font-poppins cursor-pointer border-none text-left transition-colors ${isActive ? (darkMode ? 'bg-[#2d1b4e] text-white' : 'bg-[#E8EAF6] text-[#4E69D3]') : darkMode ? 'text-[#F9FAFB] hover:bg-[#2d1b4e]' : 'text-gray-600 hover:bg-gray-50'}`}
                      >
                        <span className="flex items-center gap-2.5">
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            {option.id === 'patient' ? (
                              <>
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                              </>
                            ) : (
                              <>
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                              </>
                            )}
                          </svg>
                          {option.label}
                        </span>
                        <span
                          className={`text-[12px] font-bold ${isActive ? 'text-[#4E69D3]' : darkMode ? 'text-gray-400' : 'text-gray-400'}`}
                        >
                          {option.count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
          <div
            className={`flex flex-wrap gap-2 p-1 rounded-xl ${activeTab === 'staff' && !showRejected ? (darkMode ? 'bg-[#0f1438]' : 'bg-[#f3f4f6]') : ''}`}
          >
            {activeTab === 'staff' && !showRejected && (
              <>
                {(
                  [
                    'All',
                    'Nurse',
                    'Midwife',
                    'Barangay Health Worker (BHW)',
                  ] as Array<'All' | StaffPosition>
                ).map((option) => {
                  const isActive = staffFilter === option
                  return (
                    <button
                      key={option}
                      onClick={() => setStaffFilter(option)}
                      className={`px-3.5 py-2 rounded-lg text-[13px] font-semibold font-poppins border-none cursor-pointer transition-colors ${isActive ? 'bg-[#4E69D3] text-white shadow' : `${darkMode ? 'text-[#F9FAFB] hover:text-white' : 'text-gray-600 hover:text-[#4E69D3]'} bg-transparent`}`}
                    >
                      {option === 'All'
                        ? 'All Staff'
                        : option === 'Barangay Health Worker (BHW)'
                          ? 'BHW'
                          : option}
                    </button>
                  )
                })}
              </>
            )}
            <button
              onClick={() => {
                setShowRejected((v) => !v)
                setTabOpen(false)
                setViewing(null)
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium font-poppins cursor-pointer border transition-all ${showRejected ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 shadow' : `${darkMode ? 'bg-[#2d1b4e] text-red-400 border-[rgba(255,255,255,0.10)] hover:border-red-500' : 'bg-white text-red-500 border-red-300 hover:bg-red-50'}`}`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              Rejected Users
              <span
                className={`min-w-[22px] h-[22px] px-1.5 rounded-full text-[12px] font-bold flex items-center justify-center ${showRejected ? 'bg-white/25 text-white' : `${darkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-500'}`}`}
              >
                {rejectedUsers.length}
              </span>
            </button>
          </div>
        </div>

        {showRejected ? (
          <ApprovalTable
            key="rejected"
            darkMode={darkMode}
            rows={rejectedUsers}
            onView={setViewing}
            onAction={handleAction}
            title="Rejected Users"
            idPrefix=""
            allAccounts
          />
        ) : activeTab === 'all' ? (
          <ApprovalTable
            key="all"
            darkMode={darkMode}
            rows={allUsers}
            onView={setViewing}
            onAction={handleAction}
            title="All Users"
            idPrefix=""
            allAccounts
          />
        ) : activeTab === 'staff' ? (
          <ApprovalTable
            key="staff"
            darkMode={darkMode}
            rows={visibleStaff}
            onView={setViewing}
            onAction={handleAction}
            title={
              staffFilter === 'All'
                ? 'Medical Staff'
                : staffFilter === 'Barangay Health Worker (BHW)'
                  ? 'BHW'
                  : staffFilter
            }
            idPrefix="MS"
          />
        ) : (
          <ApprovalTable
            key="patient"
            darkMode={darkMode}
            rows={patients}
            onView={setViewing}
            onAction={handleAction}
            title="Patients / Users"
            idPrefix="PTN"
          />
        )}
      </div>

      {viewing && (
        <IdModal
          account={viewing}
          darkMode={darkMode}
          rejecting={rejecting}
          setRejecting={setRejecting}
          onAction={handleAction}
          onClose={() => {
            setViewing(null)
            setRejecting(false)
          }}
        />
      )}
    </div>
  )
}

function StatCard({
  darkMode,
  value,
  label,
  color,
  icon,
}: {
  darkMode: boolean
  value: number
  label: string
  color: string
  icon: React.ReactNode
}) {
  return (
    <div
      className={`flex items-center gap-4 max-sm:gap-3 ${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'bg-white border-[rgba(15,60,95,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]'} p-5 rounded-xl border`}
    >
      <div
        className={`w-11 h-11 rounded-lg ${darkMode ? 'bg-[#141a45]' : 'bg-[#E8EAF6]'} flex items-center justify-center flex-shrink-0`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          {icon}
        </svg>
      </div>
      <div className="flex flex-col">
        <span
          className={`text-2xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
        >
          {value}
        </span>
        <span
          className={`text-sm leading-tight font-medium ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
        >
          {label}
        </span>
      </div>
    </div>
  )
}

type AnyAccount = StaffAccount | PatientAccount

type ApprovalTableProps<T extends AnyAccount> = {
  darkMode: boolean
  rows: T[]
  onView: (account: T) => void
  onAction: (account: T, action: 'approve' | 'reject') => void
  title: string
  idPrefix: string
  allAccounts?: boolean
}

function ApprovalTable<T extends AnyAccount>({
  darkMode,
  rows,
  onView,
  onAction,
  title,
  idPrefix,
  allAccounts,
}: ApprovalTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | AccountStatus>('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortAsc, setSortAsc] = useState(true)

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const qDigits = q.replace(/\D/g, '')
    let list = rows.filter(
      (r) => statusFilter === 'All' || r.status === statusFilter,
    )
    if (q) {
      list = list.filter((r) => {
        const name = fullName(r).toLowerCase()
        const id = r.id.toLowerCase()
        const idDigits = id.replace(/\D/g, '')
        return (
          name.includes(q) ||
          id === q ||
          (qDigits && idDigits === qDigits) ||
          id.includes(q) ||
          r.email.toLowerCase().includes(q)
        )
      })
    }
    return [...list].sort((a, b) => {
      const cmp =
        a.dateApplied.localeCompare(b.dateApplied) ||
        (allAccounts
          ? a.id.localeCompare(b.id)
          : Number(a.id.slice(idPrefix.length + 1)) -
            Number(b.id.slice(idPrefix.length + 1)))
      return sortAsc ? cmp : -cmp
    })
  }, [rows, searchQuery, statusFilter, sortAsc, idPrefix, allAccounts])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const pageRows = filtered.slice(
    (safePage - 1) * PER_PAGE,
    safePage * PER_PAGE,
  )
  const firstShown = filtered.length === 0 ? 0 : (safePage - 1) * PER_PAGE + 1
  const lastShown = (safePage - 1) * PER_PAGE + pageRows.length

  const inputClass = `pl-10 pr-3.5 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)] text-[#F9FAFB] bg-[#2d1b4e]' : 'border-gray-200 text-gray-800 bg-gray-100'} rounded-lg text-sm font-poppins outline-none focus:border-[#4E69D3] ${darkMode ? 'placeholder-gray-500' : 'placeholder-gray-400'} box-border`
  const selectClass = `py-3 pl-3 pr-9 ${darkMode ? 'border-[rgba(255,255,255,0.10)] text-[#F9FAFB] bg-[#2d1b4e]' : 'border-gray-200 text-gray-800 bg-gray-100'} rounded-lg text-sm font-poppins outline-none focus:border-[#4E69D3] appearance-none cursor-pointer min-w-[140px] box-border`
  const pageBtnClass = `min-w-[38px] h-[38px] px-2.5 rounded-lg text-[14px] font-semibold font-poppins cursor-pointer border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:border-[#4E69D3]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#4E69D3] hover:text-[#4E69D3]'}`
  const pageBtnActiveClass =
    'bg-[#4E69D3] text-white border-[#4E69D3] hover:bg-[#4A6BC4] hover:text-white'
  const isStaff = idPrefix === 'MS'
  const showTypeColumn = isStaff || allAccounts

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mt-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex items-center flex-1 min-w-[220px]">
            <svg
              className={`absolute left-3 w-4 h-4 ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-400'} pointer-events-none`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder={`Search by name, email or ID...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className={`w-full sm:w-[320px] ${inputClass}`}
            />
          </div>
          <div className="relative flex items-center">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter)
                setCurrentPage(1)
              }}
              className={`w-full sm:w-auto ${selectClass}`}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <svg
              className={`absolute right-2.5 w-3.5 h-3.5 ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-400'} pointer-events-none`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <button
            className={`inline-flex items-center gap-2 px-3.5 py-3 rounded-lg text-[14px] font-semibold font-poppins cursor-pointer border transition-colors ${sortAsc ? 'bg-[#4E69D3] text-white border-[#4E69D3] hover:bg-[#4A6BC4]' : `${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)]' : 'bg-white text-gray-600 border-gray-200'} hover:border-[#4E69D3]`}`}
            onClick={() => setSortAsc(!sortAsc)}
            title={sortAsc ? 'Ascending' : 'Descending'}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {sortAsc ? (
                <>
                  <polyline points="6 9 12 15 18 9" />
                </>
              ) : (
                <>
                  <polyline points="18 15 12 9 6 15" />
                </>
              )}
            </svg>
            {sortAsc ? 'Ascending' : 'Descending'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl">
        <table
          className="w-full border-collapse text-sm min-w-[980px]"
          style={{ tableLayout: 'fixed' }}
        >
          <thead>
            <tr className={`${darkMode ? 'bg-[#111827]' : 'bg-gray-50'}`}>
              <th
                className={`px-4 py-3 text-left font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-xs uppercase tracking-wide font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[28%]`}
              >
                Name
              </th>
              {showTypeColumn && (
                <th
                  className={`px-4 py-3 text-left font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-xs uppercase tracking-wide font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[17%]`}
                >
                  {allAccounts ? 'Account Type' : 'Position'}
                </th>
              )}
              <th
                className={`px-4 py-3 text-left font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-xs uppercase tracking-wide font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[22%]`}
              >
                Email
              </th>
              <th
                className={`px-4 py-3 text-left font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-xs uppercase tracking-wide font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[13%]`}
              >
                Date Applied
              </th>
              <th
                className={`px-4 py-3 text-left font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-xs uppercase tracking-wide font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[12%]`}
              >
                Status
              </th>
              <th
                className={`px-4 py-3 text-left font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-xs uppercase tracking-wide font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[20%]`}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={showTypeColumn ? 6 : 5}
                  className={`px-5 py-14 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  <svg
                    className="mx-auto mb-3"
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={darkMode ? '#6B7280' : '#9CA3AF'}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  No {title.toLowerCase()} found
                  {statusFilter !== 'All'
                    ? ` with status "${statusFilter}"`
                    : ''}{' '}
                  for this search
                </td>
              </tr>
            ) : (
              pageRows.map((r) => {
                const isPending = r.status === 'Pending'
                return (
                  <tr
                    key={r.id}
                    className={`${darkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'} transition-colors`}
                  >
                    <td
                      className={`px-4 py-3 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div
                          className={`w-8 h-8 rounded-full ${darkMode ? 'bg-[#0f1438] text-blue-300' : 'bg-[#E8EAF6] text-[#4E69D3]'} flex items-center justify-center font-bold text-sm flex-shrink-0`}
                        >
                          {r.firstName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <span
                            className="block text-sm font-poppins font-semibold flex-1 min-w-0 whitespace-nowrap truncate"
                            title={fullName(r)}
                          >
                            {fullName(r)}
                          </span>
                          <span
                            className={`block text-[12px] font-semibold truncate ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}`}
                          >
                            {r.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    {showTypeColumn && (
                      <td
                        className={`px-4 py-3 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b text-sm ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
                      >
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-md text-[13px] font-semibold ${darkMode ? 'bg-[#0f1438] text-[#C4B5FD]' : 'bg-[#E8EAF6] text-[#4E69D3]'}`}
                        >
                          {allAccounts
                            ? r.kind === 'staff'
                              ? 'Medical Staff'
                              : 'Patient / User'
                            : (r as StaffAccount).position}
                        </span>
                      </td>
                    )}
                    <td
                      className={`px-4 py-3 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} whitespace-nowrap overflow-hidden text-ellipsis`}
                    >
                      {r.email}
                    </td>
                    <td
                      className={`px-4 py-3 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b text-sm ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
                    >
                      {fmtDate(r.dateApplied)}
                    </td>
                    <td
                      className={`px-4 py-3 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b`}
                    >
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-bold ${darkMode ? STATUS_COLORS[r.status].badge.replace('text-amber-700', 'text-amber-300').replace('text-green-700', 'text-green-400').replace('text-red-600', 'text-red-400') + ' bg-opacity-20' : STATUS_COLORS[r.status].badge}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[r.status].dot}`}
                        />
                        {r.status}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => onView(r)}
                          className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold font-poppins cursor-pointer ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)]' : 'bg-white text-[#4E69D3] border-[#4E69D3]'} border ${darkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'} transition-all`}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          View ID
                        </button>
                        {isPending && (
                          <>
                            <button
                              onClick={() => onAction(r, 'approve')}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#16A34A] text-white border-none rounded-lg text-[14px] font-semibold font-poppins cursor-pointer hover:bg-[#15803D] transition-colors"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Approve
                            </button>
                            <button
                              onClick={() => onAction(r, 'reject')}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold font-poppins cursor-pointer border transition-all ${darkMode ? 'bg-[#2d1b4e] text-red-400 border-[rgba(255,255,255,0.10)] hover:bg-[#0f1438]' : 'bg-white text-red-500 border-red-300 hover:bg-red-50'}`}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 pb-1 border-t border-gray-100 dark:border-white/10 mt-4 flex-wrap">
        <span
          className={`text-[13px] font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
        >
          Showing{' '}
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {firstShown}
          </span>
          &ndash;
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {lastShown}
          </span>{' '}
          of{' '}
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {filtered.length}
          </span>{' '}
          {title.toLowerCase()}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                safePage === 1
                  ? 'opacity-40 cursor-not-allowed text-gray-400 border-gray-200 dark:border-white/10 dark:text-gray-600'
                  : darkMode
                    ? 'bg-[#2d1b4e] text-white border-white/10 hover:border-[#4E69D3]'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#4E69D3] hover:text-[#4E69D3]'
              }`}
              disabled={safePage === 1}
              onClick={() => setCurrentPage(safePage - 1)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 || p === totalPages || Math.abs(p - safePage) <= 1,
              )
              .map((p, idx, arr) => {
                const prevPage = arr[idx - 1]
                const showEllipsis = prevPage && p - prevPage > 1
                return (
                  <span key={p} className="flex items-center gap-1.5">
                    {showEllipsis && (
                      <span className="text-gray-400 px-1 text-xs">
                        &hellip;
                      </span>
                    )}
                    <button
                      className={`min-w-[32px] h-[32px] px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        safePage === p
                          ? 'bg-[#4E69D3] text-white shadow-sm border border-[#4E69D3]'
                          : darkMode
                            ? 'bg-[#2d1b4e] text-gray-300 border border-white/10 hover:border-[#4E69D3]'
                            : 'bg-white text-gray-700 border border-gray-200 hover:border-[#4E69D3] hover:text-[#4E69D3]'
                      }`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  </span>
                )
              })}

            <button
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                safePage === totalPages
                  ? 'opacity-40 cursor-not-allowed text-gray-400 border-gray-200 dark:border-white/10 dark:text-gray-600'
                  : darkMode
                    ? 'bg-[#2d1b4e] text-white border-white/10 hover:border-[#4E69D3]'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#4E69D3] hover:text-[#4E69D3]'
              }`}
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage(safePage + 1)}
            >
              Next
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function IdModal({
  account,
  darkMode,
  rejecting,
  setRejecting,
  onAction,
  onClose,
}: {
  account: AnyAccount
  darkMode: boolean
  rejecting: boolean
  setRejecting: (v: boolean) => void
  onAction: (account: AnyAccount, action: 'approve' | 'reject') => void
  onClose: () => void
}) {
  const isStaff = account.kind === 'staff'
  const isPending = account.status === 'Pending'

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[1000] p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white'} rounded-xl w-full max-w-[900px] shadow-xl flex flex-col max-h-[92vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex justify-between items-center px-5 sm:px-7 py-4 sm:py-5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} border-b flex-shrink-0`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl ${darkMode ? 'bg-[#0f1438]' : 'bg-[#E8EAF6]'} flex items-center justify-center`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4E69D3"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <div>
              <h2
                className={`font-poppins text-lg font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0`}
              >
                Valid ID &mdash; {fullName(account)}
              </h2>
              <p
                className={`text-[13px] m-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
              >
                {account.id} &middot; {fmtDate(account.dateApplied)}
              </p>
            </div>
          </div>
          <button
            className={`w-9 h-9 border-none ${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'} rounded-full text-xl ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'} cursor-pointer flex items-center justify-center hover:bg-red-500 hover:text-white transition-all flex-shrink-0`}
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="px-5 sm:px-7 py-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5 items-start">
            <IdCard account={account} />

            <div
              className={`${darkMode ? 'bg-[#0f1438]' : 'bg-gray-50'} rounded-lg p-4`}
            >
              <h3
                className={`text-[15px] font-bold font-poppins uppercase tracking-[0.5px] m-0 mb-4 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
              >
                Applicant Details
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-[15px]">
                <DetailItem
                  darkMode={darkMode}
                  label="Full Name"
                  value={fullName(account)}
                />
                <DetailItem
                  darkMode={darkMode}
                  label="Account ID"
                  value={account.id}
                />
                {isStaff && (
                  <DetailItem
                    darkMode={darkMode}
                    label="Position"
                    value={(account as StaffAccount).position}
                  />
                )}
                <DetailItem
                  darkMode={darkMode}
                  label="Email"
                  value={account.email}
                />
                <DetailItem
                  darkMode={darkMode}
                  label="Date Applied"
                  value={fmtDate(account.dateApplied)}
                />
                <DetailItem
                  darkMode={darkMode}
                  label="Valid ID"
                  value={
                    isStaff
                      ? 'Not applicable'
                      : (account as PatientAccount).validIdType ||
                        ((account as PatientAccount).validId
                          ? 'Uploaded'
                          : 'Not uploaded')
                  }
                />
                <DetailItem
                  darkMode={darkMode}
                  label="Account Type"
                  value={isStaff ? 'Medical Staff' : 'Patient / User'}
                />
                <div className="col-span-2">
                  <span
                    className={`block text-[12px] font-semibold uppercase tracking-[0.5px] mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}
                  >
                    Status
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-bold ${darkMode ? STATUS_COLORS[account.status].badge.replace('text-amber-700', 'text-amber-300').replace('text-green-700', 'text-green-400').replace('text-red-600', 'text-red-400') + ' bg-opacity-20' : STATUS_COLORS[account.status].badge}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[account.status].dot}`}
                    />
                    {account.status}
                  </span>
                </div>
                <div className="col-span-2">
                  <span
                    className={`block text-[12px] font-semibold uppercase tracking-[0.5px] mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}
                  >
                    Valid ID
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[14px] font-semibold ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}`}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {isStaff
                      ? 'Sample government ID verified on file'
                      : 'Sample valid ID submitted during signup'}
                  </span>
                </div>
              </div>

              <div
                className={`h-px my-5 ${darkMode ? 'bg-[rgba(255,255,255,0.10)]' : 'bg-gray-200'}`}
              />

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => onAction(account, 'approve')}
                  disabled={!isPending}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 bg-[#16A34A] text-white border-none rounded-lg text-sm font-bold font-poppins cursor-pointer hover:bg-[#15803D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Approve Account
                </button>
                {isPending ? (
                  rejecting ? (
                    <button
                      onClick={() => onAction(account, 'reject')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white border-none rounded-lg text-sm font-bold font-poppins cursor-pointer hover:bg-red-700 transition-colors"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Confirm Rejection?
                    </button>
                  ) : (
                    <button
                      onClick={() => setRejecting(true)}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold font-poppins cursor-pointer border transition-all ${darkMode ? 'bg-[#2d1b4e] text-red-400 border-[rgba(255,255,255,0.10)] hover:bg-[#0f1438]' : 'bg-white text-red-500 border-red-300 hover:bg-red-50'}`}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Reject Account
                    </button>
                  )
                ) : (
                  <button
                    onClick={onClose}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold font-poppins cursor-pointer border transition-all ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:bg-[#0f1438]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                    Close
                  </button>
                )}
                <p
                  className={`text-[13px] m-0 w-full ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  {isPending
                    ? 'Approve to grant login access. Reject if the ID appears invalid or tampered.'
                    : 'This request has already been reviewed.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailItem({
  darkMode,
  label,
  value,
}: {
  darkMode: boolean
  label: string
  value: string
}) {
  return (
    <div className="min-w-0">
      <span
        className={`block text-[12px] font-semibold uppercase tracking-[0.5px] mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}
      >
        {label}
      </span>
      <span
        className={`font-semibold break-words ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
      >
        {value}
      </span>
    </div>
  )
}

function IdCard({ account }: { account: AnyAccount }) {
  const isStaff = account.kind === 'staff'
  const validId = (account as PatientAccount).validId

  return (
    <div className="w-full max-w-[420px] mx-auto">
      <div
        className={`rounded-2xl overflow-hidden border shadow-[0_12px_32px_rgba(0,0,0,0.18)] ${isStaff ? 'border-[#7C3AED]/40' : 'border-[#4E69D3]/40'}`}
      >
        <div className="relative w-full">
          {!isStaff && validId ? (
            <Image
              src={validId}
              alt={`${account.firstName} ${account.lastName} valid ID`}
              width={420}
              height={265}
              className="w-full h-auto object-contain"
              priority
            />
          ) : (
            <div className="w-full aspect-[1.586/1] bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center p-6">
              <svg
                viewBox="0 0 24 24"
                className="w-16 h-16 text-gray-400 mb-3"
                fill="currentColor"
              >
                <circle cx="12" cy="8.5" r="4.5" />
                <path d="M4.5 20.5c0-4.14 3.36-7.5 7.5-7.5s7.5 3.36 7.5 7.5v1.5h-15v-1.5z" />
              </svg>
              <span className="text-sm font-semibold text-gray-500">
                {isStaff ? 'Staff ID Card' : 'No ID Uploaded'}
              </span>
              <span className="text-xs text-gray-400 mt-1">
                {account.firstName} {account.lastName}
              </span>
            </div>
          )}
        </div>
      </div>
      <p className="text-center text-[12px] mt-3 m-0 text-gray-400 italic">
        {!isStaff && validId
          ? `Applicant's uploaded valid ID${(account as PatientAccount).validIdType ? ` — ${(account as PatientAccount).validIdType as string}` : ''}`
          : 'Sample / default ID photo — no valid ID uploaded yet'}
      </p>
    </div>
  )
}
