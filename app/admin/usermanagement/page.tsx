'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useDarkMode } from '@/app/admin/DarkModeContext'
import { initialRecords, type PatientRecord } from '@/src/data/patientRecords'

type StaffPosition = 'Nurse' | 'Midwife' | 'Barangay Health Worker (BHW)'

type UserRole = 'Admin' | 'Medical Staff' | 'Patient'

type BaseUser = {
  databaseId?: string
  username: string
  email: string
  password: string
  role: UserRole
  dateJoined: string
}

type StaffUser = BaseUser & {
  kind: 'staff'
  id: string
  firstName: string
  lastName: string
  position: StaffPosition
}

type PatientProfile = {
  firstName?: string
  middleName?: string | null
  lastName?: string
  suffix?: string | null
  birthdate?: string | Date
  phoneNumber?: string
  houseNumber?: string
  barangay?: string
  city?: string
  province?: string
  zipCode?: string
  philHealthNo?: string | null
  membershipType?: string | null
  philHealthStatus?: string | null
  validIdType?: string | null
}

type PatientUser = BaseUser & {
  kind: 'patient'
  id: string
  firstName: string
  lastName: string
  record?: PatientRecord
  hasRecord?: boolean
  profile?: PatientProfile | null
  patientRecord?: any
}
type AnyUser = StaffUser | PatientUser

const PER_PAGE = 8

const initialStaff: StaffUser[] = [
  {
    kind: 'staff',
    id: 'MS-1001',
    firstName: 'Ramon',
    lastName: 'Dela Cruz',
    username: 'ramon.delacruz',
    email: 'ramon.delacruz@gmail.com',
    password: 'RamonDC@2025',
    role: 'Admin',
    position: 'Nurse',
    dateJoined: '2025-11-03',
  },
  {
    kind: 'staff',
    id: 'MS-1002',
    firstName: 'Liza',
    lastName: 'Mendoza',
    username: 'liza.mendoza',
    email: 'liza.mendoza@gmail.com',
    password: 'LizaMZ@2025',
    role: 'Admin',
    position: 'Midwife',
    dateJoined: '2025-11-18',
  },
  {
    kind: 'staff',
    id: 'MS-1003',
    firstName: 'Jose',
    lastName: 'Santos',
    username: 'jose.santos',
    email: 'jose.santos@gmail.com',
    password: 'JoseST@2025',
    role: 'Medical Staff',
    position: 'Barangay Health Worker (BHW)',
    dateJoined: '2025-12-05',
  },
  {
    kind: 'staff',
    id: 'MS-1004',
    firstName: 'Ana',
    lastName: 'Reyes',
    username: 'ana.reyes',
    email: 'ana.reyes@gmail.com',
    password: 'AnaRY@2026',
    role: 'Medical Staff',
    position: 'Nurse',
    dateJoined: '2026-01-14',
  },
  {
    kind: 'staff',
    id: 'MS-1005',
    firstName: 'Pedro',
    lastName: 'Gonzales',
    username: 'pedro.gonzales',
    email: 'pedro.gonzales@gmail.com',
    password: 'PedroGN@2026',
    role: 'Medical Staff',
    position: 'Barangay Health Worker (BHW)',
    dateJoined: '2026-02-02',
  },
  {
    kind: 'staff',
    id: 'MS-1006',
    firstName: 'Maria',
    lastName: 'Villanueva',
    username: 'maria.villanueva',
    email: 'maria.villanueva@gmail.com',
    password: 'MariaVL@2026',
    role: 'Medical Staff',
    position: 'Midwife',
    dateJoined: '2026-03-21',
  },
  {
    kind: 'staff',
    id: 'MS-1007',
    firstName: 'Carlo',
    lastName: 'Bautista',
    username: 'carlo.bautista',
    email: 'carlo.bautista@gmail.com',
    password: 'CarloBT@2026',
    role: 'Medical Staff',
    position: 'Nurse',
    dateJoined: '2026-04-09',
  },
  {
    kind: 'staff',
    id: 'MS-1008',
    firstName: 'Sofia',
    lastName: 'Aquino',
    username: 'sofia.aquino',
    email: 'sofia.aquino@gmail.com',
    password: 'SofiaAQ@2026',
    role: 'Medical Staff',
    position: 'Barangay Health Worker (BHW)',
    dateJoined: '2026-05-27',
  },
  {
    kind: 'staff',
    id: 'MS-1009',
    firstName: 'Miguel',
    lastName: 'Torres',
    username: 'miguel.torres',
    email: 'miguel.torres@gmail.com',
    password: 'MiguelTR@2026',
    role: 'Medical Staff',
    position: 'Midwife',
    dateJoined: '2026-06-16',
  },
  {
    kind: 'staff',
    id: 'MS-1010',
    firstName: 'Bea',
    lastName: 'Lim',
    username: 'bea.lim',
    email: 'bea.lim@gmail.com',
    password: 'BeaLM@2026',
    role: 'Medical Staff',
    position: 'Nurse',
    dateJoined: '2026-07-04',
  },
  {
    kind: 'staff',
    id: 'MS-1011',
    firstName: 'Dante',
    lastName: 'Ramos',
    username: 'dante.ramos',
    email: 'dante.ramos@gmail.com',
    password: 'DanteRM@2026',
    role: 'Medical Staff',
    position: 'Barangay Health Worker (BHW)',
    dateJoined: '2026-07-28',
  },
  {
    kind: 'staff',
    id: 'MS-1012',
    firstName: 'Clara',
    lastName: 'Navarro',
    username: 'clara.navarro',
    email: 'clara.navarro@gmail.com',
    password: 'ClaraNV@2026',
    role: 'Medical Staff',
    position: 'Midwife',
    dateJoined: '2026-08-10',
  },
]

