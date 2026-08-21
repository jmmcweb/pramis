'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { useDarkMode } from '@/app/admin/DarkModeContext'
import { initialRecords, emptyForm, type PatientRecord as ArchiveRecord } from '@/src/data/patientRecords'

const puroks = ['Purok 1A', 'Purok 1B', 'Purok 2A AND 2B', 'Purok 3A', 'Purok 3B', 'Purok 4', 'Purok 5A', 'Purok 5B', 'Purok 6', 'Purok 7', 'Purok 8']

type PatientRecord = { date: string; service: string; notes: string; result: 'Normal' | 'Follow-up' | 'Treated' }

type Patient = { id: string; name: string; sex: string; age: number; purok: string; date: string; status: 'Active' | 'Follow-up' | 'Inactive'; records: PatientRecord[]; deceased?: boolean; deceasedDate?: string }

const initialPatients: Patient[] = [
  { id: 'PTN-1001', name: 'Maria Santos', sex: 'Female', age: 34, purok: 'Purok 2A AND 2B', date: '07-25-2026', status: 'Active', records: [
    { date: '03-12-2026', service: 'Prenatal Check-up', notes: 'Vitamins prescribed, next visit in 4 weeks.', result: 'Normal' },
    { date: '01-05-2026', service: 'Family Planning', notes: 'Counseling on contraceptive options completed.', result: 'Normal' },
    { date: '10-18-2025', service: 'Vaccination', notes: 'Flu vaccine administered.', result: 'Normal' },
  ] },
  { id: 'PTN-1002', name: 'Juan Dela Cruz', sex: 'Male', age: 45, purok: 'Purok 1A', date: '07-26-2026', status: 'Active', records: [
    { date: '02-20-2026', service: 'Consultation', notes: 'Hypertension — prescribed maintenance medication.', result: 'Follow-up' },
    { date: '11-09-2025', service: 'Blood Pressure Monitoring', notes: 'Reading 150/95, advised salt reduction.', result: 'Follow-up' },
  ] },
  { id: 'PTN-1003', name: 'Ana Reyes', sex: 'Female', age: 28, purok: 'Purok 3A', date: '07-27-2026', status: 'Follow-up', records: [
    { date: '06-30-2026', service: 'Maternal Care', notes: 'Postpartum check — recovery on track.', result: 'Normal' },
    { date: '04-11-2026', service: 'Prenatal Check-up', notes: 'Routine check, iron supplements issued.', result: 'Normal' },
  ] },
  { id: 'PTN-1004', name: 'Pedro Garcia', sex: 'Male', age: 62, purok: 'Purok 4', date: '07-28-2026', status: 'Active', records: [
    { date: '05-22-2026', service: 'Consultation', notes: 'Diabetes screening — referred for lab tests.', result: 'Follow-up' },
    { date: '02-08-2026', service: 'Vaccination', notes: 'Influenza shot administered.', result: 'Normal' },
  ] },
  { id: 'PTN-1005', name: 'Liza Fernandez', sex: 'Female', age: 51, purok: 'Purok 2A AND 2B', date: '07-29-2026', status: 'Active', records: [
    { date: '06-15-2026', service: 'Dental', notes: 'Tooth extraction done, no complications.', result: 'Treated' },
    { date: '03-03-2026', service: 'Consultation', notes: 'General check-up, all vital signs normal.', result: 'Normal' },
  ] },
  { id: 'PTN-1006', name: 'Carlos Mendoza', sex: 'Male', age: 39, purok: 'Purok 5A', date: '07-30-2026', status: 'Inactive', records: [
    { date: '01-19-2026', service: 'Consultation', notes: 'Acute respiratory infection treated.', result: 'Treated' },
  ] },
  { id: 'PTN-1007', name: 'Rosa Lim', sex: 'Female', age: 67, purok: 'Purok 6', date: '07-31-2026', status: 'Active', records: [
    { date: '04-28-2026', service: 'Blood Pressure Monitoring', notes: 'Reading 138/88, continue maintenance meds.', result: 'Follow-up' },
    { date: '02-14-2026', service: 'Consultation', notes: 'Arthritis management — pain relief prescribed.', result: 'Treated' },
    { date: '11-23-2025', service: 'Vaccination', notes: 'Pneumococcal vaccine administered.', result: 'Normal' },
  ] },
  { id: 'PTN-1008', name: 'Mark Villanueva', sex: 'Male', age: 24, purok: 'Purok 3A', date: '08-01-2026', status: 'Active', records: [
    { date: '07-02-2026', service: 'Consultation', notes: 'Minor laceration cleaned and sutured.', result: 'Treated' },
  ] },
  { id: 'PTN-1009', name: 'Grace Aquino', sex: 'Female', age: 33, purok: 'Purok 7', date: '08-02-2026', status: 'Follow-up', records: [
    { date: '06-08-2026', service: 'Family Planning', notes: 'IUD inserted, scheduled for re-check.', result: 'Normal' },
    { date: '03-25-2026', service: 'Screening', notes: 'Pap smear done, results pending.', result: 'Follow-up' },
  ] },
  { id: 'PTN-1010', name: 'Ramon Salazar', sex: 'Male', age: 58, purok: 'Purok 1A', date: '08-03-2026', status: 'Active', records: [
    { date: '05-30-2026', service: 'Consultation', notes: 'Chronic cough — antibiotics for bronchitis.', result: 'Treated' },
    { date: '02-02-2026', service: 'Blood Pressure Monitoring', notes: 'Reading 142/92, adjusted medication.', result: 'Follow-up' },
  ] },
  { id: 'PTN-1011', name: 'Nena Villar', sex: 'Female', age: 71, purok: 'Purok 4', date: '08-04-2026', status: 'Active', records: [
    { date: '07-10-2026', service: 'Consultation', notes: 'Falls risk assessment — home safety advised.', result: 'Normal' },
    { date: '04-19-2026', service: 'Vaccination', notes: 'Booster dose administered.', result: 'Normal' },
    { date: '01-30-2026', service: 'Blood Pressure Monitoring', notes: 'Reading 120/78, within normal range.', result: 'Normal' },
  ] },
  { id: 'PTN-1012', name: 'Dante Navarro', sex: 'Male', age: 19, purok: 'Purok 8', date: '08-05-2026', status: 'Active', records: [
    { date: '06-21-2026', service: 'Consultation', notes: 'Sports injury — sprained ankle, rest advised.', result: 'Treated' },
  ] },
]

