'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { useDarkMode } from '@/app/admin/DarkModeContext'
import { now, addDays, toISO, fmtLong } from '@/src/lib/dateUtils'

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type EventItem = { title: string; time: string; type: string; status?: 'Scheduled' | 'Done' | 'Cancelled' }

const initialEvents: Record<string, EventItem[]> = {
  [toISO(now)]: [{ title: 'Anti-Rabies Vaccination', time: '7:00am to 9:00am', type: 'vaccination' }],
  [toISO(addDays(now, 1))]: [{ title: 'Blood Donation Program', time: '3:00pm to 5:00pm', type: 'donation' }],
  [toISO(addDays(now, 2))]: [{ title: 'Mental Health Screening', time: '3:00pm to 5:00pm', type: 'screening' }],
  [toISO(addDays(now, 4))]: [
    { title: 'Basic Consultation', time: '8:00am to 5:00pm', type: 'consultation' },
    { title: 'Maternal and Child Care', time: '8:00am to 12:00pm', type: 'maternal' },
  ],
  [toISO(addDays(now, 6))]: [{ title: 'Dental Care', time: '8:00am to 5:00pm', type: 'dental' }],
  [toISO(addDays(now, 8))]: [{ title: 'Immunization and Vaccination', time: '8:00am to 5:00pm', type: 'vaccination' }],
  [toISO(addDays(now, 10))]: [{ title: 'Family Planning & Reproductive Health', time: '8:00am to 5:00pm', type: 'family' }],
  [toISO(addDays(now, 14))]: [{ title: 'Blood Donation Program', time: '3:00pm to 5:00pm', type: 'donation' }],
  [toISO(addDays(now, 18))]: [{ title: 'Anti-Rabies Vaccination', time: '7:00am to 9:00am', type: 'vaccination' }],
  [toISO(addDays(now, 24))]: [{ title: 'Mental Health Screening', time: '3:00pm to 5:00pm', type: 'screening' }],
}

type ArchiveItem = { title: string; date: string; time: string; type: string; status: 'Done' | 'Cancelled' }

const initialArchive: ArchiveItem[] = [
  { title: 'Free Blood Pressure Screening', date: fmtLong(addDays(now, -30)), time: '8:00am to 12:00pm', type: 'screening', status: 'Done' },
  { title: 'Community Health Fair', date: fmtLong(addDays(now, -28)), time: '9:00am to 4:00pm', type: 'consultation', status: 'Done' },
  { title: 'Dental Mission', date: fmtLong(addDays(now, -26)), time: '8:00am to 3:00pm', type: 'dental', status: 'Done' },
  { title: 'COVID-19 Booster Shot Drive', date: fmtLong(addDays(now, -24)), time: '8:00am to 5:00pm', type: 'vaccination', status: 'Done' },
  { title: 'Wellness Webinar', date: fmtLong(addDays(now, -22)), time: '10:00am to 11:30am', type: 'screening', status: 'Cancelled' },
  { title: 'Zumba Fitness Event', date: fmtLong(addDays(now, -20)), time: '6:00am to 8:00am', type: 'family', status: 'Cancelled' },
  { title: 'Nutrition Seminar', date: fmtLong(addDays(now, -18)), time: '1:00pm to 3:00pm', type: 'maternal', status: 'Cancelled' },
  { title: 'Eye Check-up Campaign', date: fmtLong(addDays(now, -16)), time: '8:00am to 5:00pm', type: 'consultation', status: 'Done' },
  { title: 'Blood Letting Activity', date: fmtLong(addDays(now, -14)), time: '9:00am to 4:00pm', type: 'donation', status: 'Cancelled' },
]

const typeColors: Record<string, { bg: string; color: string; label: string }> = {
  vaccination: { bg: '#E8EAF6', color: '#4E69D3', label: 'Vaccination' },
  donation: { bg: '#FEE2E2', color: '#E53E3E', label: 'Blood Donation' },
  screening: { bg: '#E6FFFA', color: '#319795', label: 'Screening' },
  consultation: { bg: '#FEFCBF', color: '#975A16', label: 'Consultation' },
  maternal: { bg: '#F3E8FF', color: '#7C3AED', label: 'Maternal Care' },
  dental: { bg: '#FFE4E6', color: '#BE185D', label: 'Dental' },
  family: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Family Planning' },
}

const formatDateInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return digits.slice(0, 2) + '/' + digits.slice(2)
  return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4)
}