const initialPatients: PatientUser[] = initialRecords
  .filter((r) => !r.deceased && !r.id.startsWith('PTN-0001'))
  .map((r) => {
    const first = (r.form.givenName || '').trim()
    const last = (r.form.lastName || '').trim()
    const slug = `${first.toLowerCase().replace(/\s+/g, '.')}.${last.toLowerCase().replace(/\s+/g, '.')}`
    return {
      kind: 'patient',
      id: r.id,
      firstName: first,
      lastName: last,
      username: slug,
      email: `${slug}@gmail.com`,
      password: `Patient@${r.id.replace(/\D/g, '').slice(-4)}`,
      role: 'Patient',
      dateJoined: r.date,
      record: r,
    }
  })

function fmtDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value))
    return new Date(value + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  const [m, d, y] = value.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function dateKey(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const [m, d, y] = value.split('-').map(Number)
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const fullName = (u: AnyUser) => `${u.lastName}, ${u.firstName}`

const ROLE_COLORS: Record<UserRole, { badge: string; darkBadge: string }> = {
  Admin: {
    badge: 'bg-blue-100 text-blue-700',
    darkBadge: 'bg-blue-500/20 text-blue-300',
  },
  'Medical Staff': {
    badge: 'bg-purple-100 text-purple-700',
    darkBadge: 'bg-purple-500/20 text-purple-300',
  },
  Patient: {
    badge: 'bg-green-100 text-green-700',
    darkBadge: 'bg-green-500/20 text-green-300',
  },
}

type EditForm = {
  firstName: string
  lastName: string
  username: string
  email: string
  password: string
  role: UserRole
  position: StaffPosition
}

type AddAccountForm = {
  firstName: string
  lastName: string
  email: string
  password: string
  role: 'ADMIN' | 'MEDSTAFF'
  position: StaffPosition
}

export default function UserManagementPage() {
  const { darkMode } = useDarkMode()
  const [users, setUsers] = useState<AnyUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [cardFilter, setCardFilter] = useState<
    'all' | 'staff' | 'patient' | 'records'
  >('all')
  const [staffPage, setStaffPage] = useState(1)
  const [patientPage, setPatientPage] = useState(1)
  const [sortAsc, setSortAsc] = useState(true)
  const [editing, setEditing] = useState<AnyUser | null>(null)
  const [viewingPatient, setViewingPatient] = useState<PatientUser | null>(null)
  const [deleting, setDeleting] = useState<AnyUser | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [revealedPasswords, setRevealedPasswords] = useState<
    Record<string, boolean>
  >({})
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState<AddAccountForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'MEDSTAFF',
    position: 'Nurse',
  })
  const [addPending, setAddPending] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/admin/accounts')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load accounts')
        return response.json()
      })
      .then((data) => {
        if (!active || !Array.isArray(data.users)) return
        setUsers(
          data.users.map((user: AnyUser & { dateJoined: string }) => ({
            ...user,
            databaseId: user.id,
            dateJoined: user.dateJoined.slice(0, 10),
          })),
        )
      })
      .catch(() => toast.error('Unable to load accounts from the database'))
    return () => {
      active = false
    }
  }, [])

  const staffCount = users.filter((u) => u.kind === 'staff').length
  const patientCount = users.filter((u) => u.kind === 'patient').length
  const recordsCount = users.filter(
    (u) => u.kind === 'patient' && u.hasRecord,
  ).length

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const qDigits = q.replace(/\D/g, '')
    let list = users
    if (q) {
      list = list.filter((u) => {
        const name = fullName(u).toLowerCase()
        const id = u.id.toLowerCase()
        const idDigits = id.replace(/\D/g, '')
        return (
          name.includes(q) ||
          id === q ||
          (qDigits && idDigits === qDigits) ||
          id.includes(q) ||
          u.email.toLowerCase().includes(q)
        )
      })
    }
    const sorted = [...list].sort(
      (a, b) =>
        dateKey(a.dateJoined).localeCompare(dateKey(b.dateJoined)) ||
        a.id.localeCompare(b.id),
    )
    return sortAsc ? sorted : sorted.reverse()
  }, [users, searchQuery, sortAsc])

  const filteredStaff = useMemo(
    () => filtered.filter((u) => u.kind === 'staff'),
    [filtered],
  )
  const filteredPatients = useMemo(
    () => filtered.filter((u) => u.kind === 'patient'),
    [filtered],
  )

  const paginate = (rows: AnyUser[], page: number) => {
    const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE))
    const safePage = Math.min(page, totalPages)
    const pageRows = rows.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)
    return { totalPages, safePage, pageRows, total: rows.length }
  }

  const staffTable = paginate(filteredStaff, staffPage)
  const patientTable = paginate(filteredPatients, patientPage)
  const shownAsc = [...staffTable.pageRows, ...patientTable.pageRows]

  const toggleReveal = (id: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleAllReveal = () => {
    const allRevealed = shownAsc.every((u) => revealedPasswords[u.id])
    const next: Record<string, boolean> = { ...revealedPasswords }
    shownAsc.forEach((u) => {
      next[u.id] = !allRevealed
    })
    setRevealedPasswords(next)
  }

  const openEdit = (user: AnyUser) => {
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      password: user.password,
      role: user.role,
      position: user.kind === 'staff' ? user.position : 'Nurse',
    })
    setEditing(user)
  }

  const saveEdit = async () => {
    if (!editing || !editForm) return
    if (
      !editForm.firstName.trim() ||
      !editForm.lastName.trim() ||
      !editForm.username.trim() ||
      !editForm.email.trim() ||
      !editForm.password.trim()
    ) {
      toast.error('Please fill in all required fields')
      return
    }
    const response = await fetch('/api/admin/accounts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editing.databaseId || editing.id,
        kind: editing.kind,
        ...editForm,
      }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      toast.error(data.message || 'Unable to update account')
      return
    }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === editing.id
          ? {
              ...u,
              firstName: editForm.firstName.trim(),
              lastName: editForm.lastName.trim(),
              username: editForm.username.trim(),
              email: editForm.email.trim(),
              password: editForm.password,
              role: editForm.role,
              ...(u.kind === 'staff' ? { position: editForm.position } : {}),
            }
          : u,
      ),
    )
    toast.success(`${fullName(editing)} has been updated`)
    setEditing(null)
    setEditForm(null)
  }

  const addAccount = async () => {
    if (
      !addForm.firstName.trim() ||
      !addForm.lastName.trim() ||
      !addForm.email.trim() ||
      !addForm.password.trim()
    ) {
      toast.error('Please fill in all account fields')
      return
    }

    setAddPending(true)
    try {
      const response = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data.message || 'Unable to create account')
        return
      }

      const role = addForm.role === 'ADMIN' ? 'Admin' : 'Medical Staff'
      const newAccount: StaffUser = {
        kind: 'staff',
        id: data.userId,
        databaseId: data.userId,
        firstName: addForm.firstName.trim(),
        lastName: addForm.lastName.trim(),
        username: addForm.email.trim().split('@')[0],
        email: addForm.email.trim().toLowerCase(),
        password: '********',
        role,
        position: addForm.position,
        dateJoined: new Date().toISOString().slice(0, 10),
      }
      setUsers((prev) => [newAccount, ...prev])
      setAdding(false)
      setAddForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'MEDSTAFF',
        position: 'Nurse',
      })
      toast.success(`${fullName(newAccount)} has been created`)
    } finally {
      setAddPending(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    const response = await fetch('/api/admin/accounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: deleting.databaseId || deleting.id,
        kind: deleting.kind,
      }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      toast.error(data.message || 'Unable to delete account')
      return
    }
    const name = fullName(deleting)
    setUsers((prev) => prev.filter((u) => u.id !== deleting.id))
    toast.success(`${name} has been deleted`)
    setDeleting(null)
  }

  const inputClass = `w-full px-3.5 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)] text-[#F9FAFB] bg-[#2d1b4e]' : 'border-gray-200 text-gray-800 bg-gray-100'} rounded-lg text-[15px] font-poppins outline-none focus:border-[#4E69D3] ${darkMode ? 'placeholder-gray-500' : 'placeholder-gray-400'} box-border`
  const selectClass = `w-full px-3.5 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)] text-[#F9FAFB] bg-[#2d1b4e]' : 'border-gray-200 text-gray-800 bg-gray-100'} rounded-lg text-[15px] font-poppins outline-none focus:border-[#4E69D3] appearance-none cursor-pointer box-border`
  const searchInputClass = `pl-10 pr-3.5 py-3 ${darkMode ? 'border-[rgba(255,255,255,0.10)] text-[#F9FAFB] bg-[#2d1b4e]' : 'border-gray-200 text-gray-800 bg-gray-100'} rounded-lg text-[15px] font-poppins outline-none focus:border-[#4E69D3] ${darkMode ? 'placeholder-gray-500' : 'placeholder-gray-400'} box-border`
  const pageBtnClass = `min-w-[38px] h-[38px] px-2.5 rounded-lg text-[14px] font-semibold font-poppins cursor-pointer border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:border-[#4E69D3]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#4E69D3] hover:text-[#4E69D3]'}`
  const pageBtnActiveClass =
    'bg-[#4E69D3] text-white border-[#4E69D3] hover:bg-[#4A6BC4] hover:text-white'
  const iconBtnClass = (danger?: boolean) =>
    `inline-flex items-center justify-center w-9 h-9 rounded-lg cursor-pointer border transition-all ${darkMode ? `bg-[#2d1b4e] ${danger ? 'text-red-400 border-[rgba(255,255,255,0.10)] hover:bg-[#0f1438]' : 'text-[#4E9FFF] border-[rgba(255,255,255,0.10)] hover:bg-[#0f1438]'}` : `${danger ? 'bg-white text-red-500 border-red-300 hover:bg-red-50' : 'bg-white text-[#4E69D3] border-[#4E69D3] hover:bg-[#E8EAF6]'}`}`

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
        <div>
          <h1
            className={`text-[30px] sm:text-[38px] lg:text-[45px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'} my-0 mb-[6px] text-left`}
          >
            User Management
          </h1>
          <p
            className={`text-[15px] m-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
          >
            View all registered users &mdash; accounts, credentials, and roles
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4E69D3] text-white text-[13px] font-semibold font-poppins border border-[#4E69D3] hover:bg-[#4A6BC4] transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Add account
          </button>
          <span
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold font-poppins border ${darkMode ? 'bg-[#2d1b4e] text-[#C4B5FD] border-[rgba(255,255,255,0.10)]' : 'bg-white text-[#4E69D3] border-[#4E69D3]/30'}`}
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
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {users.length} total users
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-[18px] mb-6 max-[1100px]:grid-cols-2 max-[768px]:grid-cols-1">
        <StatCard
          darkMode={darkMode}
          value={users.length}
          label="Total Users"
          color="#4E69D3"
          active={cardFilter === 'all'}
          onClick={() => setCardFilter('all')}
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
          value={staffCount}
          label="Medical Staff"
          color="#7C3AED"
          active={cardFilter === 'staff'}
          onClick={() => setCardFilter('staff')}
          icon={
            <>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </>
          }
        />
        <StatCard
          darkMode={darkMode}
          value={patientCount}
          label="Patients / Users"
          color="#0EA5E9"
          active={cardFilter === 'patient'}
          onClick={() => setCardFilter('patient')}
          icon={
            <>
              <circle cx="12" cy="8" r="5" />
              <path d="M20 21a8 8 0 0 0-16 0" />
            </>
          }
        />
        <StatCard
          darkMode={darkMode}
          value={recordsCount}
          label="Users with Records"
          color="#16A34A"
          icon={
            <>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </>
          }
        />
      </div>

      <div
        className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.10)]'} border rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
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
                placeholder="Search by name, email or ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setStaffPage(1)
                  setPatientPage(1)
                }}
                className={`w-full sm:w-[340px] ${searchInputClass}`}
              />
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
          <button
            className={`inline-flex items-center gap-2 px-3.5 py-3 rounded-lg text-[14px] font-semibold font-poppins cursor-pointer border transition-colors lg:ml-auto ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:bg-[#0f1438]' : 'bg-white text-[#4E69D3] border-[#4E69D3] hover:bg-[#E8EAF6]'}`}
            onClick={toggleAllReveal}
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
            {shownAsc.length > 0 &&
            shownAsc.every((u) => revealedPasswords[u.id])
              ? 'Hide All Passwords'
              : 'Show All Passwords'}
          </button>
        </div>
      </div>

      {(() => {
        const showStaff = cardFilter === 'all' || cardFilter === 'staff'
        const showPatients =
          cardFilter === 'all' ||
          cardFilter === 'patient' ||
          cardFilter === 'records'
        const patientRows =
          cardFilter === 'records'
            ? filteredPatients.filter((u) => (u as PatientUser).hasRecord)
            : filteredPatients
        const visibleTables = [
          ...(showStaff
            ? [
                {
                  key: 'staff',
                  title: 'Medical Staff Accounts',
                  table: staffTable,
                  page: staffPage,
                  setPage: setStaffPage,
                },
              ]
            : []),
          ...(showPatients
            ? [
                {
                  key: 'patient',
                  title: 'Patient / User Accounts',
                  table: paginate(patientRows, patientPage),
                  page: patientPage,
                  setPage: setPatientPage,
                },
              ]
            : []),
        ]
        return visibleTables.map((cfg) => (
          <div
            key={cfg.key}
            className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.10)]'} border rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] mt-5`}
          >
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2
                className={`font-poppins text-[18px] font-bold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
              >
                {cfg.title}
                <span
                  className={`ml-2 text-[13px] font-semibold px-2.5 py-1 rounded-full align-middle ${darkMode ? 'bg-[#0f1438] text-[#C4B5FD]' : 'bg-[#E8EAF6] text-[#4E69D3]'}`}
                >
                  {cfg.table.total}
                </span>
              </h2>
            </div>

            <div className="overflow-x-auto rounded-xl">
              <table
                className="w-full border-collapse text-[16px] min-w-[1050px]"
                style={{ tableLayout: 'fixed' }}
              >
                <thead>
                  <tr
                    className={`${darkMode ? 'bg-[#0f1438]' : 'bg-[#ddd6fe]'}`}
                  >
                    <th
                      className={`px-5 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[16px] uppercase tracking-[0.5px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[24%]`}
                    >
                      Username
                    </th>
                    <th
                      className={`px-5 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[16px] uppercase tracking-[0.5px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[18%]`}
                    >
                      Email
                    </th>
                    <th
                      className={`px-5 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[16px] uppercase tracking-[0.5px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[13%]`}
                    >
                      Account Type
                    </th>
                    <th
                      className={`px-5 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[16px] uppercase tracking-[0.5px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[10%]`}
                    >
                      Date Joined
                    </th>
                    <th
                      className={`px-5 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[16px] uppercase tracking-[0.5px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[13%]`}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cfg.table.pageRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className={`px-5 py-14 text-center text-[16px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
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
                        No users found for this search
                      </td>
                    </tr>
                  ) : (
                    cfg.table.pageRows.map((u) => {
                      const revealed = !!revealedPasswords[u.id]
                      return (
                        <tr
                          key={u.id}
                          className={`${darkMode ? 'hover:bg-[#0f1438]' : 'hover:bg-[#E8EAF6]'} transition-colors`}
                        >
                          <td
                            className={`px-5 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div
                                className={`w-9 h-9 rounded-full ${darkMode ? 'bg-[#0f1438] text-blue-300' : 'bg-[#E8EAF6] text-[#4E69D3]'} flex items-center justify-center font-bold text-sm flex-shrink-0`}
                              >
                                {u.firstName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <span
                                  className="block text-[16px] font-poppins font-semibold flex-1 min-w-0 whitespace-nowrap truncate"
                                  title={fullName(u)}
                                >
                                  {fullName(u)}
                                </span>
                                <span
                                  className={`block text-[12px] font-semibold truncate ${darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'}`}
                                >
                                  {u.id}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td
                            className={`px-5 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b text-[16px] ${darkMode ? 'text-gray-300' : 'text-gray-600'} whitespace-nowrap overflow-hidden text-ellipsis`}
                          >
                            {u.email}
                          </td>
                          <td
                            className={`px-5 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b text-[16px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
                          >
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-md text-[13px] font-semibold ${darkMode ? 'bg-[#0f1438] text-[#C4B5FD]' : 'bg-[#E8EAF6] text-[#4E69D3]'}`}
                            >
                              {u.kind === 'staff'
                                ? u.role === 'Admin'
                                  ? 'Admin'
                                  : 'Med Staff'
                                : 'Patient / User'}
                            </span>
                          </td>
                          <td
                            className={`px-5 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b text-[16px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
                          >
                            {fmtDate(u.dateJoined)}
                          </td>
                          <td
                            className={`px-5 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b`}
                          >
                            <div className="flex items-center gap-2">
                              {u.kind === 'staff' ? (
                                <>
                                  <button
                                    onClick={() => openEdit(u)}
                                    title="Edit user"
                                    className={iconBtnClass()}
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
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => setDeleting(u)}
                                    title="Delete user"
                                    className={iconBtnClass(true)}
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
                                      <polyline points="3 6 5 6 21 6" />
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                      <line x1="10" y1="11" x2="10" y2="17" />
                                      <line x1="14" y1="11" x2="14" y2="17" />
                                    </svg>
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() =>
                                    setViewingPatient(u as PatientUser)
                                  }
                                  title="View Patient Details"
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                    darkMode
                                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20'
                                      : 'bg-indigo-50 text-[#4E69D3] border-indigo-200 hover:bg-indigo-100'
                                  }`}
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
                                  View Info
                                </button>
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

            <div className="flex justify-between items-center gap-3 pt-4 pb-1 flex-wrap">
              <span
                className={`text-[13px] ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}
              >
                {cfg.table.total === 0
                  ? 'No accounts found'
                  : `Showing ${(cfg.table.safePage - 1) * PER_PAGE + 1}-${(cfg.table.safePage - 1) * PER_PAGE + cfg.table.pageRows.length} of ${cfg.table.total}`}
              </span>
              {cfg.table.totalPages > 1 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    className={pageBtnClass}
                    disabled={cfg.table.safePage === 1}
                    onClick={() => cfg.setPage(cfg.table.safePage - 1)}
                  >
                    &lsaquo; Prev
                  </button>
                  {Array.from({ length: cfg.table.totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      className={`${pageBtnClass}${cfg.table.safePage === i + 1 ? ' ' + pageBtnActiveClass : ''}`}
                      onClick={() => cfg.setPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    className={pageBtnClass}
                    disabled={cfg.table.safePage === cfg.table.totalPages}
                    onClick={() => cfg.setPage(cfg.table.safePage + 1)}
                  >
                    Next &rsaquo;
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      })()}

      {adding && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[1000] p-3 sm:p-4"
          onClick={() => setAdding(false)}
        >
          <div
            className={`${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-2xl w-full max-w-[520px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]`}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={`flex justify-between items-center px-5 sm:px-7 py-4 border-b ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'}`}
            >
              <div>
                <h2
                  className={`font-poppins text-xl font-bold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
                >
                  Add account
                </h2>
                <p
                  className={`text-[13px] m-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  Create an admin or medical staff account
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="w-9 h-9 rounded-full border-none bg-gray-100 text-gray-500 text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>
            <div className="px-5 sm:px-7 py-6 grid grid-cols-2 gap-3.5">
              <FieldGroup darkMode={darkMode} label="First Name" required>
                <input
                  value={addForm.firstName}
                  onChange={(event) =>
                    setAddForm({ ...addForm, firstName: event.target.value })
                  }
                  className={inputClass}
                />
              </FieldGroup>
              <FieldGroup darkMode={darkMode} label="Last Name" required>
                <input
                  value={addForm.lastName}
                  onChange={(event) =>
                    setAddForm({ ...addForm, lastName: event.target.value })
                  }
                  className={inputClass}
                />
              </FieldGroup>
              <FieldGroup darkMode={darkMode} label="Email" required>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(event) =>
                    setAddForm({ ...addForm, email: event.target.value })
                  }
                  className={inputClass}
                />
              </FieldGroup>
              <FieldGroup darkMode={darkMode} label="Password" required>
                <input
                  type="password"
                  value={addForm.password}
                  onChange={(event) =>
                    setAddForm({ ...addForm, password: event.target.value })
                  }
                  className={inputClass}
                />
              </FieldGroup>
              <FieldGroup darkMode={darkMode} label="Account Type" required>
                <select
                  value={addForm.role}
                  onChange={(event) =>
                    setAddForm({
                      ...addForm,
                      role: event.target.value as AddAccountForm['role'],
                    })
                  }
                  className={`${selectClass} col-span-2`}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MEDSTAFF">Medical Staff</option>
                </select>
              </FieldGroup>
              <FieldGroup darkMode={darkMode} label="Position" required>
                <select
                  value={addForm.position}
                  onChange={(event) =>
                    setAddForm({
                      ...addForm,
                      position: event.target.value as StaffPosition,
                    })
                  }
                  className={`${selectClass} col-span-2`}
                >
                  <option value="Nurse">Nurse</option>
                  <option value="Midwife">Midwife</option>
                  <option value="Barangay Health Worker (BHW)">
                    Barangay Health Worker (BHW)
                  </option>
                </select>
              </FieldGroup>
            </div>
            <div
              className={`flex justify-end gap-3 px-5 sm:px-7 py-4 border-t ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'}`}
            >
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addAccount}
                disabled={addPending}
                className="px-5 py-2.5 rounded-lg border-none bg-[#4E69D3] text-white font-semibold cursor-pointer disabled:opacity-50"
              >
                {addPending ? 'Creating...' : 'Create account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && editForm && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[1000] p-3 sm:p-4 overflow-y-auto"
          onClick={() => {
            setEditing(null)
            setEditForm(null)
          }}
        >
          <div
            className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white'} rounded-2xl w-full max-w-[560px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] flex flex-col max-h-[92vh]`}
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
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
                <div>
                  <h2
                    className={`font-poppins text-xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0`}
                  >
                    Edit User &mdash; {editing.id}
                  </h2>
                  <p
                    className={`text-[13px] m-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    Update account details and permissions
                  </p>
                </div>
              </div>
              <button
                className={`w-9 h-9 border-none ${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'} rounded-full text-xl ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'} cursor-pointer flex items-center justify-center hover:bg-red-500 hover:text-white transition-all flex-shrink-0`}
                onClick={() => {
                  setEditing(null)
                  setEditForm(null)
                }}
              >
                &times;
              </button>
            </div>

            <div className="px-5 sm:px-7 py-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3.5 mb-3.5 max-[520px]:grid-cols-1">
                <FieldGroup darkMode={darkMode} label="Last Name" required>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, lastName: e.target.value })
                    }
                    className={inputClass}
                  />
                </FieldGroup>
                <FieldGroup darkMode={darkMode} label="First Name" required>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, firstName: e.target.value })
                    }
                    className={inputClass}
                  />
                </FieldGroup>
              </div>
              <div className="grid grid-cols-2 gap-3.5 mb-3.5 max-[520px]:grid-cols-1">
                <FieldGroup darkMode={darkMode} label="Username" required>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) =>
                      setEditForm({ ...editForm, username: e.target.value })
                    }
                    className={inputClass}
                  />
                </FieldGroup>
                <FieldGroup darkMode={darkMode} label="Email" required>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    className={inputClass}
                  />
                </FieldGroup>
              </div>
              <div className="grid grid-cols-2 gap-3.5 mb-3.5 max-[520px]:grid-cols-1">
                <FieldGroup darkMode={darkMode} label="Password" required>
                  <input
                    type="text"
                    value={editForm.password}
                    onChange={(e) =>
                      setEditForm({ ...editForm, password: e.target.value })
                    }
                    className={inputClass}
                  />
                </FieldGroup>
                <FieldGroup darkMode={darkMode} label="Role" required>
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        role: e.target.value as UserRole,
                      })
                    }
                    className={selectClass}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Medical Staff">Medical Staff</option>
                    <option
                      value="Patient"
                      disabled={editing?.kind === 'staff'}
                    >
                      Patient
                    </option>
                  </select>
                </FieldGroup>
              </div>
              {editing.kind === 'staff' && (
                <FieldGroup darkMode={darkMode} label="Position" required>
                  <select
                    value={editForm.position}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        position: e.target.value as StaffPosition,
                      })
                    }
                    className={selectClass}
                  >
                    <option value="Nurse">Nurse</option>
                    <option value="Midwife">Midwife</option>
                    <option value="Barangay Health Worker (BHW)">
                      Barangay Health Worker (BHW)
                    </option>
                  </select>
                </FieldGroup>
              )}
            </div>

            <div
              className={`flex flex-row items-center justify-end gap-3 px-5 sm:px-7 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} border-t flex-shrink-0`}
            >
              <p
                className={`text-[13px] m-0 mr-auto ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
              >
                Edits are applied to the account data
              </p>
              <button
                onClick={() => {
                  setEditing(null)
                  setEditForm(null)
                }}
                className={`px-6 py-3 rounded-lg text-[15px] font-bold font-poppins cursor-pointer border transition-all ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:bg-[#0f1438]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className={`px-6 py-3 rounded-lg text-[15px] font-bold font-poppins cursor-pointer border-none transition-all bg-[#4E69D3] text-white hover:bg-[#4A6BC4]`}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[1000] p-3 sm:p-4"
          onClick={() => setDeleting(null)}
        >
          <div
            className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white'} rounded-2xl w-full max-w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 text-center">
              <div
                className={`w-14 h-14 mx-auto mb-4 rounded-full ${darkMode ? 'bg-red-500/15' : 'bg-red-50'} flex items-center justify-center`}
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </div>
              <h3
                className={`font-poppins text-lg font-bold m-0 mb-2 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
              >
                Delete user?
              </h3>
              <p
                className={`text-[14px] m-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
              >
                You are about to permanently delete <b>{fullName(deleting)}</b>{' '}
                (@{deleting.username}). This action cannot be undone.
              </p>
            </div>
            <div className={`flex justify-center gap-3 px-6 pb-6 pt-2`}>
              <button
                onClick={() => setDeleting(null)}
                className={`px-6 py-3 rounded-lg text-[15px] font-bold font-poppins cursor-pointer border transition-all ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:bg-[#0f1438]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white border-none rounded-lg text-[15px] font-bold font-poppins cursor-pointer hover:bg-red-700 transition-colors"
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
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingPatient && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[1000] p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setViewingPatient(null)}
        >
          <div
            className={`${darkMode ? 'bg-[#2d1b4e] text-white border-white/10' : 'bg-white text-slate-800 border-slate-200'} rounded-2xl w-full max-w-[640px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] overflow-hidden border max-h-[90vh] flex flex-col`}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={`flex justify-between items-center px-6 py-4 border-b ${
                darkMode ? 'border-white/10' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-full ${
                    darkMode
                      ? 'bg-[#0f1438] text-blue-300'
                      : 'bg-[#E8EAF6] text-[#4E69D3]'
                  } flex items-center justify-center font-bold text-lg flex-shrink-0`}
                >
                  {viewingPatient.firstName?.charAt(0) || 'P'}
                </div>
                <div>
                  <h2
                    className={`font-poppins text-xl font-bold m-0 ${
                      darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'
                    }`}
                  >
                    {fullName(viewingPatient)}
                  </h2>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                      darkMode
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    Patient ID: {viewingPatient.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingPatient(null)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center border-none cursor-pointer text-lg font-bold ${
                  darkMode
                    ? 'bg-white/5 hover:bg-white/15 text-gray-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div>
                <h3
                  className={`text-xs font-bold uppercase tracking-wider mb-3 ${
                    darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'
                  }`}
                >
                  Account Details
                </h3>
                <div
                  className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl text-sm ${
                    darkMode ? 'bg-[#0f1438]' : 'bg-[#F8FAFC]'
                  }`}
                >
                  <div>
                    <span className="block text-xs text-gray-500 font-medium mb-0.5">
                      Username
                    </span>
                    <span className="font-semibold font-mono">
                      @{viewingPatient.username}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 font-medium mb-0.5">
                      Email Address
                    </span>
                    <span className="font-semibold truncate block">
                      {viewingPatient.email}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 font-medium mb-0.5">
                      Date Joined
                    </span>
                    <span className="font-semibold">
                      {fmtDate(viewingPatient.dateJoined)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 font-medium mb-0.5">
                      Account Role
                    </span>
                    <span className="font-semibold inline-flex items-center gap-1.5 text-green-600 dark:text-green-400">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Patient / User
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3
                  className={`text-xs font-bold uppercase tracking-wider mb-3 ${
                    darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'
                  }`}
                >
                  Personal & Contact Information
                </h3>
                <div
                  className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl text-sm ${
                    darkMode ? 'bg-[#0f1438]' : 'bg-[#F8FAFC]'
                  }`}
                >
                  <div>
                    <span className="block text-xs text-gray-500 font-medium mb-0.5">
                      Phone / Contact
                    </span>
                    <span className="font-semibold">
                      {viewingPatient.profile?.phoneNumber ||
                        viewingPatient.record?.form?.contactNumber ||
                        'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 font-medium mb-0.5">
                      Birthdate
                    </span>
                    <span className="font-semibold">
                      {viewingPatient.profile?.birthdate
                        ? fmtDate(
                            String(viewingPatient.profile.birthdate).slice(
                              0,
                              10,
                            ),
                          )
                        : viewingPatient.record?.form?.birthdate
                          ? fmtDate(viewingPatient.record.form.birthdate)
                          : 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 font-medium mb-0.5">
                      Sex / Gender
                    </span>
                    <span className="font-semibold capitalize">
                      {viewingPatient.record?.form?.sex || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 font-medium mb-0.5">
                      Civil Status
                    </span>
                    <span className="font-semibold capitalize">
                      {viewingPatient.record?.form?.civilStatus ||
                        'Not specified'}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="block text-xs text-gray-500 font-medium mb-0.5">
                      Residence Address
                    </span>
                    <span className="font-semibold">
                      {[
                        viewingPatient.profile?.houseNumber ||
                          viewingPatient.record?.form?.street ||
                          viewingPatient.record?.form?.completeAddress,
                        viewingPatient.profile?.barangay ||
                          viewingPatient.record?.form?.barangay,
                        viewingPatient.profile?.city ||
                          viewingPatient.record?.form?.city,
                        viewingPatient.profile?.province ||
                          viewingPatient.record?.form?.province,
                        viewingPatient.profile?.zipCode ||
                          viewingPatient.record?.form?.postalCode,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'Not specified'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3
                  className={`text-xs font-bold uppercase tracking-wider mb-3 ${
                    darkMode ? 'text-[#C4B5FD]' : 'text-[#4E69D3]'
                  }`}
                >
                  PhilHealth Information
                </h3>
                <div
                  className={`grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-4 rounded-xl text-sm ${
                    darkMode ? 'bg-[#0f1438]' : 'bg-[#F8FAFC]'
                  }`}
                >
                  <div>
                    <span className="block text-xs text-gray-500 font-medium mb-0.5">
                      PhilHealth No.
                    </span>
                    <span className="font-semibold font-mono">
                      {viewingPatient.profile?.philHealthNo ||
                        viewingPatient.record?.form?.philHealthNo ||
                        'None'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 font-medium mb-0.5">
                      Membership Type
                    </span>
                    <span className="font-semibold">
                      {viewingPatient.profile?.membershipType || 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 font-medium mb-0.5">
                      Status
                    </span>
                    <span className="font-semibold">
                      {viewingPatient.profile?.philHealthStatus || 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`px-6 py-4 border-t flex justify-end gap-3 ${
                darkMode ? 'border-white/10' : 'border-slate-200'
              }`}
            >
              <button
                onClick={() => setViewingPatient(null)}
                className="px-5 py-2.5 rounded-lg text-sm font-bold bg-[#4E69D3] text-white hover:bg-indigo-600 cursor-pointer border-none transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
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
  onClick,
  active = false,
}: {
  darkMode: boolean
  value: number
  label: string
  color: string
  icon: React.ReactNode
  onClick?: () => void
  active?: boolean
}) {
  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.()
      }}
      role="button"
      tabIndex={0}
      className={`flex items-center gap-4 max-sm:gap-3 cursor-pointer ${active ? (darkMode ? 'ring-2 ring-[#4E69D3] bg-[#2d1b4e] border-[#4E69D3]' : 'ring-2 ring-[#4E69D3] bg-[#E8EAF6] border-[#E8EAF6]') : ''} ${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'bg-white border-[rgba(15,60,95,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]'} p-[22px] max-sm:p-4 rounded-[18px] border`}
    >
      <div
        className={`w-14 h-14 max-sm:w-11 max-sm:h-11 rounded-xl ${darkMode ? 'bg-[#141a45]' : 'bg-[#E8EAF6]'} flex items-center justify-center flex-shrink-0`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-7 h-7"
        >
          {icon}
        </svg>
      </div>
      <div className="flex flex-col">
        <span
          className={`text-4xl max-sm:text-3xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
        >
          {value}
        </span>
        <span
          className={`text-lg leading-tight ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
        >
          {label}
        </span>
      </div>
    </div>
  )
}

function FieldGroup({
  darkMode,
  label,
  required,
  children,
}: {
  darkMode: boolean
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        className={`block text-[12px] font-semibold uppercase tracking-[0.5px] mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
      >
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  )
}