const RECORDS_PER_PAGE = 10

export default function ServicesPage() {
  const { darkMode } = useDarkMode()
  const [patients, setPatients] = useState<Patient[]>(initialPatients)
  const [searchQuery, setSearchQuery] = useState('')
  const [purokFilter, setPurokFilter] = useState('All Puroks')
  const [currentPage, setCurrentPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingPatient, setViewingPatient] = useState<(ArchiveRecord & { status?: string }) | null>(null)
  const [deceasedTarget, setDeceasedTarget] = useState<Patient | null>(null)
  const [showArchive, setShowArchive] = useState(false)
  const [restoredSeedIds, setRestoredSeedIds] = useState<string[]>([])
  const [form, setForm] = useState({ name: '', sex: 'Male', age: '', purok: 'Purok 1A', status: 'Active' as Patient['status'] })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const anyModalOpen = showModal || viewingPatient !== null || deceasedTarget !== null || showArchive
    document.body.style.overflow = anyModalOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showModal, viewingPatient, deceasedTarget, showArchive])

  const openEdit = (p: Patient) => {
    setForm({ name: p.name, sex: p.sex, age: String(p.age), purok: p.purok, status: p.status })
    setErrors({})
    setEditingId(p.id)
    setShowModal(true)
  }

  const handleSave = () => {
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = 'Name is required'
    if (!form.age.trim()) newErrors.age = 'Age is required'
    else if (isNaN(Number(form.age)) || Number(form.age) < 0 || Number(form.age) > 120) newErrors.age = 'Enter a valid age'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error('Please fill in all required fields')
      return
    }
    const data = { name: form.name.trim(), sex: form.sex, age: Number(form.age), purok: form.purok, status: form.status }
    if (editingId) {
      setPatients(prev => prev.map(p => p.id === editingId ? { ...p, ...data } : p))
      toast.success('Patient updated successfully')
    } else {
      const newId = 'PTN-' + String(Date.now()).slice(-4)
      setPatients(prev => [...prev, { id: newId, date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-'), ...data, records: [] }])
      setCurrentPage(1)
      toast.success('New patient added successfully')
    }
    setShowModal(false)
  }

  const confirmDeceased = () => {
    if (!deceasedTarget) return
    const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-')
    setPatients(prev => prev.map(p => p.id === deceasedTarget.id ? { ...p, deceased: true, deceasedDate: today } : p))
    setDeceasedTarget(null)
    setViewingPatient(null)
    setShowArchive(true)
    toast.success('Patient marked as deceased')
  }

  const restorePatient = (id: string, kind: 'local' | 'seed') => {
    if (kind === 'local') {
      setPatients(prev => prev.map(p => p.id === id ? { ...p, deceased: false, deceasedDate: undefined } : p))
    } else {
      setRestoredSeedIds(prev => [...prev, id])
    }
    toast.success('Patient record restored')
  }

  const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase()

  const fullName = (r: ArchiveRecord) => [r.form.givenName, r.form.middleName, r.form.lastName].filter(Boolean).join(' ')
  const deceasedRecords = initialRecords.filter(r => r.deceased && !restoredSeedIds.includes(r.id))

  const toArchiveRecord = (p: Patient): ArchiveRecord & { status: Patient['status'] } => {
    const parts = p.name.split(' ').filter(Boolean)
    const givenName = parts[0] || ''
    const lastName = parts.length > 1 ? parts[parts.length - 1] : ''
    const middleName = parts.slice(1, -1).join(' ') || ''
    return {
      id: p.id,
      purok: p.purok,
      date: p.date,
      deceasedDate: p.deceasedDate,
      deceased: true,
      status: p.status,
      form: {
        ...emptyForm,
        givenName,
        middleName,
        lastName,
        sex: p.sex,
        age: String(p.age),
      },
      immunizationRecords: [],
      medicalRecords: p.records.map(r => ({
        date: r.date,
        service: r.service,
        notes: r.notes,
        bp: '', hr: '', rr: '', weight: '', height: '', temperature: '',
      })),
    }
  }
  const archiveItems = [
    ...patients.filter(p => p.deceased).map(p => ({ kind: 'local' as const, patient: p })),
    ...deceasedRecords.map(r => ({ kind: 'seed' as const, record: r })),
  ]
  archiveItems.sort((a, b) => {
    const an = a.kind === 'local' ? a.patient.name : fullName(a.record)
    const bn = b.kind === 'local' ? b.patient.name : fullName(b.record)
    return an.localeCompare(bn)
  })

  const q = searchQuery.trim().toLowerCase()
  const activePatients = patients.filter(p => !p.deceased)
  const filtered = activePatients
    .filter(p => (purokFilter === 'All Puroks' || p.purok === purokFilter))
    .filter(p => {
      if (!q) return true
      return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.purok.toLowerCase().includes(q)
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const totalPages = Math.max(1, Math.ceil(filtered.length / RECORDS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const pagePatients = filtered.slice((safePage - 1) * RECORDS_PER_PAGE, safePage * RECORDS_PER_PAGE)
  const firstShown = filtered.length === 0 ? 0 : (safePage - 1) * RECORDS_PER_PAGE + 1
  const lastShown = (safePage - 1) * RECORDS_PER_PAGE + pagePatients.length

  const maleCount = activePatients.filter(p => p.sex === 'Male').length
  const femaleCount = activePatients.filter(p => p.sex === 'Female').length
  const seniorCount = activePatients.filter(p => p.age >= 60).length
  const deceasedCount = patients.filter(p => p.deceased).length + deceasedRecords.length

  const statusStyle = (s: Patient['status']) => s === 'Active'
    ? 'bg-green-500/20 text-green-600'
    : s === 'Follow-up'
      ? 'bg-amber-500/20 text-amber-600'
      : (darkMode ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-500/15 text-gray-500')

  const inputClass = `w-full px-3.5 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)] text-[#F9FAFB] bg-[#2d1b4e]' : 'border-gray-200 text-gray-800 bg-gray-100'} rounded-lg text-[15px] font-poppins outline-none focus:border-[#4E69D3] box-border`
  const pageBtnClass = `min-w-[40px] h-[40px] px-2.5 rounded-lg text-[15px] font-semibold font-poppins cursor-pointer border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:border-[#4E69D3]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#4E69D3] hover:text-[#4E69D3]'}`

  return (
    <div className="print:hidden">
      <h1 className={`text-[30px] sm:text-[38px] lg:text-[45px] my-[14px] text-left ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'}`}>Patient Lists</h1>

      <div className="grid grid-cols-5 gap-[18px] mb-6 max-[1300px]:grid-cols-3 max-[768px]:grid-cols-1">
        <StatCard darkMode={darkMode} value={activePatients.length} label="Total Patients" color="#4E69D3" icon={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>} />
        <StatCard darkMode={darkMode} value={maleCount} label="Male" color="#0EA5E9" icon={<><circle cx="12" cy="12" r="7" /><path d="M17.5 6.5L22 2" /><path d="M15.5 2H22v6.5" /></>} />
        <StatCard darkMode={darkMode} value={femaleCount} label="Female" color="#EC4899" icon={<><circle cx="12" cy="8" r="5" /><path d="M12 13v10M8 18h8" /></>} />
        <StatCard darkMode={darkMode} value={seniorCount} label="Seniors (60+)" color="#F59E0B" icon={<><path d="M12 21a9 9 0 1 0-9-9" /><path d="M3 21v-8h8" /><path d="M17 4l3 3M14 7l6 6M11 10l6 6" /></>} />
        <StatCard darkMode={darkMode} value={deceasedCount} label="Deceased" color="#64748B" onClick={() => { setViewingPatient(null); setShowArchive(true) }} icon={<><rect x="9" y="3" width="6" height="18" /><rect x="3" y="9" width="18" height="6" /></>} />
      </div>

      <div className={`rounded-2xl p-4 sm:p-6 ${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.08)]'} border shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]`}>
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 mb-5">
          <div className="relative flex items-center flex-1">
            <svg className={`absolute left-3 w-4 h-4 ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-400'} pointer-events-none`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input type="text" placeholder="Search by name, ID, or purok..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }} className={`w-full pl-10 pr-3.5 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[15px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3]`} />
          </div>
          <div className="relative flex items-center">
            <select value={purokFilter} onChange={e => { setPurokFilter(e.target.value); setCurrentPage(1) }} className={`py-2.5 pl-3 pr-9 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} rounded-lg text-[15px] font-poppins ${darkMode ? 'text-[#F9FAFB] bg-[#2d1b4e]' : 'text-gray-800 bg-gray-100'} outline-none focus:border-[#4E69D3] appearance-none cursor-pointer`}>
              <option>All Puroks</option>
              {puroks.map(p => <option key={p}>{p}</option>)}
            </select>
            <svg className={`absolute right-2.5 w-3.5 h-3.5 ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-400'} pointer-events-none`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <button onClick={() => { setViewingPatient(null); setShowArchive(true) }} className="inline-flex items-center justify-center gap-1.5 px-[18px] py-2.5 bg-[#4E69D3] text-white border-none rounded-lg text-[15px] font-semibold font-poppins cursor-pointer hover:bg-[#4A6BC4] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
            <span>Deceased Archive</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl">
          <table className="w-full border-collapse text-[16px] min-w-[860px]" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className={`${darkMode ? 'bg-[#0f1438]' : 'bg-[#ddd6fe]'}`}>
                <th className={`px-5 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[15px] uppercase tracking-[0.5px] font-poppins border-b w-[24%]`}>Patient</th>
                <th className={`px-5 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[15px] uppercase tracking-[0.5px] font-poppins border-b w-[13%]`}>ID</th>
                <th className={`px-5 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[15px] uppercase tracking-[0.5px] font-poppins border-b w-[12%]`}>Age / Sex</th>
                <th className={`px-5 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[15px] uppercase tracking-[0.5px] font-poppins border-b w-[13%]`}>Purok</th>
                <th className={`px-5 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[15px] uppercase tracking-[0.5px] font-poppins border-b w-[13%]`}>Date Recorded</th>
                <th className={`px-5 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[15px] uppercase tracking-[0.5px] font-poppins border-b w-[12%]`}>Status</th>
                <th className={`px-5 py-4 text-center font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[15px] uppercase tracking-[0.5px] font-poppins border-b w-[13%]`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagePatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`px-5 py-12 text-center text-[15px] font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>No patient records found</td>
                </tr>
              ) : pagePatients.map(p => (
                <tr key={p.id} className={`${darkMode ? 'hover:bg-[#0f1438]' : 'hover:bg-[#E8EAF6]'} transition-colors`}>
                  <td className={`px-5 py-4 border-b ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-9 h-9 rounded-full ${darkMode ? 'bg-[#0f1438] text-blue-300' : 'bg-[#E8EAF6] text-[#4E69D3]'} flex items-center justify-center font-bold text-sm flex-shrink-0`}>{initials(p.name)}</div>
                      <span className={`text-[16px] font-poppins font-semibold truncate ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`} title={p.name}>{p.name}</span>
                    </div>
                  </td>
                  <td className={`px-5 py-4 border-b text-[16px] font-poppins font-semibold ${darkMode ? 'border-[rgba(255,255,255,0.10)] text-[#4E9FFF]' : 'border-[#E2E8F0] text-[#4E69D3]'}`}>{p.id}</td>
                  <td className={`px-5 py-4 border-b text-[16px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)] text-[#F9FAFB]' : 'border-[#E2E8F0] text-[#2A2E43]'}`}>{p.age} / {p.sex}</td>
                  <td className={`px-5 py-4 border-b text-[16px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)] text-[#F9FAFB]' : 'border-[#E2E8F0] text-[#2A2E43]'}`}>{p.purok}</td>
                  <td className={`px-5 py-4 border-b text-[16px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)] text-[#F9FAFB]' : 'border-[#E2E8F0] text-[#2A2E43]'}`}>{p.date}</td>
                  <td className={`px-5 py-4 border-b ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'}`}>
                    <span className={`inline-block px-3 py-1 rounded-full text-[12px] font-bold ${statusStyle(p.status)}`}>{p.status}</span>
                  </td>
                  <td className={`px-5 py-4 border-b ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'}`}>
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setViewingPatient(toArchiveRecord(p))} title="View" className={`w-9 h-9 rounded-lg cursor-pointer border transition-all flex items-center justify-center ${darkMode ? 'bg-[#0f1438] text-[#4E9FFF] border-[rgba(255,255,255,0.10)] hover:bg-[#141a45]' : 'bg-white text-[#4E69D3] border-[#4E69D3] hover:bg-[#E8EAF6]'}`}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button onClick={() => openEdit(p)} title="Edit" className={`w-9 h-9 rounded-lg cursor-pointer border transition-all flex items-center justify-center ${darkMode ? 'bg-[#0f1438] text-green-400 border-[rgba(255,255,255,0.10)] hover:bg-[#141a45]' : 'bg-white text-green-600 border-green-300 hover:bg-green-50'}`}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => setDeceasedTarget(p)} title="Mark as Deceased" className={`w-9 h-9 rounded-lg cursor-pointer border transition-all flex items-center justify-center ${darkMode ? 'bg-[#0f1438] text-red-400 border-[rgba(255,255,255,0.10)] hover:bg-[#141a45]' : 'bg-white text-red-500 border-red-300 hover:bg-red-50'}`}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="18" /><rect x="3" y="9" width="18" height="6" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center gap-3 pt-4 pb-1 flex-wrap">
          <span className={`text-[13px] ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-400'}`}>Showing {firstShown}-{lastShown} of {filtered.length} records</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button className={pageBtnClass} disabled={safePage === 1} onClick={() => setCurrentPage(safePage - 1)}>&lsaquo; Prev</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i + 1} className={`${pageBtnClass}${safePage === i + 1 ? ' bg-[#4E69D3] text-white border-[#4E69D3] hover:bg-[#4A6BC4] hover:text-white' : ''}`} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
              ))}
              <button className={pageBtnClass} disabled={safePage === totalPages} onClick={() => setCurrentPage(safePage + 1)}>Next &rsaquo;</button>
            </div>
          )}
        </div>
      </div>

      {viewingPatient && createPortal((
        <>
        <style>{'@media print { body > *:not(#patient-record-print) { display: none !important; } }'}</style>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1200] print:hidden" onClick={() => setViewingPatient(null)} />
        <div id="patient-record-print" className="fixed inset-0 z-[1201] flex justify-center items-start p-3 sm:p-4 lg:p-10 overflow-y-auto print:static print:z-auto print:p-0 print:overflow-visible print:inset-auto" onClick={() => setViewingPatient(null)}>
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
              <div className="flex items-center gap-3 min-w-0">
                <h2 className={`font-poppins text-2xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0 truncate`}>Patient Record &mdash; {viewingPatient.id}</h2>
                <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold flex-shrink-0 ${viewingPatient.status === 'Active' ? 'bg-green-500/20 text-green-600' : viewingPatient.status === 'Follow-up' ? 'bg-amber-500/20 text-amber-600' : viewingPatient.status === 'Inactive' ? (darkMode ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-500/15 text-gray-500') : (darkMode ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-500/15 text-gray-500')}`}>{viewingPatient.status || 'Deceased'}</span>
              </div>
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
                <p className="text-[13px] m-0 mt-2">{viewingPatient.id} &middot; {viewingPatient.status || 'Deceased'}</p>
              </div>
              <div className="relative">
                <ViewSection darkMode={darkMode} title="Personal Information" fields={[['Name', (viewingPatient.form.lastName || '') + ', ' + (viewingPatient.form.givenName || '') + ' ' + (viewingPatient.form.middleName || '')], ['Suffix', viewingPatient.form.suffix || 'N/A'], ['Maiden Name', viewingPatient.form.maidenName || 'N/A'], ['Sex', viewingPatient.form.sex || ''], ['Blood Type', viewingPatient.form.bloodType || ''], ['Birthdate', viewingPatient.form.birthdate || ''], ['Age', viewingPatient.form.age || ''], ['Place of Birth', viewingPatient.form.placeOfBirth || 'N/A'], ['Civil Status', viewingPatient.form.civilStatus || 'N/A'], ['Religion', viewingPatient.form.religion || 'N/A'], ['Contact', viewingPatient.form.contactNumber || 'N/A'], ['Recorded On', viewingPatient.date || 'N/A']]} />
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
            <div className={`flex justify-between items-center px-4 sm:px-7 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} border-t sticky bottom-0 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-b-2xl relative z-10 print:hidden`}>
              <button onClick={() => window.print()} className={`flex items-center gap-2 px-6 py-3 rounded-lg border-none text-sm font-semibold cursor-pointer transition-colors print:hidden ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] hover:bg-[#1a2050]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                Print
              </button>
              <button className={`px-6 py-3 rounded-lg border-none text-sm font-semibold cursor-pointer transition-colors ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] hover:bg-[#1a2050]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} onClick={() => setViewingPatient(null)}>Close</button>
            </div>
          </div>
        </div>
        </>
      ), document.body)}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[1000] p-3 sm:p-4" onClick={() => setShowModal(false)}>
          <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white'} rounded-2xl w-full max-w-[480px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-6`} onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl ${darkMode ? 'bg-[#0f1438]' : 'bg-[#E8EAF6]'} flex items-center justify-center flex-shrink-0`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4E69D3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className={`font-poppins text-xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0`}>{editingId ? 'Edit Patient' : 'Add Patient'}</h2>
                <p className={`text-[13px] m-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{editingId ? `Editing record ${editingId}` : 'Create a new patient record'}</p>
              </div>
              <button className={`w-9 h-9 border-none ${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'} rounded-full text-xl ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'} cursor-pointer flex items-center justify-center hover:bg-red-500 hover:text-white transition-all flex-shrink-0`} onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="mt-5 flex flex-col gap-3.5">
              <div>
                <label className={`block text-[12px] font-semibold uppercase tracking-[0.5px] mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Full Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Juan Dela Cruz" className={`${inputClass} ${errors.name ? 'border-red-500' : ''}`} />
                {errors.name && <span className="text-red-500 text-[11px] font-poppins mt-0.5 block">{errors.name}</span>}
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={`block text-[12px] font-semibold uppercase tracking-[0.5px] mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Sex</label>
                  <select value={form.sex} onChange={e => setForm(prev => ({ ...prev, sex: e.target.value }))} className={`${inputClass} cursor-pointer`}>
                    <option>Male</option><option>Female</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-[12px] font-semibold uppercase tracking-[0.5px] mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Age <span className="text-red-500">*</span></label>
                  <input type="number" value={form.age} onChange={e => setForm(prev => ({ ...prev, age: e.target.value }))} placeholder="e.g. 30" className={`${inputClass} ${errors.age ? 'border-red-500' : ''}`} />
                  {errors.age && <span className="text-red-500 text-[11px] font-poppins mt-0.5 block">{errors.age}</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={`block text-[12px] font-semibold uppercase tracking-[0.5px] mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Purok</label>
                  <select value={form.purok} onChange={e => setForm(prev => ({ ...prev, purok: e.target.value }))} className={`${inputClass} cursor-pointer`}>
                    {puroks.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-[12px] font-semibold uppercase tracking-[0.5px] mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status</label>
                  <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as Patient['status'] }))} className={`${inputClass} cursor-pointer`}>
                    <option>Active</option><option>Follow-up</option><option>Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className={`flex justify-end gap-3 mt-6 pt-4 border-t ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'}`}>
              <button onClick={() => setShowModal(false)} className={`px-6 py-3 rounded-lg text-[15px] font-bold font-poppins cursor-pointer border transition-all ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:bg-[#0f1438]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Cancel</button>
              <button onClick={handleSave} className="px-6 py-3 rounded-lg text-[15px] font-bold font-poppins cursor-pointer border-none transition-all bg-[#4E69D3] text-white hover:bg-[#4A6BC4]">{editingId ? 'Save Changes' : 'Add Patient'}</button>
            </div>
          </div>
        </div>
      )}

      {deceasedTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[1000] p-3 sm:p-4" onClick={() => setDeceasedTarget(null)}>
          <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white'} rounded-2xl w-full max-w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-6`} onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-[#0f1438]' : 'bg-red-50'}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="18" /><rect x="3" y="9" width="18" height="6" /></svg>
              </div>
              <div className="min-w-0">
                <h2 className={`font-poppins text-xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0`}>Mark as Deceased?</h2>
                <p className={`text-[14px] mt-1.5 mb-0 leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Are you sure you want to mark <span className={`font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{deceasedTarget.name}</span> ({deceasedTarget.id}) as deceased? The record will be moved to the Deceased Archive.
                </p>
              </div>
            </div>
            <div className={`flex justify-end gap-3 mt-6 pt-4 border-t ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'}`}>
              <button onClick={() => setDeceasedTarget(null)} className={`px-6 py-3 rounded-lg text-[15px] font-bold font-poppins cursor-pointer border transition-all ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:bg-[#0f1438]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Cancel</button>
              <button onClick={confirmDeceased} className="px-6 py-3 rounded-lg text-[15px] font-bold font-poppins cursor-pointer border-none transition-all bg-red-500 text-white hover:bg-red-600">Yes</button>
            </div>
          </div>
        </div>
      )}

      {showArchive && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[1100] p-3 sm:p-4" onClick={() => { setShowArchive(false); setViewingPatient(null) }}>
          <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white'} rounded-2xl w-full max-w-[720px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-6 max-h-[85vh] flex flex-col`} onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl ${darkMode ? 'bg-[#0f1438]' : 'bg-[#E8EAF6]'} flex items-center justify-center flex-shrink-0`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4E69D3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className={`font-poppins text-xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0`}>Deceased Archive</h2>
                <p className={`text-[13px] m-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Archived records of deceased patients</p>
              </div>
              <button className={`w-9 h-9 border-none ${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'} rounded-full text-xl ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'} cursor-pointer flex items-center justify-center hover:bg-red-500 hover:text-white transition-all flex-shrink-0`} onClick={() => setShowArchive(false)}>&times;</button>
            </div>

            {archiveItems.length === 0 ? (
              <p className={`text-[14px] font-semibold m-0 text-center py-10 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>No archived records found</p>
            ) : (
              <div className="mt-5 overflow-y-auto pr-1 flex flex-col gap-2">
                {archiveItems.map(item => {
                  const isLocal = item.kind === 'local'
                  const name = isLocal ? item.patient.name : fullName(item.record)
                  const id = isLocal ? item.patient.id : item.record.id
                  const purok = isLocal ? item.patient.purok : item.record.purok
                  const deceasedDate = isLocal ? (item.patient.deceasedDate || item.patient.date) : (item.record.deceasedDate || item.record.date)
                  const ageSex = isLocal ? `${item.patient.age} yrs · ${item.patient.sex}` : `${item.record.form.age || '—'} yrs · ${item.record.form.sex || '—'}`
                  return (
                    <div key={id} className={`p-3.5 rounded-xl border ${darkMode ? 'bg-[#0f1438] border-[rgba(255,255,255,0.10)]' : 'bg-[#F8F9FF] border-gray-200'}`}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className={`w-9 h-9 rounded-full ${darkMode ? 'bg-[#2d1b4e] text-blue-300' : 'bg-[#E8EAF6] text-[#4E69D3]'} flex items-center justify-center font-bold text-sm flex-shrink-0`}>{initials(name)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className={`text-[15px] font-bold m-0 truncate ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{name}</p>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0 ${darkMode ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-500/15 text-gray-500'}`}>Deceased</span>
                          </div>
                          <p className={`text-[12px] font-semibold m-0 ${darkMode ? 'text-[#4E9FFF]' : 'text-[#4E69D3]'}`}>{id} &middot; {purok}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-[12px] font-semibold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>Deceased: <span className="font-bold">{deceasedDate}</span></p>
                          <p className={`text-[12px] m-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{ageSex}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => restorePatient(id, item.kind)} className={`px-3.5 py-1.5 rounded-lg text-[12px] font-bold font-poppins cursor-pointer border transition-all ${darkMode ? 'bg-[#2d1b4e] text-green-400 border-[rgba(255,255,255,0.15)] hover:bg-[#0f1438]' : 'bg-white text-green-600 border-green-300 hover:bg-green-50'}`}>Restore</button>
                          <button onClick={() => setViewingPatient(isLocal ? toArchiveRecord(item.patient) : item.record)} className={`px-3.5 py-1.5 rounded-lg text-[12px] font-bold font-poppins cursor-pointer border transition-all ${darkMode ? 'bg-[#2d1b4e] text-[#4E9FFF] border-[rgba(255,255,255,0.15)] hover:bg-[#0f1438]' : 'bg-white text-[#4E69D3] border-[#4E69D3] hover:bg-[#E8EAF6]'}`}>View Record</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ darkMode, value, label, color, icon, onClick }: { darkMode: boolean; value: number; label: string; color: string; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`flex items-center gap-4 max-sm:gap-3 ${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'bg-white border-[rgba(15,60,95,0.10)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]'} p-[22px] max-sm:p-4 rounded-[18px] border ${onClick ? 'cursor-pointer transition-all hover:border-[#4E69D3] hover:-translate-y-0.5' : ''}`}>
      <div className={`w-14 h-14 max-sm:w-11 max-sm:h-11 rounded-xl ${darkMode ? 'bg-[#141a45]' : 'bg-[#E8EAF6]'} flex items-center justify-center flex-shrink-0`}>
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">{icon}</svg>
      </div>
      <div className="flex flex-col">
        <span className={`text-4xl max-sm:text-3xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{value}</span>
        <span className={`text-lg leading-tight ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{label}</span>
      </div>
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
              <div key={label} className={`text-[13px] ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-600'} leading-relaxed`}><span className={`font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{label}:</span> {rec[field] || '\u2014'}</div>
            ))}
          </div>
          {rec.service && (
            <p className={`text-[13px] font-semibold mt-1.5 ${darkMode ? 'text-[#C4B5FD]' : 'text-[#7C3AED]'}`}>Service: {rec.service}{rec.notes ? ` &middot; ${rec.notes}` : ''}</p>
          )}
        </div>
      ))}
    </div>
  )
}