const dateToISO = (mmddyyyy: string) => {
  const [m, d, y] = mmddyyyy.split('/')
  if (!m || !d || !y) return ''
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

const dateToDisplay = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y}`
}

const isValidDateInput = (mmddyyyy: string) => {
  const [m, d, y] = mmddyyyy.split('/').map(Number)
  if (!m || !d || !y) return false
  return m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100 && new Date(y, m - 1, d).getDate() === d
}

type ServiceItem = {
  title: string
  subtitle: string
  time: string
  icon: string
  desc: string
}

const initialServices: ServiceItem[] = [
  { title: 'Basic Consultation', subtitle: 'Monday to Friday', time: '8:00am - 5:00pm', icon: '👩‍⚕️', desc: 'General medical consultation for patients of all ages. Includes check-ups, diagnosis, and treatment recommendations.' },
  { title: 'Pre-natal Care', subtitle: 'Tuesday', time: '8:00am - 5:00pm', icon: '🤰', desc: 'Comprehensive care for pregnant women including check-ups, nutritional counseling, and monitoring of fetal development.' },
  { title: 'National Immunization Program (NIP)', subtitle: 'Wednesday to Friday', time: '8:00am - 5:00pm', icon: '💉', desc: 'Routine immunization for infants, children, and adults following the national vaccination schedule.' },
  { title: 'Hypertension Detection and Management (HDM)', subtitle: 'Monday to Friday', time: '8:00am - 5:00pm', icon: '🩸', desc: 'Blood pressure screening, monitoring, and treatment for hypertensive patients.' },
  { title: 'Visual Inspection with Acetic Acid (VIA)', subtitle: 'Thursday', time: '8:00am - 5:00pm', icon: '🔬', desc: 'Cervical cancer screening procedure for early detection of abnormalities.' },
  { title: 'Family Planning', subtitle: 'Thursday', time: '8:00am - 5:00pm', icon: '🧬', desc: 'Counseling and services for various family planning methods, reproductive health education, and informed choice.' },
  { title: 'Pills and Condoms', subtitle: 'Monday to Friday', time: '8:00am - 5:00pm', icon: '💊', desc: 'Distribution and counseling on oral contraceptive pills and condoms for safe and responsible family planning.' },
  { title: 'Adolescent Health and Development Program', subtitle: 'Saturday', time: '8:00am - 12:00pm', icon: '🧑', desc: 'Health services and education tailored for adolescents including reproductive health, mental health, and life skills.' },
]

const majorServices = [
  { title: 'Diabetes Management', icon: '🩺', desc: 'Blood sugar screening, monitoring, medication, and lifestyle counseling for diabetic patients.' },
  { title: 'Hypertension Control', icon: '❤️', desc: 'Regular blood pressure monitoring, maintenance medication, and dietary guidance for hypertensive patients.' },
  { title: 'TB Control Program', icon: '🔬', desc: 'Tuberculosis screening, diagnosis, directly observed therapy (DOTS), and patient support.' },
  { title: 'Cancer Screening', icon: '🎗️', desc: 'Early detection services including breast examination, cervical cancer screening, and health education.' },
  { title: 'Nutrition Program', icon: '🥗', desc: 'Nutritional assessment, supplementation, and counseling for children, pregnant women, and malnourished patients.' },
  { title: 'Mental Health Services', icon: '🧠', desc: 'Counseling, psychological support, and referral for patients experiencing mental health concerns.' },
  { title: 'Dental Care', icon: '🦷', desc: 'Basic dental services including check-ups, extractions, cleaning, and oral health education.' },
  { title: 'Wound Care & Minor Surgery', icon: '🏥', desc: 'Treatment of minor wounds, suturing, abscess drainage, and basic surgical procedures.' },
]

export default function EventsPage() {
  const { darkMode } = useDarkMode()
  const [showArchive, setShowArchive] = useState(false)
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)
  const [services, setServices] = useState<ServiceItem[]>(initialServices)
  const [events, setEvents] = useState<Record<string, EventItem[]>>(initialEvents)
  const [archive, setArchive] = useState<ArchiveItem[]>(initialArchive)
  const [eventModal, setEventModal] = useState(false)
  const [deleteEventIndex, setDeleteEventIndex] = useState<number | null>(null)
  const [serviceModal, setServiceModal] = useState(false)
  const [serviceIndex, setServiceIndex] = useState<number | null>(null)
  const [serviceForm, setServiceForm] = useState<ServiceItem>(initialServices[0])
  const [deleteServiceIndex, setDeleteServiceIndex] = useState<number | null>(null)

  useEffect(() => {
    document.body.style.overflow = (showArchive || serviceModal || deleteServiceIndex !== null || eventModal || deleteEventIndex !== null) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showArchive, serviceModal, deleteServiceIndex, eventModal, deleteEventIndex])
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  )
  const [eventForm, setEventForm] = useState({ title: '', date: selectedDate, time: '8:00am - 5:00pm', type: 'consultation', status: 'Scheduled' as EventItem['status'] })
  const [eventEditIndex, setEventEditIndex] = useState<number | null>(null)

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const selectedEvents = events[selectedDate] || []

  const upcomingEntries = Object.entries(events)
    .filter(([date]) => date >= todayStr)
    .sort(([a], [b]) => a.localeCompare(b))

  const renderDays = () => {
    const days = []
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`e-${i}`} />)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const hasEvent = !!events[dateStr]
      const isToday = dateStr === todayStr
      const isSelected = dateStr === selectedDate
      days.push(
        <div
          key={d}
          className={`aspect-square flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all relative border ${isSelected ? 'bg-[#4E69D3] border-[#4E69D3]' : isToday ? `${darkMode ? 'bg-[#141a45]' : 'bg-[#E8EAF6]'} border-[#4E69D3]` : `${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} border-transparent ${darkMode ? 'hover:bg-[#0f1438]' : 'hover:bg-gray-50'} hover:border-gray-200`}`}
          onClick={() => setSelectedDate(dateStr)}
        >
           <span className={`text-[18px] font-semibold ${isSelected ? 'text-white' : isToday ? 'text-[#4E69D3] font-extrabold' : darkMode ? 'text-[#F9FAFB]' : 'text-gray-800'}`}>{d}</span>
          {hasEvent && <span className={`w-[5px] h-[5px] rounded-full absolute bottom-1.5 ${isSelected ? 'bg-white' : 'bg-[#4E69D3]'}`} />}
        </div>
      )
    }
    return days
  }

  const openEditService = (index: number) => {
    setServiceForm({ ...services[index] })
    setServiceIndex(index)
    setServiceModal(true)
  }

  const openAddService = () => {
    setServiceForm({ icon: '🩺', title: '', subtitle: '', time: '8:00am - 5:00pm', desc: '' })
    setServiceIndex(null)
    setServiceModal(true)
  }

  const saveService = () => {
    if (!serviceForm.title.trim()) {
      toast.error('Please enter a service title')
      return
    }
    if (serviceIndex === null) {
      setServices(prev => [...prev, { ...serviceForm, title: serviceForm.title.trim() }])
      toast.success('Service added successfully')
    } else {
      setServices(prev => prev.map((s, i) => i === serviceIndex ? { ...serviceForm, title: serviceForm.title.trim() } : s))
      toast.success('Service updated successfully')
    }
    setServiceModal(false)
  }

  const confirmDeleteService = () => {
    if (deleteServiceIndex === null) return
    setServices(prev => prev.filter((_, i) => i !== deleteServiceIndex))
    setDeleteServiceIndex(null)
    toast.success('Service deleted')
  }

  const openAddEvent = () => {
    setEventForm({ title: '', date: dateToDisplay(selectedDate), time: '8:00am - 5:00pm', type: 'consultation', status: 'Scheduled' })
    setEventEditIndex(null)
    setEventModal(true)
  }

  const openEditEvent = (index: number) => {
    const ev = selectedEvents[index]
    setEventForm({ title: ev.title, date: dateToDisplay(selectedDate), time: ev.time, type: ev.type, status: ev.status || 'Scheduled' })
    setEventEditIndex(index)
    setEventModal(true)
  }

  const saveEvent = () => {
    if (!eventForm.title.trim()) {
      toast.error('Please enter an event title')
      return
    }
    if (!isValidDateInput(eventForm.date)) {
      toast.error('Please enter a valid date (MM/DD/YYYY)')
      return
    }
    const isoDate = dateToISO(eventForm.date)
    const newEvent = { title: eventForm.title.trim(), time: eventForm.time.trim() || 'All day', type: eventForm.type, status: eventForm.status || 'Scheduled' }

    if (newEvent.status === 'Done' || newEvent.status === 'Cancelled') {
      if (eventEditIndex !== null) {
        setEvents(prev => {
          const next = { ...prev }
          const oldList = next[selectedDate] || []
          next[selectedDate] = oldList.filter((_, i) => i !== eventEditIndex)
          if (next[selectedDate].length === 0) delete next[selectedDate]
          return next
        })
      }
      setArchive(prev => [{ title: newEvent.title, date: fmtLong(new Date(isoDate + 'T00:00:00')), time: newEvent.time, type: newEvent.type, status: newEvent.status as 'Done' | 'Cancelled' }, ...prev])
      setEventEditIndex(null)
      toast.success(`Event moved to archive as ${newEvent.status}`)
    } else if (eventEditIndex === null) {
      setEvents(prev => ({
        ...prev,
        [isoDate]: [...(prev[isoDate] || []), newEvent],
      }))
      setShowAllUpcoming(true)
      toast.success('Event added successfully')
    } else {
      setEvents(prev => {
        const next = { ...prev }
        const oldList = next[selectedDate] || []
        if (isoDate === selectedDate) {
          next[selectedDate] = oldList.map((e, i) => i === eventEditIndex ? newEvent : e)
        } else {
          next[selectedDate] = oldList.filter((_, i) => i !== eventEditIndex)
          if (next[selectedDate].length === 0) delete next[selectedDate]
          next[isoDate] = [...(next[isoDate] || []), newEvent]
        }
        return next
      })
      setEventEditIndex(null)
      toast.success('Event updated successfully')
    }
    setSelectedDate(isoDate)
    setShowAllUpcoming(true)
    setEventModal(false)
  }

  const confirmDeleteEvent = () => {
    if (deleteEventIndex === null) return
    setEvents(prev => {
      const next = { ...prev }
      const list = next[selectedDate] || []
      next[selectedDate] = list.filter((_, i) => i !== deleteEventIndex)
      if (next[selectedDate].length === 0) delete next[selectedDate]
      return next
    })
    setDeleteEventIndex(null)
    toast.success('Event deleted')
  }

  const moveEventToArchive = (index: number, status: 'Done' | 'Cancelled') => {
    const ev = selectedEvents[index]
    if (!ev) return
    setEvents(prev => {
      const next = { ...prev }
      const list = next[selectedDate] || []
      next[selectedDate] = list.filter((_, i) => i !== index)
      if (next[selectedDate].length === 0) delete next[selectedDate]
      return next
    })
    setArchive(prev => [{ title: ev.title, date: fmtLong(new Date(selectedDate + 'T00:00:00')), time: ev.time, type: ev.type, status }, ...prev])
    toast.success(`Event moved to archive as ${status}`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-[14px]">
        <h1 className={`text-[30px] sm:text-[38px] lg:text-[45px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'} my-0 text-left`}>Events</h1>
        <div className="flex items-center gap-2.5">
          <button
            onClick={openAddEvent}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold border-none cursor-pointer transition-colors bg-[#2EB67D] text-white hover:bg-[#259A6B]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>
            Add Event
          </button>
          <button
            onClick={() => setShowArchive(!showArchive)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold border-none cursor-pointer transition-colors bg-[#4E69D3] text-white hover:bg-[#3D56B8]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Events Archive
          </button>
        </div>
      </div>

      {showArchive && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-start z-[1000] p-3 sm:p-4 lg:p-10 overflow-y-auto">
          <div className={`${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-2xl w-full max-w-[1400px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex flex-col max-h-[90vh]`} onClick={e => e.stopPropagation()}>
            <div className={`flex justify-between items-center px-8 py-5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} border-b sticky top-0 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-t-2xl z-10`}>
              <h2 className={`font-poppins text-2xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0`}>Events Archive</h2>
              <button className={`w-9 h-9 border-none ${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'} rounded-full text-xl ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'} cursor-pointer flex items-center justify-center hover:bg-red-500 hover:text-white transition-all`} onClick={() => setShowArchive(false)}>&times;</button>
            </div>
            <div className="px-3 sm:px-8 py-6 overflow-y-auto flex-1 max-h-[70vh]">
              <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[16px] min-w-[640px]" style={{ tableLayout: 'fixed' }}>
                <thead>
<tr className={`${darkMode ? 'bg-[#0f1438]' : 'bg-[#ddd6fe]'}`}>
                    <th className={`px-6 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[16px] uppercase tracking-[0.5px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[34%]`}>Event Title</th>
                    <th className={`pl-15 pr-10 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[16px] uppercase tracking-[0.5px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[18%]`}>Date</th>
                    <th className={`pl-10 pr-6 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[16px] uppercase tracking-[0.5px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[22%]`}>Time</th>
                    <th className={`px-6 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[16px] uppercase tracking-[0.5px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[16%]`}>Type</th>
                    <th className={`px-6 py-4 text-left font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} text-[16px] uppercase tracking-[0.5px] font-poppins ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(255,255,255,0.20)]'} border-b w-[10%]`}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {archive.map((ev, i) => {
                    const tc = typeColors[ev.type] || { bg: '#F7FAFC', color: '#718096', label: 'Event' }
                    return (
                      <tr key={i} className={`${darkMode ? 'hover:bg-[#0f1438]' : 'hover:bg-[#E8EAF6]'} cursor-pointer`}>
                        <td className={`px-6 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>
                          <span className="text-[16px] font-semibold truncate block" title={ev.title}>{ev.title}</span>
                        </td>
                        <td className={`pl-15 pr-10 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b text-[16px] whitespace-nowrap ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{ev.date}</td>
                        <td className={`pl-10 pr-6 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b text-[16px] whitespace-nowrap ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{ev.time}</td>
                        <td className={`px-6 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b`}>
                          <span className={`text-[16px] ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{tc.label}</span>
                        </td>
                        <td className={`px-6 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b`}>
                          <span className={`inline-block px-3 py-1.5 rounded-full text-[12px] font-bold ${ev.status === 'Done' ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-500'}`}>{ev.status}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </div>
            <div className={`flex justify-end gap-3 px-8 py-4 border-t ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} sticky bottom-0 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} rounded-b-2xl`}>
              <button className={`px-6 py-2.5 rounded-lg border-none text-sm font-semibold cursor-pointer transition-colors ${darkMode ? 'bg-[#0f1438] text-[#F9FAFB] hover:bg-[#1a2050]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} onClick={() => setShowArchive(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {eventModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[1000] p-3 sm:p-4 overflow-y-auto" onClick={() => setEventModal(false)}>
          <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white'} rounded-2xl w-full max-w-[560px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] flex flex-col max-h-[92vh]`} onClick={e => e.stopPropagation()}>
            <div className={`flex justify-between items-center px-5 sm:px-7 py-4 sm:py-5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} border-b flex-shrink-0`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${darkMode ? 'bg-[#0f1438]' : 'bg-[#E8F5E9]'} flex items-center justify-center`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2EB67D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                </div>
                <div>
                  <h2 className={`font-poppins text-xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0`}>{eventEditIndex === null ? 'Add Event' : 'Edit Event'}</h2>
                  <p className={`text-[13px] m-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{eventEditIndex === null ? 'Schedule a new event at the health center' : 'Update the event details'}</p>
                </div>
              </div>
              <button className={`w-9 h-9 border-none ${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'} rounded-full text-xl ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'} cursor-pointer flex items-center justify-center hover:bg-red-500 hover:text-white transition-all flex-shrink-0`} onClick={() => setEventModal(false)}>&times;</button>
            </div>

            <div className="px-5 sm:px-7 py-6 overflow-y-auto flex-1">
              <ServiceField darkMode={darkMode} label="Event Title" required>
                <input type="text" value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} placeholder="e.g. Anti-Rabies Vaccination" className={serviceInputClass(darkMode)} />
              </ServiceField>
              <div className="grid grid-cols-2 gap-3.5 my-3.5 max-[520px]:grid-cols-1">
                <ServiceField darkMode={darkMode} label="Date" required>
                  <input type="text" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: formatDateInput(e.target.value) })} placeholder="MM/DD/YYYY" maxLength={10} className={`${serviceInputClass(darkMode)}`} />
                </ServiceField>
                <ServiceField darkMode={darkMode} label="Time" required>
                  <input type="text" value={eventForm.time} onChange={e => setEventForm({ ...eventForm, time: e.target.value })} placeholder="e.g. 8:00am - 5:00pm" className={serviceInputClass(darkMode)} />
                </ServiceField>
              </div>
              <ServiceField darkMode={darkMode} label="Event Type" required>
                <select value={eventForm.type} onChange={e => setEventForm({ ...eventForm, type: e.target.value })} className={`${serviceInputClass(darkMode)} cursor-pointer`}>
                  {Object.entries(typeColors).map(([key, tc]) => (
                    <option key={key} value={key}>{tc.label}</option>
                  ))}
                </select>
              </ServiceField>
              <div className="mt-3.5">
                <ServiceField darkMode={darkMode} label="Status" required>
                  <select value={eventForm.status} onChange={e => setEventForm({ ...eventForm, status: e.target.value as EventItem['status'] })} className={`${serviceInputClass(darkMode)} cursor-pointer`}>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Done">Done</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </ServiceField>
              </div>
            </div>

            <div className={`flex flex-row items-center justify-end gap-3 px-5 sm:px-7 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} border-t flex-shrink-0`}>
              <button onClick={() => setEventModal(false)} className={`px-6 py-3 rounded-lg text-[15px] font-bold font-poppins cursor-pointer border transition-all ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:bg-[#0f1438]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Cancel</button>
              <button onClick={saveEvent} className={`px-6 py-3 rounded-lg text-[15px] font-bold font-poppins cursor-pointer border-none transition-all bg-[#2EB67D] text-white hover:bg-[#259A6B]`}>{eventEditIndex === null ? 'Add Event' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteEventIndex !== null && selectedEvents[deleteEventIndex] && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[1000] p-3 sm:p-4" onClick={() => setDeleteEventIndex(null)}>
          <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white'} rounded-2xl w-full max-w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-6`} onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-[#0f1438]' : 'bg-red-50'}`}>
                <Trash2 size={22} color="#EF4444" />
              </div>
              <div className="min-w-0">
                <h2 className={`font-poppins text-xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0`}>Delete Event?</h2>
                <p className={`text-[14px] mt-1.5 mb-0 leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Are you sure you want to delete <span className={`font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{selectedEvents[deleteEventIndex].title}</span>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className={`flex justify-end gap-3 mt-6 pt-4 border-t ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'}`}>
              <button onClick={() => setDeleteEventIndex(null)} className={`px-6 py-3 rounded-lg text-[15px] font-bold font-poppins cursor-pointer border transition-all ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:bg-[#0f1438]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Cancel</button>
              <button onClick={confirmDeleteEvent} className="px-6 py-3 rounded-lg text-[15px] font-bold font-poppins cursor-pointer border-none transition-all bg-red-500 text-white hover:bg-red-600">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-7 items-start max-[1000px]:flex-col">
        <div className={`w-[80%] max-[1000px]:w-full ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} border ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(15,60,95,0.08)]'} p-4 rounded-[24px] ${darkMode ? 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]'}`}>
          <div className="flex items-center justify-between mb-5">
            <button className={`w-9 h-9 border border-gray-200 rounded-lg ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'} cursor-pointer flex items-center justify-center ${darkMode ? 'hover:bg-[#141a45]' : 'hover:bg-[#E8EAF6]'} hover:border-[#4E69D3] hover:text-[#4E69D3] transition-all`} onClick={() => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <span className={`font-poppins text-2xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{months[month]} {year}</span>
            <button className={`w-9 h-9 border border-gray-200 rounded-lg ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'} cursor-pointer flex items-center justify-center ${darkMode ? 'hover:bg-[#141a45]' : 'hover:bg-[#E8EAF6]'} hover:border-[#4E69D3] hover:text-[#4E69D3] transition-all`} onClick={() => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {daysOfWeek.map(d => <div key={d} className={`text-center text-[13px] font-bold uppercase tracking-[0.5px] py-2 ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-400'}`}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {renderDays()}
          </div>
        </div>

        <div className="w-[35%] max-[1000px]:w-full flex-shrink-0 flex flex-col gap-4">
          <div className={`font-poppins text-base font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} px-5 py-4 ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} border ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(15,60,95,0.08)]'} rounded-[24px] ${darkMode ? 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]'} text-center`}>
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>

          {selectedEvents.length === 0 ? (
            <div className={`${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} border ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(15,60,95,0.08)]'} p-4 rounded-[24px] ${darkMode ? 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]'} flex flex-col items-center gap-3 text-center`}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E0" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              <p className={`text-sm font-semibold m-0 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>No events scheduled for this day</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {selectedEvents.map((ev, i) => {
                const tc = typeColors[ev.type] || { bg: '#F7FAFC', color: '#718096', label: 'Event' }
                return (
                  <div key={i} onClick={() => openEditEvent(i)} title="Click to edit event" className={`relative ${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} border ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(15,60,95,0.10)]'} p-[22px] rounded-[18px] ${darkMode ? 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]'} cursor-pointer ${darkMode ? 'hover:bg-[#0f1438]' : 'hover:bg-[#E8EAF6]'} transition-colors`}>
                    <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-[0.3px] mb-2" style={{ background: tc.bg, color: tc.color }}>{tc.label}</span>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`font-poppins text-base font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0 mb-1.5`}>{ev.title}</h3>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={e => { e.stopPropagation(); openEditEvent(i) }} title="Edit event" className={`w-7 h-7 rounded-md cursor-pointer border transition-all flex items-center justify-center ${darkMode ? 'bg-[#0f1438] text-[#4E9FFF] border-[rgba(255,255,255,0.10)] hover:bg-[#141a45]' : 'bg-white text-[#4E69D3] border-[#4E69D3] hover:bg-[#E8EAF6]'}`}>
                          <Pencil size={12} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setDeleteEventIndex(i) }} title="Delete event" className={`w-7 h-7 rounded-md cursor-pointer border transition-all flex items-center justify-center ${darkMode ? 'bg-[#0f1438] text-gray-400 border-[rgba(255,255,255,0.10)] hover:bg-[#141a45]' : 'bg-white text-gray-500 border-gray-300 hover:bg-red-50 hover:text-red-500'}`}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 text-[13px] font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'}`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                      {ev.time}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className={`${darkMode ? 'bg-[#2d1b4e]' : 'bg-white'} border ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[rgba(15,60,95,0.08)]'} p-4 rounded-[24px] ${darkMode ? 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]' : 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]'}`}>
            <h3 className={`font-poppins text-base font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0 pb-2.5 mb-3.5 border-b ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'}`}>Upcoming Events</h3>
            {upcomingEntries.length === 0 ? (
              <p className={`text-sm font-semibold text-center m-0 py-6 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>No upcoming events</p>
            ) : (
              upcomingEntries.slice(0, showAllUpcoming ? undefined : 4).map(([date, evList]) => (
                <div key={date} className={`flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer ${darkMode ? 'hover:bg-[#0f1438]' : 'hover:bg-gray-50'} transition-colors`} onClick={() => setSelectedDate(date)}>
                  <div className="flex flex-col items-center min-w-[40px]">
                    <span className="font-poppins text-lg font-extrabold text-[#4E69D3] leading-none">{new Date(date + 'T00:00:00').getDate()}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-[0.5px] ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-400'}`}>{months[new Date(date + 'T00:00:00').getMonth()].slice(0, 3)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 overflow-hidden min-w-0">
                    <span className={`text-[13px] font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} truncate`}>{evList[0].title}</span>
                    <span className={`text-[11px] font-semibold ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'}`}>{evList[0].time}</span>
                  </div>
                </div>
              ))
            )}
            {upcomingEntries.length > 4 && (
              <button onClick={() => setShowAllUpcoming(!showAllUpcoming)} className="w-full mt-2 py-2 rounded-lg text-sm font-semibold border-none cursor-pointer bg-[#4E69D3] text-white hover:bg-[#3D56B8] transition-colors">{showAllUpcoming ? 'See Less' : 'See More'}</button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 mt-8">
        <h2 className={`text-[30px] sm:text-[35px] my-0 text-left ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'}`}>Services</h2>
        <button
          onClick={openAddService}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border-none cursor-pointer transition-colors bg-[#4E69D3] text-white hover:bg-[#3D56B8]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>
          Add Service
        </button>
      </div>

      <div className={`overflow-hidden rounded-[24px] ${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.08)]'} shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]`}>
        {services.length === 0 ? (
          <div className={`flex flex-col items-center gap-3 py-14 text-center`}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E0" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            <p className={`text-sm font-semibold m-0 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>No services yet. Click &ldquo;Add Service&rdquo; to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[16px] min-w-[760px]" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="bg-[#4E69D3]">
                  <th className={`px-6 py-4 text-left font-bold text-white text-[16px] uppercase tracking-[0.5px] font-poppins border-b w-[26%] ${darkMode ? 'border-[rgba(255,255,255,0.15)]' : 'border-[rgba(255,255,255,0.20)]'}`}>Service</th>
                  <th className={`px-6 py-4 text-left font-bold text-white text-[16px] uppercase tracking-[0.5px] font-poppins border-b ${darkMode ? 'border-[rgba(255,255,255,0.15)]' : 'border-[rgba(255,255,255,0.20)]'}`}>Description</th>
                  <th className={`px-6 py-4 text-left font-bold text-white text-[16px] uppercase tracking-[0.5px] font-poppins border-b w-[18%] ${darkMode ? 'border-[rgba(255,255,255,0.15)]' : 'border-[rgba(255,255,255,0.20)]'}`}>Schedule</th>
                  <th className={`px-6 py-4 text-left font-bold text-white text-[16px] uppercase tracking-[0.5px] font-poppins border-b w-[17%] ${darkMode ? 'border-[rgba(255,255,255,0.15)]' : 'border-[rgba(255,255,255,0.20)]'}`}>Time</th>
                  <th className={`px-6 py-4 text-center font-bold text-white text-[16px] uppercase tracking-[0.5px] font-poppins border-b w-[130px] ${darkMode ? 'border-[rgba(255,255,255,0.15)]' : 'border-[rgba(255,255,255,0.20)]'}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s, i) => (
                  <tr
                    key={i}
                    className={`transition-colors ${darkMode ? 'hover:bg-[#0f1438]' : 'hover:bg-gray-50'}`}
                  >
                    <td className={`px-6 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b`}>
                      <span className={`text-[16px] font-semibold truncate block ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`} title={s.title}>{s.title}</span>
                    </td>
                    <td className={`px-6 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b`}>
                      <span className={`text-[16px] truncate block ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} title={s.desc}>{s.desc}</span>
                    </td>
                    <td className={`px-6 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b text-[16px] whitespace-nowrap ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{s.subtitle}</td>
                    <td className={`px-6 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b text-[16px] whitespace-nowrap ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{s.time}</td>
                    <td className={`px-6 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-[#E2E8F0]'} border-b`}>
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEditService(i)} title="Edit service" className={`w-9 h-9 rounded-lg cursor-pointer border transition-all flex items-center justify-center ${darkMode ? 'bg-[#0f1438] text-[#4E9FFF] border-[rgba(255,255,255,0.10)] hover:bg-[#141a45]' : 'bg-white text-[#4E69D3] border-[#4E69D3] hover:bg-[#E8EAF6]'}`}>
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setDeleteServiceIndex(i)} title="Delete service" className={`w-9 h-9 rounded-lg cursor-pointer border transition-all flex items-center justify-center ${darkMode ? 'bg-[#0f1438] text-red-400 border-[rgba(255,255,255,0.10)] hover:bg-[#141a45]' : 'bg-white text-red-500 border-red-300 hover:bg-red-50'}`}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2 className={`text-[30px] sm:text-[35px] my-0 text-left mt-8 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'}`}>Major Services</h2>

      <div className={`mb-5 mt-4 pt-2.5 px-4 pb-4 rounded-[14px] flex items-start gap-3 shadow-sm ${darkMode ? 'bg-[#1a1a4e] border-l-4 border-[#4E69D3]' : 'bg-gradient-to-r from-[#EEF0FB] to-white border-l-4 border-[#4E69D3]'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${darkMode ? 'bg-[#4E69D3]' : 'bg-[#4E69D3]'}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
        </div>
        <div className="pt-0.5">
          <p className={`text-[20px] font-semibold m-0 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#1d4662]'}`}>RHU-Exclusive Services</p>
          <p className={`text-[17px] m-0 mt-1 leading-relaxed ${darkMode ? 'text-[#cbd5e1]' : 'text-[#4a5568]'}`}>These major services are exclusively available at Rural Health Units (RHUs) and are not offered here in our Barangay Sumapang Matanda Health Center.</p>
        </div>
      </div>

      <div className={`overflow-hidden rounded-[24px] ${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white border-[rgba(15,60,95,0.08)]'} shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]`}>
        <div className="grid grid-cols-3 gap-[22px] p-4 max-[1100px]:grid-cols-2 max-[768px]:grid-cols-1">
          {majorServices.map((s, i) => (
            <div key={i} className={`flex flex-col p-[22px] rounded-[18px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] ${darkMode ? 'bg-[#2d1b4e] border border-[rgba(255,255,255,0.10)]' : 'bg-white border border-[rgba(15,60,95,0.10)]'}`}>
              <div className="flex gap-4 items-start">
                <div className="text-2xl mt-1">{s.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-[20px] font-bold leading-tight m-0 line-clamp-2 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#111]'}`}>{s.title}</h3>
                </div>
              </div>
              <p className={`text-[13px] leading-relaxed m-0 mt-[16px] line-clamp-2 ${darkMode ? 'text-[#F9FAFB]' : 'text-[#555]'}`}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {serviceModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[1000] p-3 sm:p-4 overflow-y-auto" onClick={() => setServiceModal(false)}>
          <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white'} rounded-2xl w-full max-w-[560px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] flex flex-col max-h-[92vh]`} onClick={e => e.stopPropagation()}>
            <div className={`flex justify-between items-center px-5 sm:px-7 py-4 sm:py-5 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} border-b flex-shrink-0`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${darkMode ? 'bg-[#0f1438]' : 'bg-[#E8EAF6]'} flex items-center justify-center`}>
                  <Pencil size={20} color="#4E69D3" />
                </div>
                <div>
                  <h2 className={`font-poppins text-xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0`}>{serviceIndex === null ? 'Add Service' : 'Edit Service'}</h2>
                  <p className={`text-[13px] m-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{serviceIndex === null ? 'Create a new service offered at the health center' : 'Update the service details'}</p>
                </div>
              </div>
              <button className={`w-9 h-9 border-none ${darkMode ? 'bg-[#0f1438]' : 'bg-gray-100'} rounded-full text-xl ${darkMode ? 'text-[#F9FAFB]' : 'text-gray-500'} cursor-pointer flex items-center justify-center hover:bg-red-500 hover:text-white transition-all flex-shrink-0`} onClick={() => setServiceModal(false)}>&times;</button>
            </div>

            <div className="px-5 sm:px-7 py-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-[100px_1fr] gap-3.5 mb-3.5 max-[520px]:grid-cols-1">
                <ServiceField darkMode={darkMode} label="Icon" required>
                  <input type="text" value={serviceForm.icon} onChange={e => setServiceForm({ ...serviceForm, icon: e.target.value })} className={serviceInputClass(darkMode)} />
                </ServiceField>
                <ServiceField darkMode={darkMode} label="Service Title" required>
                  <input type="text" value={serviceForm.title} onChange={e => setServiceForm({ ...serviceForm, title: e.target.value })} placeholder="e.g. Basic Consultation" className={serviceInputClass(darkMode)} />
                </ServiceField>
              </div>
              <div className="grid grid-cols-2 gap-3.5 mb-3.5 max-[520px]:grid-cols-1">
                <ServiceField darkMode={darkMode} label="Schedule" required>
                  <input type="text" value={serviceForm.subtitle} onChange={e => setServiceForm({ ...serviceForm, subtitle: e.target.value })} placeholder="e.g. Monday to Friday" className={serviceInputClass(darkMode)} />
                </ServiceField>
                <ServiceField darkMode={darkMode} label="Time" required>
                  <input type="text" value={serviceForm.time} onChange={e => setServiceForm({ ...serviceForm, time: e.target.value })} placeholder="e.g. 8:00am - 5:00pm" className={serviceInputClass(darkMode)} />
                </ServiceField>
              </div>
              <ServiceField darkMode={darkMode} label="Description" required>
                <textarea value={serviceForm.desc} onChange={e => setServiceForm({ ...serviceForm, desc: e.target.value })} rows={4} placeholder="Short description of the service..." className={`${serviceInputClass(darkMode)} resize-y`} />
              </ServiceField>
            </div>

            <div className={`flex flex-row items-center justify-end gap-3 px-5 sm:px-7 py-4 ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'} border-t flex-shrink-0`}>
              <button onClick={() => setServiceModal(false)} className={`px-6 py-3 rounded-lg text-[15px] font-bold font-poppins cursor-pointer border transition-all ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:bg-[#0f1438]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Cancel</button>
              <button onClick={saveService} className={`px-6 py-3 rounded-lg text-[15px] font-bold font-poppins cursor-pointer border-none transition-all bg-[#4E69D3] text-white hover:bg-[#4A6BC4]`}>{serviceIndex === null ? 'Add Service' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteServiceIndex !== null && services[deleteServiceIndex] && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[1000] p-3 sm:p-4" onClick={() => setDeleteServiceIndex(null)}>
          <div className={`${darkMode ? 'bg-[#2d1b4e] border-[rgba(255,255,255,0.10)]' : 'bg-white'} rounded-2xl w-full max-w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-6`} onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-[#0f1438]' : 'bg-red-50'}`}>
                <Trash2 size={22} color="#EF4444" />
              </div>
              <div className="min-w-0">
                <h2 className={`font-poppins text-xl font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'} m-0`}>Delete Service?</h2>
                <p className={`text-[14px] mt-1.5 mb-0 leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Are you sure you want to delete <span className={`font-bold ${darkMode ? 'text-[#F9FAFB]' : 'text-[#2A2E43]'}`}>{services[deleteServiceIndex].title}</span>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t ${darkMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-gray-200'}">
              <button onClick={() => setDeleteServiceIndex(null)} className={`px-6 py-3 rounded-lg text-[15px] font-bold font-poppins cursor-pointer border transition-all ${darkMode ? 'bg-[#2d1b4e] text-[#F9FAFB] border-[rgba(255,255,255,0.10)] hover:bg-[#0f1438]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Cancel</button>
              <button onClick={confirmDeleteService} className="px-6 py-3 rounded-lg text-[15px] font-bold font-poppins cursor-pointer border-none transition-all bg-red-500 text-white hover:bg-red-600">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function serviceInputClass(darkMode: boolean) {
  return `w-full px-3.5 py-2.5 ${darkMode ? 'border-[rgba(255,255,255,0.10)] text-[#F9FAFB] bg-[#2d1b4e]' : 'border-gray-200 text-gray-800 bg-gray-100'} rounded-lg text-[15px] font-poppins outline-none focus:border-[#4E69D3] ${darkMode ? 'placeholder-gray-500' : 'placeholder-gray-400'} box-border`
}

function ServiceField({ darkMode, label, required, children }: { darkMode: boolean; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={`block text-[12px] font-semibold uppercase tracking-[0.5px] mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}{required && <span className="text-red-500"> *</span>}</label>
      {children}
    </div>
  )
}
