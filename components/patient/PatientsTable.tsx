'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus,
  Edit3,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react'
import { useDarkMode } from '@/app/admin/DarkModeContext'
import ItrViewerModal from '@/components/ui/ItrViewerModal'
import { patientAddressLines } from '@/src/data/patientAddress'
import type { MedicalRecord } from '@/src/data/records'
import {
  createPatientRecord,
  updatePatientRecord,
} from '@/lib/actions/patients'
import type { PatientListItem } from '@/lib/actions/patients'

const RECORDS_PER_PAGE = 10

type PatientForm = {
  name: string
  sex: string
  birthdate: string
  phoneNumber: string
  houseNumber: string
  purok: string
  barangay: string
  city: string
  province: string
  zipCode: string
}

const emptyForm: PatientForm = {
  name: '',
  sex: 'Male',
  birthdate: '',
  phoneNumber: '',
  houseNumber: '',
  purok: '',
  barangay: '',
  city: '',
  province: '',
  zipCode: '',
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()
}

function formatDate(iso?: string): string {
  if (!iso) return '\u2014'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '\u2014'
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
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
      className={`flex items-center gap-4 p-5 rounded-[18px] border shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)] ${
        darkMode
          ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]'
          : 'bg-white border-[rgba(15,60,95,0.08)]'
      }`}
    >
      <div
        className={`w-14 h-14 max-sm:w-11 max-sm:h-11 rounded-xl ${
          darkMode ? 'bg-[#141a45]' : 'bg-[#E8EAF6]'
        } flex items-center justify-center flex-shrink-0`}
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

function VisitCard({
  v,
  darkMode,
  onViewItr,
}: {
  v: PatientListItem['visits'][number]
  darkMode: boolean
  onViewItr?: (record: MedicalRecord) => void
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        darkMode
          ? 'bg-[#0f1438] border-[rgba(255,255,255,0.10)]'
          : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
        <div>
          <span
            className={`font-bold text-[16px] font-poppins block ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
          >
            {formatDate(v.date)}
          </span>
          <span
            className={`text-[13px] font-poppins ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
          >
            {v.serviceName}
          </span>
        </div>
        {v.condition && (
          <span className="px-2.5 py-1 rounded-full text-[12px] font-bold font-poppins bg-[#4E69D3] text-white">
            {v.condition}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
        {[
          { label: 'Blood Pressure', value: v.bloodPressure },
          {
            label: 'O2 Level',
            value: v.oxygenLevel ? `${v.oxygenLevel}%` : '',
          },
          { label: 'Height', value: v.height ? `${v.height} cm` : '' },
          { label: 'Weight', value: v.weight ? `${v.weight} kg` : '' },
        ].map((m) => (
          <div
            key={m.label}
            className={`rounded-lg px-3 py-2 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white border border-gray-200'}`}
          >
            <span
              className={`block text-[11px] font-semibold uppercase tracking-[0.5px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
            >
              {m.label}
            </span>
            <span
              className={`block text-[15px] font-bold font-poppins ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
            >
              {m.value || '\u2014'}
            </span>
          </div>
        ))}
      </div>

      {v.diagnosis && (
        <p
          className={`m-0 mb-1.5 text-[14px] font-poppins leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
        >
          <span
            className={`font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
          >
            Diagnosis:{' '}
          </span>
          {v.diagnosis}
        </p>
      )}
      {v.recommendation && (
        <p
          className={`m-0 mb-1.5 text-[14px] font-poppins leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
        >
          <span
            className={`font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
          >
            Recommendation:{' '}
          </span>
          {v.recommendation}
        </p>
      )}
      {v.checkedBy && (
        <p
          className={`m-0 text-[13px] font-poppins italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
        >
          Checked by {v.checkedBy}
        </p>
      )}

      {/* Admins and medical staff can view (and print) the ITR of this visit
          in the printed template layout, straight from the patient list. */}
      {v.record && onViewItr && (
        <button
          type="button"
          onClick={() => onViewItr(v.record as MedicalRecord)}
          className={`mt-3 w-full py-2.5 rounded-xl font-poppins text-[14px] font-medium text-white transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer ${
            darkMode
              ? 'bg-[#4E69D3] hover:bg-[#4A6BC4]'
              : 'bg-emerald-500 hover:bg-emerald-600'
          }`}
        >
          <FileText className="w-4 h-4" aria-hidden="true" />
          View ITR
        </button>
      )}
    </div>
  )
}

export default function PatientsTable({
  patients,
  darkMode: darkModeProp,
}: {
  patients: PatientListItem[]
  /** Optional override so staff shells can pass their own dark-mode state. */
  darkMode?: boolean
}) {
  const { darkMode: contextDarkMode } = useDarkMode()
  const darkMode = darkModeProp ?? contextDarkMode
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingPatient, setViewingPatient] = useState<PatientListItem | null>(
    null,
  )
  // ITR opened from a visit card of the medical history modal.
  const [itrRecord, setItrRecord] = useState<MedicalRecord | null>(null)
  const [form, setForm] = useState<PatientForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)

  const q = searchQuery.trim().toLowerCase()
  const filtered = patients.filter((p) => {
    if (!q) return true
    return (
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.sex.toLowerCase().includes(q) ||
      (p.phoneNumber || '').toLowerCase().includes(q) ||
      (p.houseNumber || '').toLowerCase().includes(q) ||
      (p.purok || '').toLowerCase().includes(q) ||
      (p.barangay || '').toLowerCase().includes(q) ||
      (p.city || '').toLowerCase().includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / RECORDS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const pagePatients = filtered.slice(
    (safePage - 1) * RECORDS_PER_PAGE,
    safePage * RECORDS_PER_PAGE,
  )
  const firstShown =
    filtered.length === 0 ? 0 : (safePage - 1) * RECORDS_PER_PAGE + 1
  const lastShown = (safePage - 1) * RECORDS_PER_PAGE + pagePatients.length

  const maleCount = patients.filter(
    (p) => (p.sex || '').toLowerCase() === 'male' || p.sex === 'M',
  ).length
  const femaleCount = patients.filter(
    (p) => (p.sex || '').toLowerCase() === 'female' || p.sex === 'F',
  ).length
  const seniorCount = patients.filter((p) => (p.age ?? 0) >= 60).length

  const inputClass = `w-full px-3.5 py-2.5 ${
    darkMode
      ? 'border-[rgba(255,255,255,0.10)] text-[#F9FAFB] bg-[#2d1b4e]'
      : 'border-gray-200 text-gray-800 bg-gray-100'
  } rounded-lg text-[15px] font-poppins outline-none focus:border-[#4E69D3] box-border`

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
    setShowModal(true)
  }

  const openEdit = (p: PatientListItem) => {
    setEditingId(p.id)
    setForm({
      name: p.name || '',
      sex: p.sex || 'Male',
      birthdate: p.birthdate ? p.birthdate.slice(0, 10) : '',
      phoneNumber: p.phoneNumber || '',
      houseNumber: p.houseNumber || '',
      purok: p.purok || '',
      barangay: p.barangay || '',
      city: p.city || '',
      province: p.province || '',
      zipCode: p.zipCode || '',
    })
    setFormError(null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
  }

  const handleSave = () => {
    const errors: Record<string, string> = {}
    if (form.name.trim().length < 3)
      errors.name = 'Enter the patient\u2019s full name.'
    if (!form.sex) errors.sex = 'Select the patient\u2019s sex.'
    if (!form.birthdate)
      errors.birthdate = 'Enter a valid birthday (not in the future).'
    if (Object.keys(errors).length > 0) {
      setFormError(Object.values(errors)[0])
      return
    }

    const fd = new FormData()
    fd.set('patientId', editingId || '')
    fd.set('name', form.name.trim())
    fd.set('sex', form.sex)
    fd.set('birthdate', form.birthdate)
    fd.set('phoneNumber', form.phoneNumber)
    fd.set('houseNumber', form.houseNumber)
    fd.set('purok', form.purok)
    fd.set('barangay', form.barangay)
    fd.set('city', form.city)
    fd.set('province', form.province)
    fd.set('zipCode', form.zipCode)

    startTransition(async () => {
      const result = editingId
        ? await updatePatientRecord(null, fd)
        : await createPatientRecord(null, fd)
      if (result.success) {
        closeModal()
        router.refresh()
        toast.success(result.message)
      } else {
        setFormError(
          result.message || 'Something went wrong. Please try again.',
        )
      }
    })
  }

  return (
    <div>
      <h1
        className={`text-[30px] sm:text-[38px] lg:text-[45px] my-[14px] text-left ${
          darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'
        }`}
      >
        Patient Lists
      </h1>

      <div className="grid grid-cols-4 gap-[18px] mb-6 max-[1100px]:grid-cols-2 max-[768px]:grid-cols-1">
        <StatCard
          darkMode={darkMode}
          value={patients.length}
          label="Patients w/ Visits"
          color="#4E69D3"
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
          value={maleCount}
          label="Male"
          color="#0EA5E9"
          icon={
            <>
              <circle cx="12" cy="12" r="7" />
              <path d="M17.5 6.5L22 2" />
              <path d="M15.5 2H22v6.5" />
            </>
          }
        />
        <StatCard
          darkMode={darkMode}
          value={femaleCount}
          label="Female"
          color="#EC4899"
          icon={
            <>
              <circle cx="12" cy="8" r="5" />
              <path d="M12 13v10M8 18h8" />
            </>
          }
        />
        <StatCard
          darkMode={darkMode}
          value={seniorCount}
          label="Seniors (60+)"
          color="#F59E0B"
          icon={
            <>
              <path d="M12 21a9 9 0 1 0-9-9" />
              <path d="M3 21v-8h8" />
              <path d="M17 4l3 3M14 7l6 6M11 10l6 6" />
            </>
          }
        />
      </div>

      <div
        className={`rounded-2xl p-4 sm:p-6 ${
          darkMode
            ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]'
            : 'bg-white border-[rgba(15,60,95,0.08)]'
        } border shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]`}
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 mb-5">
          <div className="relative flex items-center flex-1">
            <svg
              className={`absolute left-3 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'} pointer-events-none`}
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
              placeholder="Search by name, ID, contact, or address..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className={`w-full pl-10 pr-3.5 py-2.5 ${
                darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'
              } rounded-lg text-[15px] font-poppins ${
                darkMode
                  ? 'text-[#F9FAFB] bg-[#2d1b4e]'
                  : 'text-gray-800 bg-gray-100'
              } outline-none focus:border-[#4E69D3]`}
            />
          </div>
          <button
            onClick={openAdd}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 px-[18px] py-2.5 bg-[#4E69D3] text-white border-none rounded-lg text-[15px] font-semibold font-poppins cursor-pointer hover:bg-[#4A6BC4] transition-colors disabled:opacity-50"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Add Patient</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl">
          <table
            className="w-full border-collapse text-[16px] min-w-[900px]"
            style={{ tableLayout: 'fixed' }}
          >
            <thead>
              <tr className={`${darkMode ? 'bg-[#0f1438]' : 'bg-[#ddd6fe]'}`}>
                {[
                  'Patient',
                  'Age / Sex',
                  'Contact',
                  'Address',
                  'Last Visit',
                ].map((label, i) => (
                  <th
                    key={label}
                    className={`px-5 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[15px] uppercase tracking-[0.5px] font-poppins border-b`}
                    style={{ width: ['26%', '12%', '16%', '20%', '16%'][i] }}
                  >
                    {label}
                  </th>
                ))}
                <th
                  className={`px-5 py-4 text-right font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[15px] uppercase tracking-[0.5px] font-poppins border-b w-[10%]`}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {pagePatients.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className={`px-5 py-12 text-center text-[16px] font-semibold font-poppins ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    No patients found{q ? ` matching "${searchQuery}"` : ''}.
                  </td>
                </tr>
              ) : (
                pagePatients.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b last:border-none ${darkMode ? 'border-[rgba(255,255,255,0.08)]' : 'border-gray-100'}`}
                  >
                    <td className="px-5 py-4 align-middle">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-11 h-11 max-sm:w-9 max-sm:h-9 rounded-full ${
                            darkMode
                              ? 'bg-[#141a45] text-blue-300'
                              : 'bg-[#E8EAF6] text-[#4E69D3]'
                          } flex items-center justify-center font-bold text-sm flex-shrink-0`}
                        >
                          {initials(p.name)}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-[16px] font-bold m-0 truncate font-poppins ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
                          >
                            {p.name}
                          </p>
                          <p
                            className={`text-[13px] font-semibold m-0 truncate font-poppins ${darkMode ? 'text-[#4E9FFF]' : 'text-[#4E69D3]'}`}
                          >
                            {p.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td
                      className={`px-5 py-4 align-middle text-[15px] font-poppins ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
                    >
                      {p.age !== null && p.age !== undefined
                        ? `${p.age} yrs`
                        : '\u2014'}{' '}
                      /{' '}
                      <span
                        className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md text-xs align-middle ${
                          (p.sex || '').toLowerCase() === 'male'
                            ? darkMode
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : 'bg-sky-100 text-sky-700 border border-sky-200'
                            : (p.sex || '').toLowerCase() === 'female'
                              ? darkMode
                                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                                : 'bg-pink-100 text-pink-700 border border-pink-200'
                              : darkMode
                                ? 'bg-gray-700 text-gray-300'
                                : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {p.sex || 'Unspecified'}
                      </span>
                    </td>
                    <td
                      className={`px-5 py-4 align-middle text-[15px] font-poppins truncate ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
                    >
                      {p.phoneNumber || '\u2014'}
                    </td>
                    <td
                      className={`px-5 py-4 align-middle text-[14px] font-poppins ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
                      title={patientAddressLines(p).join(', ')}
                    >
                      {(() => {
                        const lines = patientAddressLines(p)
                        if (lines.length === 0) return '\u2014'
                        return (
                          <span className="flex flex-col leading-tight">
                            {lines.map((line, i) => (
                              <span
                                key={line + i}
                                className={
                                  i === 0
                                    ? 'font-medium'
                                    : darkMode
                                      ? 'text-gray-400'
                                      : 'text-gray-500'
                                }
                              >
                                {line}
                              </span>
                            ))}
                          </span>
                        )
                      })()}
                    </td>
                    <td
                      onClick={() => setViewingPatient(p)}
                      className={`px-5 py-4 align-middle text-[15px] font-poppins cursor-pointer ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
                      title="View medical history"
                    >
                      {p.visits.length > 0 ? (
                        <>
                          <span className="font-bold block truncate">
                            {formatDate(p.visits[0].date)}
                          </span>
                          <span className="text-[13px] block truncate">
                            {p.visits[0].serviceName}
                          </span>
                        </>
                      ) : (
                        <span className="italic">No visits yet</span>
                      )}
                    </td>
                    <td className="px-5 py-4 align-middle text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setViewingPatient(p)}
                          title="View medical history"
                          className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border-none cursor-pointer transition-colors ${
                            darkMode
                              ? 'bg-[#0f1438] text-emerald-300 hover:bg-[#4E69D3] hover:text-white'
                              : 'bg-[#E8EAF6] text-[#4E69D3] hover:bg-[#4E69D3] hover:text-white'
                          }`}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          disabled={isPending}
                          title="Edit patient"
                          className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border-none cursor-pointer transition-colors ${
                            darkMode
                              ? 'bg-[#0f1438] text-blue-300 hover:bg-[#4E69D3] hover:text-white'
                              : 'bg-[#E8EAF6] text-[#4E69D3] hover:bg-[#4E69D3] hover:text-white'
                          } disabled:opacity-50`}
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5">
          <p
            className={`m-0 text-[14px] font-poppins ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
          >
            Showing {firstShown}&ndash;{lastShown} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(safePage - 1)}
              disabled={safePage <= 1 || isPending}
              className={`min-w-[40px] h-[40px] px-2.5 rounded-lg text-[15px] font-semibold font-poppins cursor-pointer border transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center ${
                darkMode
                  ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:border-[#4E69D3]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#4E69D3] hover:text-[#4E69D3]'
              }`}
            >
              <ChevronLeft size={18} />
            </button>
            <span
              className={`min-w-[40px] h-[40px] px-2.5 rounded-lg text-[15px] font-bold font-poppins border bg-[#4E69D3] text-white border-[#4E69D3] flex items-center justify-center`}
            >
              {safePage}
            </span>
            <button
              onClick={() => setCurrentPage(safePage + 1)}
              disabled={safePage >= totalPages || isPending}
              className={`min-w-[40px] h-[40px] px-2.5 rounded-lg text-[15px] font-semibold font-poppins cursor-pointer border transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center ${
                darkMode
                  ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:border-[#4E69D3]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#4E69D3] hover:text-[#4E69D3]'
              }`}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[1200] flex justify-center items-start p-3 sm:p-4 lg:p-10 overflow-y-auto bg-black/40"
          onClick={() => !isPending && closeModal()}
        >
          <div
            className={`${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-2xl w-full max-w-[520px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex flex-col relative overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex justify-between items-center px-4 sm:px-7 py-4 sm:py-5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} border-b`}
            >
              <h2
                className={`font-poppins text-xl font-bold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
              >
                {editingId ? 'Edit Patient' : 'Add New Patient'}
              </h2>
              <button
                className={`w-9 h-9 border-none ${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'} rounded-full ${
                  darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'
                } cursor-pointer flex items-center justify-center hover:bg-red-500 hover:text-white transition-all flex-shrink-0`}
                onClick={() => !isPending && closeModal()}
                disabled={isPending}
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-4 sm:px-7 py-6 overflow-y-auto flex flex-col gap-3.5">
              <div>
                <label
                  className={`block text-[12px] font-semibold uppercase tracking-[0.5px] mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Juan Dela Cruz"
                  disabled={isPending}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label
                    className={`block text-[12px] font-semibold uppercase tracking-[0.5px] mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    Sex <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.sex}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, sex: e.target.value }))
                    }
                    disabled={isPending}
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
                <div>
                  <label
                    className={`block text-[12px] font-semibold uppercase tracking-[0.5px] mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    Birthdate <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.birthdate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        birthdate: e.target.value,
                      }))
                    }
                    disabled={isPending}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label
                    className={`block text-[12px] font-semibold uppercase tracking-[0.5px] mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={form.phoneNumber}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        phoneNumber: e.target.value,
                      }))
                    }
                    placeholder="e.g. 0917 123 4567"
                    disabled={isPending}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    className={`block text-[12px] font-semibold uppercase tracking-[0.5px] mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    House Number
                  </label>
                  <input
                    type="text"
                    value={form.houseNumber}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        houseNumber: e.target.value,
                      }))
                    }
                    placeholder="e.g. 123 Rizal St."
                    disabled={isPending}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block text-[12px] font-semibold uppercase tracking-[0.5px] mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  Purok
                </label>
                <input
                  type="text"
                  value={form.purok}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, purok: e.target.value }))
                  }
                  placeholder="e.g. Purok 3"
                  disabled={isPending}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label
                    className={`block text-[12px] font-semibold uppercase tracking-[0.5px] mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    Barangay
                  </label>
                  <input
                    type="text"
                    value={form.barangay}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, barangay: e.target.value }))
                    }
                    disabled={isPending}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    className={`block text-[12px] font-semibold uppercase tracking-[0.5px] mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    City
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, city: e.target.value }))
                    }
                    disabled={isPending}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label
                    className={`block text-[12px] font-semibold uppercase tracking-[0.5px] mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    Province
                  </label>
                  <input
                    type="text"
                    value={form.province}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, province: e.target.value }))
                    }
                    disabled={isPending}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    className={`block text-[12px] font-semibold uppercase tracking-[0.5px] mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    Zip Code
                  </label>
                  <input
                    type="text"
                    value={form.zipCode}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, zipCode: e.target.value }))
                    }
                    disabled={isPending}
                    className={inputClass}
                  />
                </div>
              </div>

              {formError && (
                <p className="m-0 text-[13px] font-semibold text-red-500">
                  {formError}
                </p>
              )}
            </div>

            <div
              className={`flex justify-end gap-3 mt-auto px-4 sm:px-7 py-4 border-t ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'}`}
            >
              <button
                onClick={() => !isPending && closeModal()}
                disabled={isPending}
                className={`px-6 py-3 rounded-lg text-[15px] font-bold font-poppins cursor-pointer border transition-all ${
                  darkMode
                    ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:bg-[#0f1438]'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                } disabled:opacity-50`}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="px-6 py-3 rounded-lg text-[15px] font-bold font-poppins cursor-pointer border-none transition-all bg-[#4E69D3] text-white hover:bg-[#4A6BC4] disabled:opacity-50"
              >
                {isPending
                  ? 'Saving...'
                  : editingId
                    ? 'Save Changes'
                    : 'Add Patient'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medical history modal */}
      {viewingPatient && (
        <div
          className="fixed inset-0 z-[1200] flex justify-center items-start p-3 sm:p-4 lg:p-10 overflow-y-auto bg-black/40"
          onClick={() => setViewingPatient(null)}
        >
          <div
            className={`${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-2xl w-full max-w-[720px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex flex-col relative overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex justify-between items-center px-4 sm:px-7 py-4 sm:py-5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} border-b`}
            >
              <div className="flex flex-col">
                <h2
                  className={`font-poppins text-xl font-bold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}
                >
                  Medical History
                </h2>
                <span
                  className={`text-[13px] font-poppins mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  {viewingPatient.name} &middot; {viewingPatient.id}
                </span>
              </div>
              <button
                className={`w-9 h-9 border-none ${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'} rounded-full ${
                  darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'
                } cursor-pointer flex items-center justify-center hover:bg-red-500 hover:text-white transition-all flex-shrink-0`}
                onClick={() => setViewingPatient(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-4 sm:px-7 py-6 overflow-y-auto flex flex-col gap-4">
              {viewingPatient.visits.length === 0 && (
                <p
                  className={`m-0 text-[15px] font-poppins italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  No medical history recorded for this patient yet.
                </p>
              )}
              {viewingPatient.visits.map((v) => (
                <VisitCard
                  key={v.id}
                  v={v}
                  darkMode={darkMode}
                  onViewItr={setItrRecord}
                />
              ))}
            </div>

            <div
              className={`flex justify-end gap-3 mt-auto px-4 sm:px-7 py-4 border-t ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'}`}
            >
              <button
                onClick={() => setViewingPatient(null)}
                className={`px-6 py-3 rounded-lg text-[15px] font-bold font-poppins cursor-pointer border transition-all ${
                  darkMode
                    ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:bg-[#0f1438]'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ITR viewer — printed template layout, with print / zoom controls. */}
      {itrRecord && (
        <ItrViewerModal
          record={itrRecord}
          darkMode={darkMode}
          onClose={() => setItrRecord(null)}
        />
      )}
    </div>
  )
}
