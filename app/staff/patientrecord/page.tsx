'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { useDarkMode } from '@/app/staff/DarkModeContext'
import { puroks, emptyForm, emptyImmunization, emptyMedical, requiredFields, initialRecords, type PatientRecord } from '@/src/data/staffPatientRecords'

const RECORDS_PER_PAGE = 10

export default function PatientRecordPage() {
  const { darkMode } = useDarkMode()
  const [patientRecords, setPatientRecords] = useState<PatientRecord[]>(initialRecords)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingPatient, setViewingPatient] = useState<PatientRecord | null>(null)
  const [showArchive, setShowArchive] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<{ name: string; id: string } | null>(null)
  const [deceasedPrompt, setDeceasedPrompt] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({ ...emptyForm })
  const [immunizationRecords, setImmunizationRecords] = useState<Record<string, string>[]>([])
  const [medicalRecords, setMedicalRecords] = useState<Record<string, string>[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [purokFilter, setPurokFilter] = useState('All Puroks')
  const [searchQuery, setSearchQuery] = useState('')

  const getInputClass = (field: string) => {
    const hasError = errors[field]
    const borderColor = hasError ? 'border-red-500' : (darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200')
    return `w-full px-3 py-2.5 ${borderColor} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] ${darkMode ? 'placeholder-gray-500' : 'placeholder-gray-400'} box-border`
  }

  const getSelectClass = (field: string) => {
    const hasError = errors[field]
    const borderColor = hasError ? 'border-red-500' : (darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200')
    return `w-full px-3 py-2.5 ${borderColor} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] appearance-none cursor-pointer box-border`
  }

  const getTextareaClass = (field: string) => {
    const hasError = errors[field]
    const borderColor = hasError ? 'border-red-500' : (darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200')
    return `w-full px-3 py-2.5 ${borderColor} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] ${darkMode ? 'placeholder-gray-500' : 'placeholder-gray-400'} resize-y box-border`
  }

  useEffect(() => {
    if (formData.birthdate) {
      const birth = new Date(formData.birthdate)
      const today2 = new Date()
      let age = today2.getFullYear() - birth.getFullYear()
      const m = today2.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && today2.getDate() < birth.getDate())) age--
      setFormData(prev => ({ ...prev, age: isNaN(age) ? '' : String(age) }))
    }
  }, [formData.birthdate])

  useEffect(() => {
    const anyModalOpen = showModal || viewingPatient !== null || deceasedPrompt || showArchive
    document.body.style.overflow = anyModalOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showModal, viewingPatient, deceasedPrompt, showArchive])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const resetForm = () => { setFormData({ ...emptyForm }); setImmunizationRecords([]); setMedicalRecords([]); setEditingId(null); setErrors({}) }

  const openEditModal = (record: PatientRecord) => {
    setFormData({ ...record.form })
    setImmunizationRecords(record.immunizationRecords ? [...record.immunizationRecords] : [])
    setMedicalRecords(record.medicalRecords ? [...record.medicalRecords] : [])
    setEditingId(record.id)
    setErrors({})
    setShowModal(true)
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    for (const field of requiredFields) {
      if (!formData[field]?.trim()) {
        newErrors[field] = 'The field is required'
      }
    }
    return newErrors
  }

  const handleSave = () => {
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      toast.error('Please fill in all required fields')
      return
    }
    if (editingId) {
      setPatientRecords(prev => prev.map(r => r.id === editingId ? { ...r, form: { ...formData }, immunizationRecords: [...immunizationRecords], medicalRecords: [...medicalRecords] } : r))
      toast.success('Patient record updated successfully')
    } else {
      const newId = 'PTN-' + String(Date.now()).slice(-7)
      setCurrentPage(1)
      setPatientRecords(prev => [...prev, { id: newId, purok: '', date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-'), deceased: false, form: { ...formData }, immunizationRecords: [...immunizationRecords], medicalRecords: [...medicalRecords] }])
      toast.success('New patient record added successfully')
    }
    setErrors({})
    setShowModal(false)
    resetForm()
  }

  const handleConfirmDeceased = () => {
    if (!viewingPatient) return
    setPatientRecords(prev => prev.map(r => r.id === viewingPatient.id ? { ...r, deceased: true, deceasedDate: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-') } : r))
    setDeceasedPrompt(false)
    setViewingPatient(null)
    toast.success('Patient marked as deceased')
  }

  const handlePrint = () => {
    window.print()
  }

  const formatName = (r: PatientRecord) => {
    const f = r.form
    const last = f.lastName || ''
    const given = f.givenName || ''
    const mid = f.middleName ? ' ' + f.middleName.charAt(0) + '.' : ''
    return last + ', ' + given + mid
  }

  const activeRecords = patientRecords.filter(r => !r.deceased && (purokFilter === 'All Puroks' || r.purok === purokFilter))
  const q = searchQuery.trim().toLowerCase()
  const qDigits = q.replace(/\D/g, '')
  const allPatients = activeRecords
    .map(r => {
      const name = formatName(r)
      const id = r.id.toLowerCase()
      const idDigits = id.replace(/\D/g, '')
      let score = -1
      if (q === '') score = 0
      else if (name.toLowerCase().includes(q)) score = 1
      else if (id === q || (qDigits && idDigits === qDigits)) score = 2
      else if (qDigits && idDigits.startsWith(qDigits)) score = 3
      else if (id.includes(q) || (qDigits && idDigits.includes(qDigits))) score = 4
      return { name, id: r.id, purok: r.purok, date: r.date, score }
    })
    .filter(p => p.score >= 0)
    .sort((a, b) => a.score - b.score || a.id.localeCompare(b.id))
    .map(({ score, ...p }) => p)

  const totalPages = Math.max(1, Math.ceil(allPatients.length / RECORDS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const patients = allPatients.slice((safePage - 1) * RECORDS_PER_PAGE, safePage * RECORDS_PER_PAGE)
  const firstShown = allPatients.length === 0 ? 0 : (safePage - 1) * RECORDS_PER_PAGE + 1
  const lastShown = (safePage - 1) * RECORDS_PER_PAGE + patients.length

  const pageBtnClass = `min-w-[40px] h-[40px] px-2.5 rounded-lg text-[15px] font-semibold font-poppins cursor-pointer border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:border-[#4E69D3]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#4E69D3] hover:text-[#4E69D3]'}`
  const pageBtnActiveClass = 'bg-[#4E69D3] text-white border-[#4E69D3] hover:bg-[#4A6BC4] hover:text-white'

  return (
    <div className={`${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]`}>
      <h1 className={`font-poppins text-[28px] sm:text-[37px] font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-center m-0 mb-6`}>PATIENT RECORD LIST</h1>

      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 mb-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:contents">
          <div className="relative flex items-center">
            <svg className={`absolute left-3 w-4 h-4 ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-400'} pointer-events-none`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input type="text" placeholder="Search by patient name or ID" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }} className={`w-full sm:w-[360px] pl-10 pr-3.5 py-3.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[18px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] ${darkMode ? 'placeholder-gray-500' : 'placeholder-gray-400'}`} />
          </div>
          <div className="flex items-center justify-between sm:justify-start gap-2.5 lg:contents">
            <div className="relative flex items-center ml-0 sm:ml-13 flex-1 sm:flex-none">
              <select value={purokFilter} onChange={e => { setPurokFilter(e.target.value); setCurrentPage(1) }} className={`w-full sm:w-auto py-2.5 pl-3 pr-9 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[18px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] appearance-none cursor-pointer min-w-[120px]`}>
                <option>All Puroks</option>
                {puroks.map(p => <option key={p}>{p}</option>)}
              </select>
              <svg className={`absolute right-2.5 w-3.5 h-3.5 ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-400'} pointer-events-none`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <button className={`inline-flex items-center justify-center gap-1.5 w-10 h-10 sm:w-auto sm:h-auto sm:px-[18px] sm:py-2.5 border rounded-lg text-[15px] font-semibold font-poppins cursor-pointer transition-colors lg:ml-auto ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)]' : 'bg-white text-[#4E69D3] border-[#4E69D3]'} hover:bg-[#E8EAF6]`} onClick={() => setShowArchive(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H3l7 8v7l4 2v-9l7-8z"/></svg>
              <span className="hidden sm:inline">Records Archive</span>
            </button>
            <button className="inline-flex items-center justify-center gap-1.5 w-10 h-10 sm:w-auto sm:h-auto sm:px-[18px] sm:py-2.5 bg-[#4E69D3] text-white border-none rounded-lg text-[15px] font-semibold font-poppins cursor-pointer hover:bg-[#4A6BC4] transition-colors" onClick={() => { resetForm(); setShowModal(true) }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
              <span className="hidden sm:inline">Add Patient</span>
            </button>
          </div>
        </div>
      </div>

      <div className="sm:hidden">
        <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2.5 ${darkMode ? 'bg-[#0f1438]' : 'bg-[#ddd6fe]'} border-b ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'}`}>
          <span className={`text-[12px] font-bold uppercase tracking-[0.5px] font-poppins ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Name</span>
          <span className={`text-[12px] font-bold uppercase tracking-[0.5px] font-poppins justify-self-center ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>ID</span>
          <span className={`text-[12px] font-bold uppercase tracking-[0.5px] font-poppins justify-self-end ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Actions</span>
        </div>
        {patients.map(p => (
          <div key={p.id} className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3 cursor-pointer ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b ${darkMode ? 'hover:bg-[#0f1438]' : 'hover:bg-[#E8EAF6]'} ${selectedPatient?.id === p.id ? `${darkMode ? 'bg-[#0f1438]' : 'bg-[#E8EAF6]'} outline outline-2 outline-offset-[-2px] outline-[#4E69D3]` : ''}`} onClick={() => setSelectedPatient(p)}>
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-9 h-9 rounded-full flex-shrink-0 ${darkMode ? 'bg-[#0f1438] text-blue-300' : 'bg-[#E8EAF6] text-[#4E69D3]'} flex items-center justify-center font-bold text-sm`}>{p.name.charAt(0)}</div>
              <div className={`text-[18px] break-words leading-snug min-w-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{p.name}</div>
            </div>
            <span className={`text-[12px] font-bold justify-self-center ${darkMode ? 'text-[#F9FAFB]' : 'text-[#4E69D3]'}`}>{p.id}</span>
            <div className="flex items-center gap-1.5 flex-shrink-0 justify-self-end">
                <button className={`inline-flex items-center justify-center gap-1.5 w-10 h-10 rounded-lg flex-shrink-0 cursor-pointer ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} text-[#4E69D3] ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#4E69D3]'} border ${darkMode ? 'hover:bg-[#0f1438]' : 'hover:bg-[#E8EAF6]'} transition-all`} onClick={(e) => { e.stopPropagation(); const record = patientRecords.find(r => r.id === p.id); if (record) setViewingPatient(record) }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button className={`inline-flex items-center justify-center gap-1.5 w-10 h-10 rounded-lg flex-shrink-0 cursor-pointer ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} text-[#4E69D3] ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#4E69D3]'} border ${darkMode ? 'hover:bg-[#0f1438]' : 'hover:bg-[#E8EAF6]'} transition-all`} onClick={(e) => { e.stopPropagation(); const record = patientRecords.find(r => r.id === p.id); if (record) openEditModal(record) }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </div>
            </div>
        ))}
      </div>

      <div className={`hidden sm:block overflow-x-auto ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-xl`}>
        <table className="w-full border-collapse text-[18px] sm:min-w-[820px]" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className={`${darkMode ? 'bg-[#0f1438]' : 'bg-[#ddd6fe]'}`}>
              <th className={`px-6 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[18px] uppercase tracking-[0.5px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[25%] max-sm:w-[44%]`}>Name</th>
              <th className={`px-6 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[18px] uppercase tracking-[0.5px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[18%]`}>ID</th>
              <th className={`px-6 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[18px] uppercase tracking-[0.5px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[18%] hidden sm:table-cell`}>Purok</th>
              <th className={`px-6 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[18px] uppercase tracking-[0.5px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[18%] hidden sm:table-cell`}>Date Recorded</th>
              <th className={`px-6 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[18px] uppercase tracking-[0.5px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[21%] max-sm:w-[17%]`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {patients.map(p => (
              <tr key={p.id} className={`cursor-pointer ${darkMode ? 'hover:bg-[#0f1438]' : 'hover:bg-[#E8EAF6]'} ${selectedPatient?.id === p.id ? `${darkMode ? 'bg-[#0f1438]' : 'bg-[#E8EAF6]'} outline outline-2 outline-offset-[-2px] outline-[#4E69D3]` : ''}`} onClick={() => setSelectedPatient(p)}>
                <td className={`px-6 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-9 h-9 rounded-full ${darkMode ? 'bg-[#0f1438] text-blue-300' : 'bg-[#E8EAF6] text-[#4E69D3]'} flex items-center justify-center font-bold text-sm flex-shrink-0`}>{p.name.charAt(0)}</div>
                    <span className="text-[18px] flex-1 min-w-0 whitespace-normal break-words sm:whitespace-nowrap sm:truncate" title={p.name}>{p.name}</span>
                  </div>
                </td>
                <td className={`px-6 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b text-[18px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{p.id}</td>
                <td className={`px-6 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b text-[18px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} hidden sm:table-cell`}>{p.purok}</td>
                <td className={`px-6 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b text-[18px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} hidden sm:table-cell`}>{p.date}</td>
                <td className={`px-6 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button className={`inline-flex items-center justify-center gap-1.5 w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 rounded-lg text-[15px] font-semibold font-poppins cursor-pointer ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} text-[#4E69D3] ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#4E69D3]'} border ${darkMode ? 'hover:bg-[#0f1438]' : 'hover:bg-[#E8EAF6]'} transition-all`} onClick={(e) => { e.stopPropagation(); const record = patientRecords.find(r => r.id === p.id); if (record) setViewingPatient(record) }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      <span className="hidden sm:inline">View</span>
                    </button>
                    <button className={`inline-flex items-center justify-center gap-1.5 w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 rounded-lg text-[15px] font-semibold font-poppins cursor-pointer ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} text-[#4E69D3] ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#4E69D3]'} border ${darkMode ? 'hover:bg-[#0f1438]' : 'hover:bg-[#E8EAF6]'} transition-all`} onClick={(e) => { e.stopPropagation(); const record = patientRecords.find(r => r.id === p.id); if (record) openEditModal(record) }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center gap-3 pt-4 pb-1 flex-wrap">
        <span className={`text-[13px] ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-400'}`}>Showing {firstShown}-{lastShown} of {allPatients.length} active records</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button className={pageBtnClass} disabled={safePage === 1} onClick={() => setCurrentPage(safePage - 1)}>&lsaquo; Prev</button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                className={`${pageBtnClass}${safePage === i + 1 ? ' ' + pageBtnActiveClass : ''}`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button className={pageBtnClass} disabled={safePage === totalPages} onClick={() => setCurrentPage(safePage + 1)}>Next &rsaquo;</button>
          </div>
        )}
      </div>

      {showArchive && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-start z-[1000] p-3 sm:p-4 lg:p-10 overflow-y-auto">
          <div className={`${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-2xl w-full max-w-[1400px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex flex-col`} onClick={e => e.stopPropagation()}>
            <div className={`flex justify-between items-center px-4 sm:px-8 py-4 sm:py-5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} border-b sticky top-0 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-t-2xl z-10`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${darkMode ? 'bg-[#0f1438]' : 'bg-[#E8EAF6]'} flex items-center justify-center`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4E69D3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H3l7 8v7l4 2v-9l7-8z"/></svg>
                </div>
                <div>
                  <h2 className={`font-poppins text-xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0`}>Records Archive</h2>
                  <p className={`text-[12px] m-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{patientRecords.filter(r => r.deceased).length} deceased record(s)</p>
                </div>
              </div>
              <button className={`w-9 h-9 border-none ${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'} rounded-full text-xl ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'} cursor-pointer flex items-center justify-center hover:bg-red-500 hover:text-white transition-all`} onClick={() => setShowArchive(false)}>&times;</button>
            </div>
            <div className="px-4 sm:px-8 py-4 sm:py-6">
              {(() => {
                const deceased = patientRecords.filter(r => r.deceased)
                if (deceased.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-16">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={darkMode ? '#6B7280' : '#9CA3AF'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H3l7 8v7l4 2v-9l7-8z"/></svg>
                      <p className={`mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No deceased patient records found.</p>
                    </div>
                  )
                }
                return (
                  <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[18px] min-w-[700px]" style={{ tableLayout: 'fixed' }}>
                    <thead>
                      <tr className={`${darkMode ? 'bg-[#0f1438]' : 'bg-[#ddd6fe]'}`}>
                        <th className={`px-4 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[18px] uppercase tracking-[0.5px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[32%]`}>Name</th>
                        <th className={`pl-1 pr-4 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[18px] uppercase tracking-[0.5px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[18%]`}>ID</th>
                        <th className={`px-4 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[18px] uppercase tracking-[0.5px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[15%]`}>Purok</th>
                        <th className={`px-4 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[18px] uppercase tracking-[0.5px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[15%]`}>Deceased Date</th>
                        <th className={`px-4 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[18px] uppercase tracking-[0.5px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[20%]`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deceased.map(r => {
                        const name = formatName(r)
                        return (
                          <tr key={r.id} className={`${darkMode ? 'hover:bg-[#0f1438]' : 'hover:bg-[#E8EAF6]'} cursor-pointer`} onClick={() => setViewingPatient(r)}>
                            <td className={`px-4 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-9 h-9 rounded-full ${darkMode ? 'bg-[#0f1438] text-blue-300' : 'bg-[#E8EAF6] text-[#4E69D3]'} flex items-center justify-center font-bold text-sm flex-shrink-0`}>{name.charAt(0)}</div>
                                <span className="text-[18px] flex-1 min-w-0 truncate" title={name}>{name}</span>
                              </div>
                            </td>
                            <td className={`pl-1 pr-4 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b text-[18px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{r.id}</td>
                            <td className={`px-4 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b text-[18px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{r.purok}</td>
                            <td className={`px-4 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b text-[18px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{r.deceasedDate || '-'}</td>
                            <td className={`px-4 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b`}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <button className={`inline-flex items-center justify-center gap-1.5 w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 rounded-lg text-[15px] font-semibold font-poppins cursor-pointer ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} text-[#4E69D3] ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#4E69D3]'} border ${darkMode ? 'hover:bg-[#0f1438]' : 'hover:bg-[#E8EAF6]'} transition-all`} onClick={(e) => { e.stopPropagation(); setViewingPatient(r) }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                  <span className="hidden sm:inline">View</span>
                                </button>
                                <button className={`inline-flex items-center justify-center gap-1.5 w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 rounded-lg text-[15px] font-semibold font-poppins cursor-pointer ${darkMode ? 'bg-[#2d1b4e] text-green-400 border-[rgba(255,255,255,0.10)]' : 'bg-white text-green-600 border-green-300'} border hover:bg-green-50 transition-all`} onClick={(e) => { e.stopPropagation(); setPatientRecords(prev => prev.map(pr => pr.id === r.id ? { ...pr, deceased: false, deceasedDate: undefined } : pr)); setSelectedPatient(null); toast.success('Patient restored from archive') }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-9-9"/><path d="M21 3v6h-6"/></svg>
                                  <span className="hidden sm:inline">Restore</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  </div>
                )
              })()}
            </div>
            <div className={`flex justify-end gap-3 px-4 sm:px-8 py-4 border-t ${darkMode ? 'border-[rgba(255,255,255,0.06)]' : 'border-gray-100'} sticky bottom-0 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-b-2xl`}>
              <button className={`px-5 py-2 rounded-lg border-none text-[15px] font-semibold cursor-pointer transition-all ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] hover:bg-[#1a2050]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} onClick={() => setShowArchive(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {viewingPatient && createPortal((
        <>
        <style>{'@media print { body > *:not(#patient-record-print) { display: none !important; } }'}</style>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] print:hidden" onClick={() => setViewingPatient(null)} />
        <div id="patient-record-print" className="fixed inset-0 z-[1001] flex justify-center items-start p-3 sm:p-4 lg:p-10 overflow-y-auto print:static print:z-auto print:p-0 print:overflow-visible print:inset-auto" onClick={() => setViewingPatient(null)}>
          <div className={`${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-2xl w-full max-w-[960px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex flex-col max-h-[90vh] relative overflow-hidden print:[&_*]:!bg-white print:[&_*]:!text-[#2A2E43] print:[&_*]:!border-[#e5e7eb] print:max-h-none print:rounded-none print:shadow-none print:max-w-none`} onClick={e => e.stopPropagation()}>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none select-none opacity-20 z-0 print:hidden">
              <div className="w-[300px] h-[300px] flex-shrink-0">
                <img src="/meditrack-logo.png" alt="MediTrack" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col items-center gap-0">
                <h1 className={`font-bebas text-[100px] leading-none m-0 whitespace-nowrap ${darkMode ? 'text-[#F9FAFB]' : 'text-[#0F588B]'}`}>MEDITRACK</h1>
                <p className={`w-full font-asap text-[34px] tracking-[3px] leading-none m-0 -mt-3 text-justify [text-align-last:justify] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#0F588B]'}`}>Stay On Track With Us</p>
              </div>
            </div>
            <div className={`flex justify-between items-center px-4 sm:px-7 py-4 sm:py-5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} border-b sticky top-0 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-t-2xl z-10 print:static print:hidden`}>
              <h2 className={`font-poppins text-2xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0`}>Patient Record &mdash; {viewingPatient.id}</h2>
              <button className={`w-9 h-9 border-none ${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'} rounded-full text-xl ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'} cursor-pointer flex items-center justify-center hover:bg-red-500 hover:text-white transition-all flex-shrink-0 print:hidden`} onClick={() => setViewingPatient(null)}>&times;</button>
            </div>
            <div className="px-4 sm:px-7 py-6 overflow-y-auto flex-1 max-h-[72vh] relative z-10 print:max-h-none print:overflow-visible">
              <div className="hidden print:flex flex-col items-center mb-8">
                <div className="w-16 h-16">
                  <img src="/meditrack-logo.png" alt="MediTrack" className="w-full h-full object-contain" />
                </div>
                <h1 className="font-bebas text-[30px] leading-none m-0">MEDITRACK</h1>
                <p className="font-asap text-[13px] tracking-[3px] leading-none m-0 mt-1">Stay On Track With Us</p>
                <h2 className="text-[20px] font-bold m-0 mt-5 pb-1 border-b-[3px] border-[#4E69D3]">Patient Record</h2>
                <p className="text-[13px] m-0 mt-2">{viewingPatient.id} &middot; {viewingPatient.deceased ? 'Deceased' : 'Active'}</p>
              </div>
              <div className="relative">
              <ViewSection darkMode={darkMode} title="Personal Information" fields={[['Name', (viewingPatient.form.lastName || '') + ', ' + (viewingPatient.form.givenName || '') + ' ' + (viewingPatient.form.middleName || '')], ['Suffix', viewingPatient.form.suffix || 'N/A'], ['Maiden Name', viewingPatient.form.maidenName || 'N/A'], ['Sex', viewingPatient.form.sex || ''], ['Blood Type', viewingPatient.form.bloodType || ''], ['Birthdate', viewingPatient.form.birthdate || ''], ['Age', viewingPatient.form.age || ''], ['Place of Birth', viewingPatient.form.placeOfBirth || 'N/A'], ['Civil Status', viewingPatient.form.civilStatus || 'N/A'], ['Religion', viewingPatient.form.religion || 'N/A'], ['Contact', viewingPatient.form.contactNumber || 'N/A']]} />
              <ViewSection darkMode={darkMode} title="Father's Name" fields={[['Name', (viewingPatient.form.fatherLastName || 'N/A') + ', ' + (viewingPatient.form.fatherGivenName || '') + ' ' + (viewingPatient.form.fatherMiddleName || '')]]} />
              <ViewSection darkMode={darkMode} title="Mother's Maiden Name" fields={[['Name', (viewingPatient.form.motherLastName || 'N/A') + ', ' + (viewingPatient.form.motherGivenName || '') + ' ' + (viewingPatient.form.motherMiddleName || '')]]} />
              <ViewSection darkMode={darkMode} title="Address" fields={[['Region', viewingPatient.form.region || 'N/A'], ['Province', viewingPatient.form.province || 'N/A'], ['City / Municipality', viewingPatient.form.city || 'N/A'], ['Barangay', viewingPatient.form.barangay || 'N/A'], ['Street / Purok', viewingPatient.form.street || 'N/A'], ['Postal Code', viewingPatient.form.postalCode || 'N/A']]} />
              <ViewSection darkMode={darkMode} title="PhilHealth Information" fields={[['PhilHealth No.', viewingPatient.form.philHealthNo || 'N/A'], ['Member Name', viewingPatient.form.memberName || 'N/A'], ['Spouse', viewingPatient.form.spouseName || 'N/A'], ['Member Birthdate', viewingPatient.form.memberBirthdate || 'N/A'], ['Residential Address', viewingPatient.form.completeAddress || 'N/A'], ['Member Dependent', viewingPatient.form.memberDependent || 'N/A'], ['Family Role', viewingPatient.form.familyMemberRole || 'N/A'], ['Education', viewingPatient.form.educationalAttainment || 'N/A']]} />
              <ViewSubRecords darkMode={darkMode} title="Immunization Records" records={viewingPatient.immunizationRecords} fields={[['BCG', 'bcg'], ['HEPA B (24h)', 'hepaB24'], ['HEPA B (<24h)', 'hepaBLess24'], ['PENTAVALENT 1', 'pentavalent1'], ['MCV 1 (AMV)', 'mcv1'], ['OPV 1', 'opv1'], ['ROTA 1', 'rota1'], ['PCV 1', 'pcv1'], ['HEPA B2', 'hepaB2'], ['PNEUMONIA', 'pneumonia'], ['INFLUENZA', 'influenza']]} />
              <ViewSubRecords darkMode={darkMode} title="Medical Records" records={viewingPatient.medicalRecords} fields={[['Date', 'date'], ['BP', 'bp'], ['HR', 'hr'], ['RR', 'rr'], ['Weight', 'weight'], ['Height', 'height'], ['Temperature', 'temperature']]} />
              <ViewTextSection darkMode={darkMode} title="Chief Complaints" content={viewingPatient.form.chiefComplaints} />
              <ViewTextSection darkMode={darkMode} title="Diagnosis" content={viewingPatient.form.diagnosis} />
              <ViewTextSection darkMode={darkMode} title="Medications / Treatment" content={viewingPatient.form.medications} />
              </div>
            </div>
            <div className={`flex justify-between gap-3 px-4 sm:px-7 py-4.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} border-t sticky bottom-0 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-b-2xl relative z-10 print:hidden`}>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-2 px-6 py-3 border-none rounded-lg bg-[#c4b5fd] text-gray-800 text-[15px] font-bold font-poppins cursor-pointer hover:bg-[#a78bfa] transition-colors" onClick={handlePrint}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Print PDF
                </button>
                {!viewingPatient.deceased && (
                  <button className={`inline-flex items-center gap-2 px-6 py-3 border rounded-lg text-[15px] font-bold font-poppins cursor-pointer transition-colors ${darkMode ? 'bg-[#2d1b4e] text-red-400 border-[rgba(255,255,255,0.10)] hover:bg-[#0f1438]' : 'bg-white text-red-500 border-red-300 hover:bg-red-50'}`} onClick={() => setDeceasedPrompt(true)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    Mark as Deceased
                  </button>
                )}
              </div>
              <button className={`px-6 py-3 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'} text-[15px] font-semibold font-poppins cursor-pointer ${darkMode ? 'hover:text-[#F9FAFB]' : 'hover:text-gray-800'} transition-colors`} onClick={() => setViewingPatient(null)}>Close</button>
            </div>
          </div>
        </div>
        </>
      ), document.body)}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-start z-[1000] p-3 sm:p-4 lg:p-10 overflow-y-auto">
          <div className={`${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-2xl w-full max-w-[960px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex flex-col max-h-[90vh]`} onClick={e => e.stopPropagation()}>
            <div className={`flex justify-between items-center px-4 sm:px-7 py-4 sm:py-5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} border-b sticky top-0 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-t-2xl z-10`}>
              <h2 className={`font-poppins text-2xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0`}>{editingId ? 'Edit Record \u2014 ' + editingId : 'Add Patient Record'}</h2>
              <button className={`w-9 h-9 border-none ${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'} rounded-full text-xl ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'} cursor-pointer flex items-center justify-center hover:bg-red-500 hover:text-white transition-all`} onClick={() => { setShowModal(false); resetForm() }}>&times;</button>
            </div>
            <div className="px-4 sm:px-7 py-6 overflow-y-auto flex-1">
              <FormSection darkMode={darkMode} title="Personal Information">
                <div className="grid grid-cols-3 gap-3.5 mb-3.5 max-[768px]:grid-cols-1">
                  <FormGroup darkMode={darkMode} label="Last Name" required error={errors.lastName}><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={getInputClass('lastName')} /></FormGroup>
                  <FormGroup darkMode={darkMode} label="Given Name" required error={errors.givenName}><input type="text" name="givenName" value={formData.givenName} onChange={handleChange} className={getInputClass('givenName')} /></FormGroup>
                  <FormGroup darkMode={darkMode} label="Middle Name" required error={errors.middleName}><input type="text" name="middleName" value={formData.middleName} onChange={handleChange} className={getInputClass('middleName')} /></FormGroup>
                </div>
                <div className="grid grid-cols-3 gap-3.5 mb-3.5 max-[768px]:grid-cols-1">
                  <FormGroup darkMode={darkMode} label="Suffix"><input type="text" name="suffix" value={formData.suffix} onChange={handleChange} placeholder="e.g. Jr., Sr., III" className={getInputClass('suffix')} /></FormGroup>
                  <FormGroup darkMode={darkMode} label="Maiden Name" note="(For Married Woman)"><input type="text" name="maidenName" value={formData.maidenName} onChange={handleChange} className={getInputClass('maidenName')} /></FormGroup>
                  <FormGroup darkMode={darkMode} label="Sex" required error={errors.sex}>
                    <select name="sex" value={formData.sex} onChange={handleChange} className={getSelectClass('sex')}>
                      <option value="">-- Select --</option><option value="Male">Male</option><option value="Female">Female</option>
                    </select>
                  </FormGroup>
                </div>
                <div className="grid grid-cols-3 gap-3.5 mb-3.5 max-[768px]:grid-cols-1">
                  <FormGroup darkMode={darkMode} label="Blood Type" required error={errors.bloodType}>
                    <select name="bloodType" value={formData.bloodType} onChange={handleChange} className={getSelectClass('bloodType')}>
                      <option value="">-- Select --</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup darkMode={darkMode} label="Birthdate" required error={errors.birthdate}><input type="date" name="birthdate" value={formData.birthdate} onChange={handleChange} className={getInputClass('birthdate')} /></FormGroup>
                  <FormGroup darkMode={darkMode} label="Age" required error={errors.age}><input type="text" name="age" value={formData.age} readOnly className={`w-full px-3 py-2.5 ${errors.age ? 'border-red-500' : (darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200')} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-gray-400' : 'text-gray-500'} ${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'} outline-none cursor-not-allowed box-border`} /></FormGroup>
                </div>
                <div className="grid grid-cols-3 gap-3.5 mb-3.5 max-[768px]:grid-cols-1">
                  <FormGroup darkMode={darkMode} label="Place of Birth"><input type="text" name="placeOfBirth" value={formData.placeOfBirth} onChange={handleChange} className={getInputClass('placeOfBirth')} /></FormGroup>
                  <FormGroup darkMode={darkMode} label="Civil Status">
                    <select name="civilStatus" value={formData.civilStatus} onChange={handleChange} className={getSelectClass('civilStatus')}>
                      <option value="">-- Select --</option>
                      {['Single','Married','Divorced','Widowed','Separated'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup darkMode={darkMode} label="Religion">
                    <select name="religion" value={formData.religion} onChange={handleChange} className={getSelectClass('religion')}>
                      <option value="">-- Select --</option>
                      {['Roman Catholic','Islam','Iglesia Ni Cristo','Born Again','Seventh-day Adventist','Bible Baptist',"Jehovah's Witnesses",'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </FormGroup>
                </div>
                <div className="grid grid-cols-3 gap-3.5 max-[768px]:grid-cols-1">
                  <FormGroup darkMode={darkMode} label="Contact Number"><input type="text" name="contactNumber" value={formData.contactNumber} onChange={handleChange} placeholder="09XXXXXXXXX" className={getInputClass('contactNumber')} /></FormGroup>
                </div>
              </FormSection>

              <FormSection darkMode={darkMode} title="Father's Name">
                <div className="grid grid-cols-3 gap-3.5 mb-3.5 max-[768px]:grid-cols-1">
                  <FormGroup darkMode={darkMode} label="Last Name" required error={errors.fatherLastName}><input type="text" name="fatherLastName" value={formData.fatherLastName} onChange={handleChange} className={getInputClass('fatherLastName')} /></FormGroup>
                  <FormGroup darkMode={darkMode} label="Given Name" required error={errors.fatherGivenName}><input type="text" name="fatherGivenName" value={formData.fatherGivenName} onChange={handleChange} className={getInputClass('fatherGivenName')} /></FormGroup>
                  <FormGroup darkMode={darkMode} label="Middle Name" required error={errors.fatherMiddleName}><input type="text" name="fatherMiddleName" value={formData.fatherMiddleName} onChange={handleChange} className={getInputClass('fatherMiddleName')} /></FormGroup>
                </div>
              </FormSection>

              <FormSection darkMode={darkMode} title="Mother's Maiden Name">
                <div className="grid grid-cols-3 gap-3.5 mb-3.5 max-[768px]:grid-cols-1">
                  <FormGroup darkMode={darkMode} label="Last Name" required error={errors.motherLastName}><input type="text" name="motherLastName" value={formData.motherLastName} onChange={handleChange} className={getInputClass('motherLastName')} /></FormGroup>
                  <FormGroup darkMode={darkMode} label="Given Name" required error={errors.motherGivenName}><input type="text" name="motherGivenName" value={formData.motherGivenName} onChange={handleChange} className={getInputClass('motherGivenName')} /></FormGroup>
                  <FormGroup darkMode={darkMode} label="Middle Name" required error={errors.motherMiddleName}><input type="text" name="motherMiddleName" value={formData.motherMiddleName} onChange={handleChange} className={getInputClass('motherMiddleName')} /></FormGroup>
                </div>
              </FormSection>

              <FormSection darkMode={darkMode} title="Address">
                <div className="grid grid-cols-3 gap-3.5 mb-3.5 max-[768px]:grid-cols-1">
                  <FormGroup darkMode={darkMode} label="Region"><input type="text" name="region" value={formData.region} onChange={handleChange} className={getInputClass('region')} /></FormGroup>
                  <FormGroup darkMode={darkMode} label="Province"><input type="text" name="province" value={formData.province} onChange={handleChange} className={getInputClass('province')} /></FormGroup>
                  <FormGroup darkMode={darkMode} label="City / Municipality"><input type="text" name="city" value={formData.city} onChange={handleChange} className={getInputClass('city')} /></FormGroup>
                </div>
                <div className="grid grid-cols-3 gap-3.5 max-[768px]:grid-cols-1">
                  <FormGroup darkMode={darkMode} label="Barangay"><input type="text" name="barangay" value={formData.barangay} onChange={handleChange} className={getInputClass('barangay')} /></FormGroup>
                  <FormGroup darkMode={darkMode} label="Street / Purok">
                    <select name="street" value={formData.street} onChange={handleChange} className={getSelectClass('street')}>
                      <option value="">-- Select Purok --</option>
                      {puroks.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup darkMode={darkMode} label="Postal Code"><input type="text" name="postalCode" value={formData.postalCode} onChange={handleChange} className={getInputClass('postalCode')} /></FormGroup>
                </div>
              </FormSection>

              <FormSection darkMode={darkMode} title="PhilHealth Information">
                <div className="grid grid-cols-3 gap-3.5 mb-3.5 max-[768px]:grid-cols-1">
                  <FormGroup darkMode={darkMode} label="PhilHealth Number" required error={errors.philHealthNo}><input type="text" name="philHealthNo" value={formData.philHealthNo} onChange={handleChange} className={getInputClass('philHealthNo')} /></FormGroup>
                  <FormGroup darkMode={darkMode} label="Member's Name" required error={errors.memberName}><input type="text" name="memberName" value={formData.memberName} onChange={handleChange} className={getInputClass('memberName')} /></FormGroup>
                  <FormGroup darkMode={darkMode} label="Name of Spouse" required error={errors.spouseName}><input type="text" name="spouseName" value={formData.spouseName} onChange={handleChange} className={getInputClass('spouseName')} /></FormGroup>
                </div>
                <div className="grid grid-cols-3 gap-3.5 mb-3.5 max-[768px]:grid-cols-1">
                  <FormGroup darkMode={darkMode} label="Member's Birthdate"><input type="date" name="memberBirthdate" value={formData.memberBirthdate} onChange={handleChange} className={getInputClass('memberBirthdate')} /></FormGroup>
                  <FormGroup darkMode={darkMode} label="Complete Residential Address" required error={errors.completeAddress}><input type="text" name="completeAddress" value={formData.completeAddress} onChange={handleChange} className={getInputClass('completeAddress')} /></FormGroup>
                  <FormGroup darkMode={darkMode} label="Member Dependent" required error={errors.memberDependent}>
                    <div className="flex gap-5 items-center h-full pt-1">
                      <label className={`flex items-center gap-1.5 text-[16px] font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-600'} cursor-pointer`}><input type="radio" name="memberDependent" value="Yes" checked={formData.memberDependent === 'Yes'} onChange={handleChange} className="w-auto m-0 cursor-pointer" /> Yes</label>
                      <label className={`flex items-center gap-1.5 text-[16px] font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-600'} cursor-pointer`}><input type="radio" name="memberDependent" value="No" checked={formData.memberDependent === 'No'} onChange={handleChange} className="w-auto m-0 cursor-pointer" /> No</label>
                    </div>
                  </FormGroup>
                </div>
                <div className="grid grid-cols-2 gap-3.5 max-[768px]:grid-cols-1">
                  <FormGroup darkMode={darkMode} label="Family Member Role">
                    <select name="familyMemberRole" value={formData.familyMemberRole} onChange={handleChange} className={getSelectClass('familyMemberRole')}>
                      <option value="">-- Select --</option>
                      {['Spouse','Child','Parent','Sibling','Other'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup darkMode={darkMode} label="Educational Attainment">
                    <select name="educationalAttainment" value={formData.educationalAttainment} onChange={handleChange} className={getSelectClass('educationalAttainment')}>
                      <option value="">-- Select --</option>
                      {['No Formal Education','Elementary Level','Elementary Graduate','High School Level','High School Graduate','College Level','College Graduate','Post Graduate','Vocational'].map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </FormGroup>
                </div>
              </FormSection>

              <div className={`mb-7 pb-6 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-100'} border-b last:border-none last:mb-0 last:pb-0`}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className={`font-poppins text-lg font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0 pb-2 border-b-2 border-[#4E69D3] inline-block`}>Immunization</h3>
                  <button type="button" className="px-4 py-2 border-none rounded-lg bg-[#4E69D3] text-white text-[15px] font-semibold font-poppins cursor-pointer hover:bg-[#4A6BC4] transition-colors" onClick={() => setImmunizationRecords(prev => [...prev, { ...emptyImmunization }])}>+ Add New Record</button>
                </div>
                {immunizationRecords.length === 0 && <p className={`text-[15px] ${darkMode ? 'text-gray-400' : 'text-gray-400'} italic py-2`}>No immunization records added yet.</p>}
                {immunizationRecords.map((rec, idx) => (
                  <div key={idx} className={`${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'} ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-xl p-[18px] mb-3.5`}>
                    <div className="flex justify-between items-center mb-3.5 text-[16px] font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}">
                      <span className={`${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Immunization Record #{idx + 1}</span>
                      <button type="button" className={`w-7 h-7 border-none ${darkMode ? 'bg-[#0f1438]' : 'bg-red-100'} ${darkMode ? 'text-red-400' : 'text-red-500'} rounded-full text-base cursor-pointer inline-flex items-center justify-center hover:bg-red-500 hover:text-white transition-all`} onClick={() => setImmunizationRecords(prev => prev.filter((_, i) => i !== idx))}>&times;</button>
                    </div>
                    <div className="grid grid-cols-3 gap-3.5 mb-3.5 max-[768px]:grid-cols-1">
                      <FormGroup darkMode={darkMode} label="BCG"><input type="date" value={rec.bcg} onChange={e => { const u = [...immunizationRecords]; u[idx] = { ...u[idx], bcg: e.target.value }; setImmunizationRecords(u) }} className={`w-full px-3 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] box-border`} /></FormGroup>
                      <FormGroup darkMode={darkMode} label="HEPA B WITHIN 24 HOURS"><input type="date" value={rec.hepaB24} onChange={e => { const u = [...immunizationRecords]; u[idx] = { ...u[idx], hepaB24: e.target.value }; setImmunizationRecords(u) }} className={`w-full px-3 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] box-border`} /></FormGroup>
                      <FormGroup darkMode={darkMode} label="HEPA B LESS THAN 24 HOURS"><input type="date" value={rec.hepaBLess24} onChange={e => { const u = [...immunizationRecords]; u[idx] = { ...u[idx], hepaBLess24: e.target.value }; setImmunizationRecords(u) }} className={`w-full px-3 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] box-border`} /></FormGroup>
                    </div>
                    <div className="grid grid-cols-3 gap-3.5 mb-3.5 max-[768px]:grid-cols-1">
                      <FormGroup darkMode={darkMode} label="PENTAVALENT 1"><input type="date" value={rec.pentavalent1} onChange={e => { const u = [...immunizationRecords]; u[idx] = { ...u[idx], pentavalent1: e.target.value }; setImmunizationRecords(u) }} className={`w-full px-3 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] box-border`} /></FormGroup>
                      <FormGroup darkMode={darkMode} label="MCV 1 (AMV)"><input type="date" value={rec.mcv1} onChange={e => { const u = [...immunizationRecords]; u[idx] = { ...u[idx], mcv1: e.target.value }; setImmunizationRecords(u) }} className={`w-full px-3 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] box-border`} /></FormGroup>
                      <FormGroup darkMode={darkMode} label="OPV 1"><input type="date" value={rec.opv1} onChange={e => { const u = [...immunizationRecords]; u[idx] = { ...u[idx], opv1: e.target.value }; setImmunizationRecords(u) }} className={`w-full px-3 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] box-border`} /></FormGroup>
                    </div>
                    <div className="grid grid-cols-3 gap-3.5 mb-3.5 max-[768px]:grid-cols-1">
                      <FormGroup darkMode={darkMode} label="ROTA 1"><input type="date" value={rec.rota1} onChange={e => { const u = [...immunizationRecords]; u[idx] = { ...u[idx], rota1: e.target.value }; setImmunizationRecords(u) }} className={`w-full px-3 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] box-border`} /></FormGroup>
                      <FormGroup darkMode={darkMode} label="PCV 1"><input type="date" value={rec.pcv1} onChange={e => { const u = [...immunizationRecords]; u[idx] = { ...u[idx], pcv1: e.target.value }; setImmunizationRecords(u) }} className={`w-full px-3 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] box-border`} /></FormGroup>
                      <FormGroup darkMode={darkMode} label="HEPA B2"><input type="date" value={rec.hepaB2} onChange={e => { const u = [...immunizationRecords]; u[idx] = { ...u[idx], hepaB2: e.target.value }; setImmunizationRecords(u) }} className={`w-full px-3 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] box-border`} /></FormGroup>
                    </div>
                    <div className="grid grid-cols-2 gap-3.5 max-[768px]:grid-cols-1">
                      <FormGroup darkMode={darkMode} label="PNEUMONIA"><input type="date" value={rec.pneumonia} onChange={e => { const u = [...immunizationRecords]; u[idx] = { ...u[idx], pneumonia: e.target.value }; setImmunizationRecords(u) }} className={`w-full px-3 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] box-border`} /></FormGroup>
                      <FormGroup darkMode={darkMode} label="INFLUENZA"><input type="date" value={rec.influenza} onChange={e => { const u = [...immunizationRecords]; u[idx] = { ...u[idx], influenza: e.target.value }; setImmunizationRecords(u) }} className={`w-full px-3 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] box-border`} /></FormGroup>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`mb-7 pb-6 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-100'} border-b last:border-none last:mb-0 last:pb-0`}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className={`font-poppins text-lg font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0 pb-2 border-b-2 border-[#4E69D3] inline-block`}>Medical Information</h3>
                  <button type="button" className="px-4 py-2 border-none rounded-lg bg-[#4E69D3] text-white text-[15px] font-semibold font-poppins cursor-pointer hover:bg-[#4A6BC4] transition-colors" onClick={() => setMedicalRecords(prev => [...prev, { ...emptyMedical }])}>+ Add New Record</button>
                </div>
                {medicalRecords.length === 0 && <p className={`text-[15px] ${darkMode ? 'text-gray-400' : 'text-gray-400'} italic py-2`}>No medical records added yet.</p>}
                {medicalRecords.map((rec, idx) => (
                  <div key={idx} className={`${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'} ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-xl p-[18px] mb-3.5`}>
                    <div className="flex justify-between items-center mb-3.5 text-[16px] font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}">
                      <span className={`${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Medical Record #{idx + 1}</span>
                      <button type="button" className={`w-7 h-7 border-none ${darkMode ? 'bg-[#0f1438]' : 'bg-red-100'} ${darkMode ? 'text-red-400' : 'text-red-500'} rounded-full text-base cursor-pointer inline-flex items-center justify-center hover:bg-red-500 hover:text-white transition-all`} onClick={() => setMedicalRecords(prev => prev.filter((_, i) => i !== idx))}>&times;</button>
                    </div>
                    <div className="grid grid-cols-3 gap-3.5 mb-3.5 max-[768px]:grid-cols-1">
                      <FormGroup darkMode={darkMode} label="Date"><input type="date" value={rec.date} onChange={e => { const u = [...medicalRecords]; u[idx] = { ...u[idx], date: e.target.value }; setMedicalRecords(u) }} className={`w-full px-3 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] box-border`} /></FormGroup>
                      <FormGroup darkMode={darkMode} label="Blood Pressure (BP)" required><input type="text" value={rec.bp} onChange={e => { const u = [...medicalRecords]; u[idx] = { ...u[idx], bp: e.target.value }; setMedicalRecords(u) }} placeholder="e.g. 120/80" className={`w-full px-3 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] ${darkMode ? 'placeholder-gray-500' : 'placeholder-gray-400'} box-border`} /></FormGroup>
                      <FormGroup darkMode={darkMode} label="Heart Rate (HR)" required><input type="text" value={rec.hr} onChange={e => { const u = [...medicalRecords]; u[idx] = { ...u[idx], hr: e.target.value }; setMedicalRecords(u) }} placeholder="bpm" className={`w-full px-3 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] ${darkMode ? 'placeholder-gray-500' : 'placeholder-gray-400'} box-border`} /></FormGroup>
                    </div>
                    <div className="grid grid-cols-3 gap-3.5 mb-3.5 max-[768px]:grid-cols-1">
                      <FormGroup darkMode={darkMode} label="Respiratory Rate (RR)" required><input type="text" value={rec.rr} onChange={e => { const u = [...medicalRecords]; u[idx] = { ...u[idx], rr: e.target.value }; setMedicalRecords(u) }} placeholder="breaths/min" className={`w-full px-3 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] ${darkMode ? 'placeholder-gray-500' : 'placeholder-gray-400'} box-border`} /></FormGroup>
                      <FormGroup darkMode={darkMode} label="Weight (kg)" required><input type="text" value={rec.weight} onChange={e => { const u = [...medicalRecords]; u[idx] = { ...u[idx], weight: e.target.value }; setMedicalRecords(u) }} className={`w-full px-3 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] ${darkMode ? 'placeholder-gray-500' : 'placeholder-gray-400'} box-border`} /></FormGroup>
                      <FormGroup darkMode={darkMode} label="Height (ft)" required><input type="text" value={rec.height} onChange={e => { const u = [...medicalRecords]; u[idx] = { ...u[idx], height: e.target.value }; setMedicalRecords(u) }} className={`w-full px-3 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] ${darkMode ? 'placeholder-gray-500' : 'placeholder-gray-400'} box-border`} /></FormGroup>
                    </div>
                    <div className="grid grid-cols-3 gap-3.5 max-[768px]:grid-cols-1">
                      <FormGroup darkMode={darkMode} label="Temperature" required><input type="text" value={rec.temperature} onChange={e => { const u = [...medicalRecords]; u[idx] = { ...u[idx], temperature: e.target.value }; setMedicalRecords(u) }} className={`w-full px-3 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[16px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] ${darkMode ? 'placeholder-gray-500' : 'placeholder-gray-400'} box-border`} /></FormGroup>
                    </div>
                  </div>
                ))}
              </div>

              <FormSection darkMode={darkMode} title="Chief Complaints">
                <textarea name="chiefComplaints" value={formData.chiefComplaints} onChange={handleChange} rows={4} placeholder="Enter patient's chief complaints..." className={getTextareaClass('chiefComplaints')} />
              </FormSection>

              <FormSection darkMode={darkMode} title="Diagnosis">
                <textarea name="diagnosis" value={formData.diagnosis} onChange={handleChange} rows={4} placeholder="Enter diagnosis..." className={getTextareaClass('diagnosis')} />
              </FormSection>

              <FormSection darkMode={darkMode} title="Medications / Treatment">
                <textarea name="medications" value={formData.medications} onChange={handleChange} rows={4} placeholder="Enter medications or treatment..." className={getTextareaClass('medications')} />
              </FormSection>
            </div>
            <div className={`flex justify-between gap-3 px-4 sm:px-7 py-4.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} border-t sticky bottom-0 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-b-2xl`}>
              <button className={`px-6 py-3 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'} text-[15px] font-semibold font-poppins cursor-pointer ${darkMode ? 'hover:text-[#F9FAFB]' : 'hover:text-gray-800'} transition-colors`} onClick={() => { setShowModal(false); resetForm() }}>Cancel</button>
              <button className="px-7 py-3 border-none rounded-lg bg-[#4E69D3] text-white text-[15px] font-bold font-poppins cursor-pointer hover:bg-[#4A6BC4] transition-colors" onClick={handleSave}>{editingId ? 'Update Record' : 'Save Patient Record'}</button>
            </div>
          </div>
        </div>
      )}

      {deceasedPrompt && viewingPatient && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[1100] p-4">
          <div className={`${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-2xl w-full max-w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-6 sm:p-7`} onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${darkMode ? 'bg-red-500/15' : 'bg-red-50'}`}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 className={`font-poppins text-xl font-bold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Mark as Deceased</h3>
              <p className={`text-sm mt-2 mb-0 leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                Are you sure you want to mark <span className={`font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{formatName(viewingPatient)}</span>{' '}
                ({viewingPatient.id}) as deceased? This will move the record to the deceased archive.
              </p>
              <div className={`w-full mt-4 px-4 py-3 rounded-xl text-[12.5px] ${darkMode ? 'bg-[#0f1438] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                Deceased date will be set to today,{' '}
                <span className={`font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>
                  {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
                </span>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                className={`flex-1 px-4 py-2.5 rounded-lg text-[15px] font-semibold font-poppins cursor-pointer transition-colors border ${darkMode ? 'border-[rgba(255,255,255,0.10)] bg-[#2d1b4e] text-[#F9FAFB] hover:bg-[#0f1438]' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                onClick={() => setDeceasedPrompt(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white text-[15px] font-bold font-poppins border-none cursor-pointer hover:bg-red-600 transition-colors"
                onClick={handleConfirmDeceased}
              >
                Yes, Mark as Deceased
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FormSection({ darkMode, title, children }: { darkMode: boolean; title: string; children: React.ReactNode }) {
  return (
    <div className={`mb-7 pb-6 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-100'} border-b last:border-none last:mb-0 last:pb-0`}>
      <h3 className={`font-poppins text-lg font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0 pb-2 mb-4 border-b-2 border-[#4E69D3] inline-block`}>{title}</h3>
      {children}
    </div>
  )
}

function FormGroup({ darkMode, label, required, note, error, children }: { darkMode: boolean; label: string; required?: boolean; note?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className={`text-[16px] font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-600'} font-poppins`}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {note && <span className={`font-normal text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-400'} ml-1`}>{note}</span>}
      </label>
      {children}
      {error && <span className="text-red-500 text-[11px] font-poppins mt-0.5">{error}</span>}
    </div>
  )
}

function ViewSection({ darkMode, title, fields }: { darkMode: boolean; title: string; fields: [string, string][] }) {
  return (
    <div className={`mb-6 pb-5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-100'} border-b last:border-none last:mb-0 last:pb-0`}>
      <h3 className={`font-poppins text-lg font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0 pb-1.5 mb-3 border-b-2 border-[#4E69D3] inline-block`}>{title}</h3>
      <div className="grid grid-cols-3 gap-[10px_20px] max-[768px]:grid-cols-1">
        {fields.map(([label, value]) => (
          <div key={label} className={`text-[16px] ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-600'} leading-relaxed`}><span className={`font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{label}:</span> {value || '\u2014'}</div>
        ))}
      </div>
    </div>
  )
}

function ViewTextSection({ darkMode, title, content }: { darkMode: boolean; title: string; content?: string }) {
  return (
    <div className={`mb-6 pb-5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-100'} border-b last:border-none last:mb-0 last:pb-0`}>
      <h3 className={`font-poppins text-lg font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0 pb-1.5 mb-3 border-b-2 border-[#4E69D3] inline-block`}>{title}</h3>
      <p className={`text-[16px] ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-600'} leading-relaxed whitespace-pre-wrap`}>{content || 'None'}</p>
    </div>
  )
}

function ViewSubRecords({ darkMode, title, records, fields }: { darkMode: boolean; title: string; records: Record<string, string>[]; fields: [string, string][] }) {
  return (
    <div className={`mb-6 pb-5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-100'} border-b last:border-none last:mb-0 last:pb-0`}>
      <h3 className={`font-poppins text-lg font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0 pb-1.5 mb-3 border-b-2 border-[#4E69D3] inline-block`}>{title}</h3>
      {(!records || records.length === 0) ? (
        <p className={`text-[15px] ${darkMode ? 'text-gray-400' : 'text-gray-400'} italic`}>No {title.toLowerCase()}.</p>
      ) : records.map((rec, i) => (
        <div key={i} className="mb-4">
          <div className={`text-[16px] font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} mb-2.5`}>Record #{i + 1}</div>
          <div className="grid grid-cols-3 gap-[10px_20px] max-[768px]:grid-cols-1">
            {fields.map(([label, field]) => (
              <div key={label} className={`text-[16px] ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-600'} leading-relaxed`}><span className={`font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{label}:</span> {rec[field] || '\u2014'}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
