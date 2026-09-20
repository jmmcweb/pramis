'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2, Loader2, Plus, CalendarDays, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'
import { useDarkMode } from '@/app/admin/DarkModeContext'

import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  type EventItem,
} from '@/lib/actions/event'

import {
  getServices,
  createService,
  updateService,
  deleteService,
  type ServiceItem,
} from '@/lib/actions/service'

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export type ArchiveItem = {
  id?: string
  title: string
  date: string
  time: string
  type: string
  status: 'Done' | 'Cancelled'
  description?: string
}

const typeColors: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  vaccination: {
    bg: '#E8EAF6',
    color: '#4E69D3',
    label: 'Vaccination',
  },
  donation: {
    bg: '#FEE2E2',
    color: '#E53E3E',
    label: 'Blood Donation',
  },
  screening: {
    bg: '#E6FFFA',
    color: '#319795',
    label: 'Screening',
  },
  consultation: {
    bg: '#FEFCBF',
    color: '#975A16',
    label: 'Consultation',
  },
  maternal: {
    bg: '#F3E8FF',
    color: '#7C3AED',
    label: 'Maternal Care',
  },
  dental: {
    bg: '#FFE4E6',
    color: '#BE185D',
    label: 'Dental',
  },
  family: {
    bg: '#DBEAFE',
    color: '#1D4ED8',
    label: 'Family Planning',
  },
}

const majorServices = [
  {
    title: 'Diabetes Management',
    icon: '🩺',
    desc: 'Blood sugar screening, monitoring, medication, and lifestyle counseling for diabetic patients.',
  },
  {
    title: 'Hypertension Control',
    icon: '❤️',
    desc: 'Regular blood pressure monitoring, maintenance medication, and dietary guidance for hypertensive patients.',
  },
  {
    title: 'TB Control Program',
    icon: '🔬',
    desc: 'Tuberculosis screening, diagnosis, directly observed therapy (DOTS), and patient support.',
  },
  {
    title: 'Cancer Screening',
    icon: '🎗️',
    desc: 'Early detection services including breast examination, cervical cancer screening, and health education.',
  },
  {
    title: 'Nutrition Program',
    icon: '🥗',
    desc: 'Nutritional assessment, supplementation, and counseling for children, pregnant women, and malnourished patients.',
  },
  {
    title: 'Mental Health Services',
    icon: '🧠',
    desc: 'Counseling, psychological support, and referral for patients experiencing mental health concerns.',
  },
  {
    title: 'Dental Care',
    icon: '🦷',
    desc: 'Basic dental services including check-ups, extractions, cleaning, and oral health education.',
  },
  {
    title: 'Wound Care & Minor Surgery',
    icon: '🏥',
    desc: 'Treatment of minor wounds, suturing, abscess drainage, and basic surgical procedures.',
  },
]

const formatDateInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8)

  if (digits.length <= 2) return digits
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

const dateToISO = (value: string) => {
  const [m, d, y] = value.split('/')

  if (!m || !d || !y) return ''

  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

const dateToDisplay = (iso: string) => {
  const [y, m, d] = iso.split('-')

  if (!y || !m || !d) return ''

  return `${m}/${d}/${y}`
}

const isValidDateInput = (value: string) => {
  const [m, d, y] = value.split('/').map(Number)

  if (!m || !d || !y) return false

  return (
    m >= 1 &&
    m <= 12 &&
    d >= 1 &&
    d <= 31 &&
    y >= 1900 &&
    y <= 2100 &&
    new Date(y, m - 1, d).getDate() === d
  )
}

export default function EventsPage() {
  const { darkMode } = useDarkMode()

  const today = new Date()

  const [loading, setLoading] = useState(true)

  const [events, setEvents] = useState<Record<string, EventItem[]>>({})
  const [archive, setArchive] = useState<ArchiveItem[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const [selectedDate, setSelectedDate] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`
  )

  const [showArchive, setShowArchive] = useState(false)
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)

  /* EVENT MODAL */

  const [eventModal, setEventModal] = useState(false)
  const [eventEditItem, setEventEditItem] = useState<EventItem | null>(null)
  const [deleteEventItem, setDeleteEventItem] =
    useState<EventItem | null>(null)
  const [savingEvent, setSavingEvent] = useState(false)

  const [eventForm, setEventForm] = useState({
    title: '',
    date: dateToDisplay(selectedDate),
    time: '8:00am - 5:00pm',
    type: 'consultation',
    status: 'Scheduled' as EventItem['status'],
    description: '',
  })

  /* SERVICE MODAL */

  const [serviceModal, setServiceModal] = useState(false)
  const [serviceEditItem, setServiceEditItem] =
    useState<ServiceItem | null>(null)

  const [deleteServiceItem, setDeleteServiceItem] =
    useState<ServiceItem | null>(null)

  const [savingService, setSavingService] = useState(false)

  const [serviceForm, setServiceForm] = useState<ServiceItem>({
    title: '',
    subtitle: 'Monday to Friday',
    time: '8:00am - 5:00pm',
    icon: '🩺',
    desc: '',
  })

  useEffect(() => {
    document.body.style.overflow =
      showArchive ||
      serviceModal ||
      deleteServiceItem !== null ||
      eventModal ||
      deleteEventItem !== null
        ? 'hidden'
        : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [
    showArchive,
    serviceModal,
    deleteServiceItem,
    eventModal,
    deleteEventItem,
  ])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      const [eventResult, serviceResult] = await Promise.all([
        getEvents(),
        getServices(),
      ])

      if (eventResult.success) {
        const grouped: Record<string, EventItem[]> = {}

        for (const event of eventResult.scheduled || []) {
          if (!grouped[event.date]) {
            grouped[event.date] = []
          }

          grouped[event.date].push(event)
        }

        setEvents(grouped)
        setArchive((eventResult.archive as ArchiveItem[]) || [])
      }

      if (serviceResult.success) {
        setServices(serviceResult.services || [])
      }
    } catch (error) {
      console.error(error)
      toast.error('Unable to connect to database.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const todayStr =
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()

  const selectedEvents = events[selectedDate] || []

  const upcomingEntries = Object.entries(events)
    .filter(([date, list]) => date >= todayStr && list.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))


  const openAddEvent = () => {
    setEventForm({
      title: '',
      date: dateToDisplay(selectedDate),
      time: '8:00am - 5:00pm',
      type: 'consultation',
      status: 'Scheduled',
      description: '',
    })

    setEventEditItem(null)
    setEventModal(true)
  }

  const openEditEvent = (event: EventItem) => {
    setEventForm({
      title: event.title,
      date: dateToDisplay(event.date || selectedDate),
      time: event.time,
      type: event.type,
      status: event.status || 'Scheduled',
      description: event.description || '',
    })

    setEventEditItem(event)
    setEventModal(true)
  }

  const saveEvent = async () => {
    if (!eventForm.title.trim()) {
      toast.error('Please enter an event title')
      return
    }

    if (!isValidDateInput(eventForm.date)) {
      toast.error('Please enter a valid date (MM/DD/YYYY)')
      return
    }

    const isoDate = dateToISO(eventForm.date)

    try {
      setSavingEvent(true)

      if (!eventEditItem) {
        const result = await createEvent({
          title: eventForm.title.trim(),
          date: isoDate,
          time: eventForm.time.trim() || 'All day',
          type: eventForm.type,
          status: eventForm.status || 'Scheduled',
          description: eventForm.description,
        })

        if (result.success && result.event) {
          const newEvent = result.event

          if (newEvent.status === 'Scheduled') {
            setEvents((prev) => ({
              ...prev,
              [isoDate]: [...(prev[isoDate] || []), newEvent],
            }))
          } else {
            setArchive((prev) => [
              newEvent as ArchiveItem,
              ...prev,
            ])
          }

          setSelectedDate(isoDate)
          setShowAllUpcoming(true)
          setEventModal(false)

          toast.success('Event added successfully')
        } else {
          toast.error(result.message || 'Failed to add event')
        }
      } else {
        const result = await updateEvent({
          id: eventEditItem.id!,
          title: eventForm.title.trim(),
          date: isoDate,
          time: eventForm.time.trim() || 'All day',
          type: eventForm.type,
          status: eventForm.status || 'Scheduled',
          description: eventForm.description,
        })

        if (result.success && result.event) {
          const updatedEvent = result.event

          setEvents((prev) => {
            const next = { ...prev }

            for (const date of Object.keys(next)) {
              next[date] = next[date].filter(
                (event) => event.id !== eventEditItem.id
              )

              if (next[date].length === 0) {
                delete next[date]
              }
            }

            if (updatedEvent.status === 'Scheduled') {
              next[isoDate] = [
                ...(next[isoDate] || []),
                updatedEvent,
              ]
            }

            return next
          })

          if (
            updatedEvent.status === 'Done' ||
            updatedEvent.status === 'Cancelled'
          ) {
            setArchive((prev) => [
              updatedEvent as ArchiveItem,
              ...prev.filter(
                (item) => item.id !== eventEditItem.id
              ),
            ])
          } else {
            setArchive((prev) =>
              prev.filter(
                (item) => item.id !== eventEditItem.id
              )
            )
          }

          setSelectedDate(isoDate)
          setEventModal(false)

          toast.success('Event updated successfully')
        } else {
          toast.error(result.message || 'Failed to update event')
        }
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to save event')
    } finally {
      setSavingEvent(false)
    }
  }

  const confirmDeleteEvent = async () => {
    if (!deleteEventItem?.id) return

    try {
      const result = await deleteEvent(deleteEventItem.id)

      if (result.success) {
        setEvents((prev) => {
          const next = { ...prev }

          for (const date of Object.keys(next)) {
            next[date] = next[date].filter(
              (event) => event.id !== deleteEventItem.id
            )

            if (next[date].length === 0) {
              delete next[date]
            }
          }

          return next
        })

        setArchive((prev) =>
          prev.filter(
            (item) => item.id !== deleteEventItem.id
          )
        )

        toast.success('Event deleted')
      } else {
        toast.error(result.message || 'Failed to delete event')
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete event')
    } finally {
      setDeleteEventItem(null)
    }
  }


  const openAddService = () => {
    setServiceForm({
      icon: '🩺',
      title: '',
      subtitle: 'Monday to Friday',
      time: '8:00am - 5:00pm',
      desc: '',
    })

    setServiceEditItem(null)
    setServiceModal(true)
  }

  const openEditService = (service: ServiceItem) => {
    setServiceForm({ ...service })
    setServiceEditItem(service)
    setServiceModal(true)
  }

  const saveService = async () => {
    if (!serviceForm.title.trim()) {
      toast.error('Please enter a service title')
      return
    }

    try {
      setSavingService(true)

      if (!serviceEditItem) {
        const result = await createService({
          title: serviceForm.title.trim(),
          subtitle: serviceForm.subtitle,
          time: serviceForm.time,
          icon: serviceForm.icon,
          desc: serviceForm.desc,
        })

        if (result.success && result.service) {
          setServices((prev) => [...prev, result.service!])
          toast.success('Service added successfully')
          setServiceModal(false)
        } else {
          toast.error(result.message || 'Failed to add service')
        }
      } else {
        const result = await updateService({
          id: serviceEditItem.id!,
          title: serviceForm.title.trim(),
          subtitle: serviceForm.subtitle,
          time: serviceForm.time,
          icon: serviceForm.icon,
          desc: serviceForm.desc,
        })

        if (result.success && result.service) {
          setServices((prev) =>
            prev.map((service) =>
              service.id === serviceEditItem.id
                ? result.service!
                : service
            )
          )

          toast.success('Service updated successfully')
          setServiceModal(false)
        } else {
          toast.error(result.message || 'Failed to update service')
        }
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to save service')
    } finally {
      setSavingService(false)
    }
  }

  const confirmDeleteService = async () => {
    if (!deleteServiceItem?.id) return

    try {
      const result = await deleteService(deleteServiceItem.id)

      if (result.success) {
        setServices((prev) =>
          prev.filter(
            (service) => service.id !== deleteServiceItem.id
          )
        )

        toast.success('Service deleted')
      } else {
        toast.error(result.message || 'Failed to delete service')
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete service')
    } finally {
      setDeleteServiceItem(null)
    }
  }


  const goPreviousMonth = () => {
    if (month === 0) {
      setYear((value) => value - 1)
      setMonth(11)
    } else {
      setMonth((value) => value - 1)
    }
  }

  const goNextMonth = () => {
    if (month === 11) {
      setYear((value) => value + 1)
      setMonth(0)
    } else {
      setMonth((value) => value + 1)
    }
  }

  const renderDays = () => {
    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} />
      )
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr =
        `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(
          2,
          '0'
        )}`

      const hasEvent = Boolean(events[dateStr]?.length)
      const isToday = dateStr === todayStr
      const isSelected = dateStr === selectedDate

      days.push(
        <button
          key={dateStr}
          type="button"
          onClick={() => setSelectedDate(dateStr)}
          className={`
            relative aspect-square min-h-[42px]
            flex flex-col items-center justify-center
            rounded-lg border transition-all
            ${
              isSelected
                ? 'bg-[#4E69D3] border-[#4E69D3] text-white shadow-sm'
                : isToday
                  ? darkMode
                    ? 'bg-[#25204a] border-[#4E69D3]'
                    : 'bg-[#EEF0FB] border-[#4E69D3]'
                  : darkMode
                    ? 'bg-transparent border-transparent hover:bg-[#171333]'
                    : 'bg-transparent border-transparent hover:bg-gray-50'
            }
          `}
        >
          <span
            className={`
              text-sm font-semibold
              ${
                isSelected
                  ? 'text-white'
                  : isToday
                    ? 'text-[#4E69D3] font-bold'
                    : darkMode
                      ? 'text-gray-100'
                      : 'text-gray-700'
              }
            `}
          >
            {day}
          </span>

          {hasEvent && (
            <span
              className={`
                absolute bottom-1.5 w-1 h-1 rounded-full
                ${isSelected ? 'bg-white' : 'bg-[#4E69D3]'}
              `}
            />
          )}
        </button>
      )
    }

    return days
  }


  return (
    <div
      className={`min-h-full ${
        darkMode ? 'text-gray-100' : 'text-gray-800'
      }`}
    >


      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1
            className={`
              text-2xl sm:text-3xl font-bold tracking-tight
              ${darkMode ? 'text-white' : 'text-[#1d4662]'}
            `}
          >
            Events & Services
          </h1>

          <p
            className={`
              mt-1 text-sm
              ${darkMode ? 'text-gray-400' : 'text-gray-500'}
            `}
          >
            Manage health center events, schedules, and services.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openAddEvent}
            className="
              inline-flex items-center gap-2
              px-4 py-2.5
              rounded-lg
              bg-[#2EB67D] hover:bg-[#259A6B]
              text-white text-sm font-semibold
              transition-colors
            "
          >
            <Plus size={17} />
            Add Event
          </button>

          <button
            onClick={() => setShowArchive(true)}
            className="
              inline-flex items-center gap-2
              px-4 py-2.5
              rounded-lg
              bg-[#4E69D3] hover:bg-[#3D56B8]
              text-white text-sm font-semibold
              transition-colors
            "
          >
            <CalendarDays size={17} />
            Archive
          </button>
        </div>
      </div>


      {loading && (
        <div
          className={`
            mb-5 flex items-center justify-center gap-3
            rounded-xl border p-8
            ${
              darkMode
                ? 'bg-[#211a3d] border-white/10'
                : 'bg-white border-gray-200'
            }
          `}
        >
          <Loader2
            className="w-5 h-5 animate-spin text-[#4E69D3]"
          />

          <span className="text-sm font-medium">
            Loading events and services...
          </span>
        </div>
      )}


      <div
        className="
          grid
          grid-cols-1
          lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]
          gap-5
          items-start
        "
      >
        {/* CALENDAR */}

        <section
          className={`
            rounded-xl border p-5
            ${
              darkMode
                ? 'bg-[#211a3d] border-white/10'
                : 'bg-white border-gray-200'
            }
          `}
        >
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={goPreviousMonth}
              className={`
                w-9 h-9 rounded-lg border
                flex items-center justify-center
                transition-colors
                ${
                  darkMode
                    ? 'border-white/10 bg-[#171333] text-gray-300 hover:bg-[#29214d]'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }
              `}
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="text-center">
              <h2
                className={`
                  text-lg font-bold
                  ${darkMode ? 'text-white' : 'text-[#2A2E43]'}
                `}
              >
                {months[month]} {year}
              </h2>

              <p
                className={`
                  text-xs mt-0.5
                  ${darkMode ? 'text-gray-500' : 'text-gray-400'}
                `}
              >
                Select a date to view events
              </p>
            </div>

            <button
              type="button"
              onClick={goNextMonth}
              className={`
                w-9 h-9 rounded-lg border
                flex items-center justify-center
                transition-colors
                ${
                  darkMode
                    ? 'border-white/10 bg-[#171333] text-gray-300 hover:bg-[#29214d]'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }
              `}
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className={`
                  text-center text-[11px]
                  font-semibold uppercase
                  py-2
                  ${
                    darkMode
                      ? 'text-gray-500'
                      : 'text-gray-400'
                  }
                `}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {renderDays()}
          </div>

          <div
            className={`
              flex items-center gap-4 mt-5 pt-4 border-t
              text-xs
              ${
                darkMode
                  ? 'border-white/10 text-gray-400'
                  : 'border-gray-100 text-gray-500'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#4E69D3]" />
              Has event
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded border border-[#4E69D3]" />
              Today
            </div>
          </div>
        </section>

        {/* RIGHT SIDE */}

        <div className="space-y-5">
          {/* SELECTED DATE */}

          <section
            className={`
              rounded-xl border p-4
              ${
                darkMode
                  ? 'bg-[#211a3d] border-white/10'
                  : 'bg-white border-gray-200'
              }
            `}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p
                  className={`
                    text-xs font-semibold uppercase tracking-wide
                    ${
                      darkMode
                        ? 'text-gray-500'
                        : 'text-gray-400'
                    }
                  `}
                >
                  Selected Date
                </p>

                <h3
                  className={`
                    mt-1 text-sm font-bold
                    ${
                      darkMode
                        ? 'text-white'
                        : 'text-[#2A2E43]'
                    }
                  `}
                >
                  {new Date(
                    selectedDate + 'T00:00:00'
                  ).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h3>
              </div>

              <div
                className="
                  w-9 h-9 rounded-lg
                  bg-[#EEF0FB]
                  text-[#4E69D3]
                  flex items-center justify-center
                "
              >
                <CalendarDays size={18} />
              </div>
            </div>
          </section>

          {/* SELECTED EVENTS */}

          {selectedEvents.length === 0 ? (
            <section
              className={`
                rounded-xl border p-8 text-center
                ${
                  darkMode
                    ? 'bg-[#211a3d] border-white/10'
                    : 'bg-white border-gray-200'
                }
              `}
            >
              <div
                className={`
                  w-12 h-12 rounded-full
                  mx-auto mb-3
                  flex items-center justify-center
                  ${
                    darkMode
                      ? 'bg-[#171333] text-gray-500'
                      : 'bg-gray-50 text-gray-300'
                  }
                `}
              >
                <CalendarDays size={22} />
              </div>

              <p
                className={`
                  text-sm font-semibold
                  ${
                    darkMode
                      ? 'text-gray-400'
                      : 'text-gray-500'
                  }
                `}
              >
                No events scheduled
              </p>

              <p
                className={`
                  text-xs mt-1
                  ${
                    darkMode
                      ? 'text-gray-600'
                      : 'text-gray-400'
                  }
                `}
              >
                There are no events for this date.
              </p>
            </section>
          ) : (
            <section className="space-y-3">
              {selectedEvents.map((event, index) => {
                const type =
                  typeColors[event.type] || {
                    bg: '#F7FAFC',
                    color: '#718096',
                    label: 'Event',
                  }

                return (
                  <div
                    key={event.id || index}
                    className={`
                      rounded-xl border p-4
                      transition-colors
                      ${
                        darkMode
                          ? 'bg-[#211a3d] border-white/10 hover:bg-[#29214d]'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span
                          className="
                            inline-flex px-2 py-1
                            rounded-md
                            text-[10px] font-bold
                          "
                          style={{
                            background: type.bg,
                            color: type.color,
                          }}
                        >
                          {type.label}
                        </span>

                        <h3
                          className={`
                            mt-2 text-sm font-bold
                            ${
                              darkMode
                                ? 'text-white'
                                : 'text-[#2A2E43]'
                            }
                          `}
                        >
                          {event.title}
                        </h3>

                        <div
                          className={`
                            flex items-center gap-1.5
                            mt-2 text-xs
                            ${
                              darkMode
                                ? 'text-gray-400'
                                : 'text-gray-500'
                            }
                          `}
                        >
                          <Clock size={14} />
                          {event.time}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            openEditEvent(event)
                          }
                          className={`
                            w-8 h-8 rounded-lg
                            flex items-center justify-center
                            border transition-colors
                            ${
                              darkMode
                                ? 'border-white/10 bg-[#171333] text-blue-400 hover:bg-[#29214d]'
                                : 'border-gray-200 bg-white text-[#4E69D3] hover:bg-[#EEF0FB]'
                            }
                          `}
                          title="Edit event"
                        >
                          <Pencil size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDeleteEventItem(event)
                          }
                          className={`
                            w-8 h-8 rounded-lg
                            flex items-center justify-center
                            border transition-colors
                            ${
                              darkMode
                                ? 'border-white/10 bg-[#171333] text-red-400 hover:bg-red-500/10'
                                : 'border-gray-200 bg-white text-red-500 hover:bg-red-50'
                            }
                          `}
                          title="Delete event"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </section>
          )}

          {/* UPCOMING */}

          <section
            className={`
              rounded-xl border
              ${
                darkMode
                  ? 'bg-[#211a3d] border-white/10'
                  : 'bg-white border-gray-200'
              }
            `}
          >
            <div className="px-4 py-3.5 border-b border-inherit">
              <div className="flex items-center justify-between">
                <h3
                  className={`
                    text-sm font-bold
                    ${
                      darkMode
                        ? 'text-white'
                        : 'text-[#2A2E43]'
                    }
                  `}
                >
                  Upcoming Events
                </h3>

                <span
                  className="
                    px-2 py-0.5 rounded-full
                    bg-[#EEF0FB]
                    text-[#4E69D3]
                    text-[10px] font-bold
                  "
                >
                  {upcomingEntries.length}
                </span>
              </div>
            </div>

            <div className="p-2">
              {upcomingEntries.length === 0 ? (
                <p
                  className={`
                    text-xs text-center py-6
                    ${
                      darkMode
                        ? 'text-gray-500'
                        : 'text-gray-400'
                    }
                  `}
                >
                  No upcoming events.
                </p>
              ) : (
                <>
                  {upcomingEntries
                    .slice(
                      0,
                      showAllUpcoming ? undefined : 4
                    )
                    .map(([date, eventList]) => {
                      const event = eventList[0]
                      const dateObj = new Date(
                        date + 'T00:00:00'
                      )

                      return (
                        <button
                          key={date}
                          type="button"
                          onClick={() =>
                            setSelectedDate(date)
                          }
                          className={`
                            w-full flex items-center gap-3
                            px-2.5 py-2.5
                            rounded-lg text-left
                            transition-colors
                            ${
                              darkMode
                                ? 'hover:bg-[#171333]'
                                : 'hover:bg-gray-50'
                            }
                          `}
                        >
                          <div
                            className="
                              w-10 h-10 rounded-lg
                              bg-[#EEF0FB]
                              flex flex-col
                              items-center justify-center
                              flex-shrink-0
                            "
                          >
                            <span className="text-sm font-bold text-[#4E69D3] leading-none">
                              {dateObj.getDate()}
                            </span>

                            <span className="text-[9px] uppercase font-bold text-[#4E69D3] mt-0.5">
                              {months[
                                dateObj.getMonth()
                              ].slice(0, 3)}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <p
                              className={`
                                text-xs font-bold truncate
                                ${
                                  darkMode
                                    ? 'text-white'
                                    : 'text-[#2A2E43]'
                                }
                              `}
                            >
                              {event.title}
                            </p>

                            <p
                              className={`
                                text-[11px] mt-0.5
                                ${
                                  darkMode
                                    ? 'text-gray-500'
                                    : 'text-gray-400'
                                }
                              `}
                            >
                              {event.time}
                            </p>
                          </div>
                        </button>
                      )
                    })}

                  {upcomingEntries.length > 4 && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowAllUpcoming(
                          !showAllUpcoming
                        )
                      }
                      className="
                        w-full mt-1
                        py-2 rounded-lg
                        text-xs font-semibold
                        text-[#4E69D3]
                        hover:bg-[#EEF0FB]
                        transition-colors
                      "
                    >
                      {showAllUpcoming
                        ? 'Show less'
                        : `View all ${upcomingEntries.length} events`}
                    </button>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>


      <section className="mt-8">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h2
              className={`
                text-xl sm:text-2xl font-bold
                ${
                  darkMode
                    ? 'text-white'
                    : 'text-[#1d4662]'
                }
              `}
            >
              Services
            </h2>

            <p
              className={`
                text-xs mt-1
                ${
                  darkMode
                    ? 'text-gray-500'
                    : 'text-gray-400'
                }
              `}
            >
              Services currently offered by the health center.
            </p>
          </div>

          <button
            onClick={openAddService}
            className="
              inline-flex items-center gap-2
              px-4 py-2.5
              rounded-lg
              bg-[#4E69D3] hover:bg-[#3D56B8]
              text-white text-sm font-semibold
              transition-colors
            "
          >
            <Plus size={17} />
            Add Service
          </button>
        </div>

        <div
          className={`
            overflow-hidden rounded-xl border
            ${
              darkMode
                ? 'bg-[#211a3d] border-white/10'
                : 'bg-white border-gray-200'
            }
          `}
        >
          {services.length === 0 ? (
            <div className="py-14 text-center px-5">
              <div
                className={`
                  w-12 h-12 rounded-full
                  mx-auto mb-3
                  flex items-center justify-center
                  ${
                    darkMode
                      ? 'bg-[#171333] text-gray-500'
                      : 'bg-gray-50 text-gray-300'
                  }
                `}
              >
                <CalendarDays size={22} />
              </div>

              <p
                className={`
                  text-sm font-semibold
                  ${
                    darkMode
                      ? 'text-gray-400'
                      : 'text-gray-500'
                  }
                `}
              >
                No services available
              </p>

              <p
                className={`
                  text-xs mt-1
                  ${
                    darkMode
                      ? 'text-gray-600'
                      : 'text-gray-400'
                  }
                `}
              >
                Click &ldquo;Add Service&rdquo; to create
                a service.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr
                    className={
                      darkMode
                        ? 'bg-[#171333]'
                        : 'bg-gray-50'
                    }
                  >
                    <th className={tableHeader(darkMode)}>
                      Service
                    </th>

                    <th className={tableHeader(darkMode)}>
                      Description
                    </th>

                    <th className={tableHeader(darkMode)}>
                      Schedule
                    </th>

                    <th className={tableHeader(darkMode)}>
                      Time
                    </th>

                    <th
                      className={`${tableHeader(
                        darkMode
                      )} text-center w-[120px]`}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {services.map((service) => (
                    <tr
                      key={
                        service.id || service.title
                      }
                      className={`
                        transition-colors
                        ${
                          darkMode
                            ? 'hover:bg-[#171333]'
                            : 'hover:bg-gray-50'
                        }
                      `}
                    >
                      <td
                        className={tableCell(
                          darkMode
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {service.icon}
                          </span>

                          <span
                            className={`
                              text-sm font-semibold
                              ${
                                darkMode
                                  ? 'text-white'
                                  : 'text-[#2A2E43]'
                              }
                            `}
                          >
                            {service.title}
                          </span>
                        </div>
                      </td>

                      <td
                        className={tableCell(
                          darkMode
                        )}
                      >
                        <span
                          className={`
                            text-xs
                            ${
                              darkMode
                                ? 'text-gray-400'
                                : 'text-gray-500'
                            }
                          `}
                        >
                          {service.desc}
                        </span>
                      </td>

                      <td
                        className={`
                          ${tableCell(darkMode)}
                          text-xs whitespace-nowrap
                        `}
                      >
                        {service.subtitle}
                      </td>

                      <td
                        className={`
                          ${tableCell(darkMode)}
                          text-xs whitespace-nowrap
                        `}
                      >
                        {service.time}
                      </td>

                      <td
                        className={tableCell(
                          darkMode
                        )}
                      >
                        <div className="flex justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              openEditService(
                                service
                              )
                            }
                            className={`
                              w-8 h-8 rounded-lg
                              border
                              flex items-center justify-center
                              ${
                                darkMode
                                  ? 'bg-[#171333] border-white/10 text-blue-400 hover:bg-[#29214d]'
                                  : 'bg-white border-gray-200 text-[#4E69D3] hover:bg-[#EEF0FB]'
                              }
                            `}
                            title="Edit service"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteServiceItem(
                                service
                              )
                            }
                            className={`
                              w-8 h-8 rounded-lg
                              border
                              flex items-center justify-center
                              ${
                                darkMode
                                  ? 'bg-[#171333] border-white/10 text-red-400 hover:bg-red-500/10'
                                  : 'bg-white border-gray-200 text-red-500 hover:bg-red-50'
                              }
                            `}
                            title="Delete service"
                          >
                            <Trash2 size={14} />
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
      </section>


      <section className="mt-8">
        <div className="mb-4">
          <h2
            className={`
              text-xl sm:text-2xl font-bold
              ${
                darkMode
                  ? 'text-white'
                  : 'text-[#1d4662]'
              }
            `}
          >
            Major Services
          </h2>

          <p
            className={`
              text-xs mt-1
              ${
                darkMode
                  ? 'text-gray-500'
                  : 'text-gray-400'
              }
            `}
          >
            Reference services handled by Rural Health
            Units.
          </p>
        </div>

        <div
          className={`
            flex items-start gap-3
            p-4 mb-4
            rounded-xl border
            ${
              darkMode
                ? 'bg-[#211a3d] border-white/10'
                : 'bg-[#F8F9FE] border-[#E1E5F5]'
            }
          `}
        >
          <div
            className="
              w-8 h-8 rounded-lg
              bg-[#EEF0FB]
              text-[#4E69D3]
              flex items-center justify-center
              flex-shrink-0
            "
          >
            <span className="text-sm font-bold">i</span>
          </div>

          <div>
            <p
              className={`
                text-sm font-semibold
                ${
                  darkMode
                    ? 'text-white'
                    : 'text-[#1d4662]'
                }
              `}
            >
              RHU-Exclusive Services
            </p>

            <p
              className={`
                text-xs mt-1 leading-relaxed
                ${
                  darkMode
                    ? 'text-gray-400'
                    : 'text-gray-500'
                }
              `}
            >
              These major services are exclusively
              available at Rural Health Units (RHUs)
              and are not offered here in our Barangay
              Sumapang Matanda Health Center.
            </p>
          </div>
        </div>

        <div
          className={`
            rounded-xl border p-4
            ${
              darkMode
                ? 'bg-[#211a3d] border-white/10'
                : 'bg-white border-gray-200'
            }
          `}
        >
          <div
            className="
              grid
              grid-cols-1
              sm:grid-cols-2
              lg:grid-cols-3
              xl:grid-cols-4
              gap-4
            "
          >
            {majorServices.map((service) => (
              <div
                key={service.title}
                className={`
                  p-4 rounded-xl border
                  transition-colors
                  ${
                    darkMode
                      ? 'bg-[#171333] border-white/10 hover:border-white/20'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="
                      w-10 h-10 rounded-lg
                      bg-[#F3F4FA]
                      flex items-center justify-center
                      text-xl
                      flex-shrink-0
                    "
                  >
                    {service.icon}
                  </div>

                  <div className="min-w-0">
                    <h3
                      className={`
                        text-sm font-bold leading-snug
                        ${
                          darkMode
                            ? 'text-white'
                            : 'text-[#2A2E43]'
                        }
                      `}
                    >
                      {service.title}
                    </h3>
                  </div>
                </div>

                <p
                  className={`
                    text-xs leading-relaxed mt-3
                    ${
                      darkMode
                        ? 'text-gray-400'
                        : 'text-gray-500'
                    }
                  `}
                >
                  {service.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {showArchive && (
        <ModalOverlay
          darkMode={darkMode}
          onClose={() => setShowArchive(false)}
        >
          <div
            className={`
              w-full max-w-5xl
              max-h-[90vh]
              rounded-xl
              overflow-hidden
              flex flex-col
              shadow-2xl
              ${
                darkMode
                  ? 'bg-[#211a3d]'
                  : 'bg-white'
              }
            `}
          >
            <ModalHeader
              darkMode={darkMode}
              title="Events Archive"
              subtitle="Completed and cancelled events"
              onClose={() => setShowArchive(false)}
            />

            <div className="flex-1 overflow-auto p-4 sm:p-5">
              {archive.length === 0 ? (
                <EmptyModalState
                  darkMode={darkMode}
                  title="No archived events"
                  description="Completed or cancelled events will appear here."
                />
              ) : (
                <div className="overflow-x-auto border rounded-lg border-inherit">
                  <table className="w-full min-w-[700px] border-collapse">
                    <thead>
                      <tr
                        className={
                          darkMode
                            ? 'bg-[#171333]'
                            : 'bg-gray-50'
                        }
                      >
                        <th className={tableHeader(darkMode)}>
                          Event
                        </th>

                        <th className={tableHeader(darkMode)}>
                          Date
                        </th>

                        <th className={tableHeader(darkMode)}>
                          Time
                        </th>

                        <th className={tableHeader(darkMode)}>
                          Type
                        </th>

                        <th className={tableHeader(darkMode)}>
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {archive.map((event, index) => {
                        const type =
                          typeColors[event.type] || {
                            bg: '#F7FAFC',
                            color: '#718096',
                            label: 'Event',
                          }

                        const displayDate =
                          event.date?.includes('-')
                            ? new Date(
                                event.date +
                                  'T00:00:00'
                              ).toLocaleDateString(
                                'en-US',
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                }
                              )
                            : event.date

                        return (
                          <tr
                            key={
                              event.id || index
                            }
                            className={
                              darkMode
                                ? 'hover:bg-[#171333]'
                                : 'hover:bg-gray-50'
                            }
                          >
                            <td
                              className={tableCell(
                                darkMode
                              )}
                            >
                              <span
                                className={`
                                  text-sm font-semibold
                                  ${
                                    darkMode
                                      ? 'text-white'
                                      : 'text-[#2A2E43]'
                                  }
                                `}
                              >
                                {event.title}
                              </span>
                            </td>

                            <td
                              className={`
                                ${tableCell(
                                  darkMode
                                )}
                                text-xs whitespace-nowrap
                              `}
                            >
                              {displayDate}
                            </td>

                            <td
                              className={`
                                ${tableCell(
                                  darkMode
                                )}
                                text-xs whitespace-nowrap
                              `}
                            >
                              {event.time}
                            </td>

                            <td
                              className={tableCell(
                                darkMode
                              )}
                            >
                              <span
                                className="inline-flex px-2 py-1 rounded-md text-[10px] font-bold"
                                style={{
                                  background:
                                    type.bg,
                                  color:
                                    type.color,
                                }}
                              >
                                {type.label}
                              </span>
                            </td>

                            <td
                              className={tableCell(
                                darkMode
                              )}
                            >
                              <span
                                className={`
                                  inline-flex
                                  px-2 py-1
                                  rounded-full
                                  text-[10px]
                                  font-bold
                                  ${
                                    event.status ===
                                    'Done'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-red-100 text-red-700'
                                  }
                                `}
                              >
                                {event.status}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <ModalFooter
              darkMode={darkMode}
              onClose={() => setShowArchive(false)}
            />
          </div>
        </ModalOverlay>
      )}


      {eventModal && (
        <ModalOverlay
          darkMode={darkMode}
          onClose={() => setEventModal(false)}
        >
          <div
            className={`
              w-full max-w-lg
              max-h-[92vh]
              rounded-xl
              overflow-hidden
              flex flex-col
              shadow-2xl
              ${
                darkMode
                  ? 'bg-[#211a3d]'
                  : 'bg-white'
              }
            `}
          >
            <ModalHeader
              darkMode={darkMode}
              title={
                eventEditItem
                  ? 'Edit Event'
                  : 'Add Event'
              }
              subtitle={
                eventEditItem
                  ? 'Update the event information'
                  : 'Schedule a new health center event'
              }
              icon={<CalendarDays size={18} />}
              onClose={() =>
                setEventModal(false)
              }
            />

            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-4">
                <FormField
                  darkMode={darkMode}
                  label="Event Title"
                  required
                >
                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        title: e.target.value,
                      })
                    }
                    placeholder="e.g. Anti-Rabies Vaccination"
                    className={inputClass(darkMode)}
                  />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    darkMode={darkMode}
                    label="Date"
                    required
                  >
                    <input
                      type="text"
                      value={eventForm.date}
                      onChange={(e) =>
                        setEventForm({
                          ...eventForm,
                          date: formatDateInput(
                            e.target.value
                          ),
                        })
                      }
                      placeholder="MM/DD/YYYY"
                      maxLength={10}
                      className={inputClass(
                        darkMode
                      )}
                    />
                  </FormField>

                  <FormField
                    darkMode={darkMode}
                    label="Time"
                    required
                  >
                    <input
                      type="text"
                      value={eventForm.time}
                      onChange={(e) =>
                        setEventForm({
                          ...eventForm,
                          time: e.target.value,
                        })
                      }
                      placeholder="8:00am - 5:00pm"
                      className={inputClass(
                        darkMode
                      )}
                    />
                  </FormField>
                </div>

                <FormField
                  darkMode={darkMode}
                  label="Event Type"
                  required
                >
                  <select
                    value={eventForm.type}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        type: e.target.value,
                      })
                    }
                    className={inputClass(
                      darkMode
                    )}
                  >
                    {Object.entries(
                      typeColors
                    ).map(([key, value]) => (
                      <option
                        key={key}
                        value={key}
                      >
                        {value.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  darkMode={darkMode}
                  label="Status"
                  required
                >
                  <select
                    value={eventForm.status}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        status:
                          e.target
                            .value as EventItem['status'],
                      })
                    }
                    className={inputClass(
                      darkMode
                    )}
                  >
                    <option value="Scheduled">
                      Scheduled
                    </option>
                    <option value="Done">
                      Done — Move to Archive
                    </option>
                    <option value="Cancelled">
                      Cancelled — Move to Archive
                    </option>
                  </select>
                </FormField>
              </div>
            </div>

            <ModalActions
              darkMode={darkMode}
              saving={savingEvent}
              onCancel={() =>
                setEventModal(false)
              }
              onSave={saveEvent}
              saveLabel={
                eventEditItem
                  ? 'Save Changes'
                  : 'Add Event'
              }
            />
          </div>
        </ModalOverlay>
      )}


      {serviceModal && (
        <ModalOverlay
          darkMode={darkMode}
          onClose={() =>
            setServiceModal(false)
          }
        >
          <div
            className={`
              w-full max-w-lg
              max-h-[92vh]
              rounded-xl
              overflow-hidden
              flex flex-col
              shadow-2xl
              ${
                darkMode
                  ? 'bg-[#211a3d]'
                  : 'bg-white'
              }
            `}
          >
            <ModalHeader
              darkMode={darkMode}
              title={
                serviceEditItem
                  ? 'Edit Service'
                  : 'Add Service'
              }
              subtitle={
                serviceEditItem
                  ? 'Update the service information'
                  : 'Create a new health center service'
              }
              icon={<Pencil size={17} />}
              onClose={() =>
                setServiceModal(false)
              }
            />

            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-4">
                <div className="grid grid-cols-[90px_1fr] gap-4">
                  <FormField
                    darkMode={darkMode}
                    label="Icon"
                    required
                  >
                    <input
                      type="text"
                      value={serviceForm.icon}
                      onChange={(e) =>
                        setServiceForm({
                          ...serviceForm,
                          icon: e.target.value,
                        })
                      }
                      className={inputClass(
                        darkMode
                      )}
                    />
                  </FormField>

                  <FormField
                    darkMode={darkMode}
                    label="Service Title"
                    required
                  >
                    <input
                      type="text"
                      value={serviceForm.title}
                      onChange={(e) =>
                        setServiceForm({
                          ...serviceForm,
                          title: e.target.value,
                        })
                      }
                      placeholder="e.g. Basic Consultation"
                      className={inputClass(
                        darkMode
                      )}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    darkMode={darkMode}
                    label="Schedule"
                    required
                  >
                    <input
                      type="text"
                      value={serviceForm.subtitle}
                      onChange={(e) =>
                        setServiceForm({
                          ...serviceForm,
                          subtitle:
                            e.target.value,
                        })
                      }
                      placeholder="Monday to Friday"
                      className={inputClass(
                        darkMode
                      )}
                    />
                  </FormField>

                  <FormField
                    darkMode={darkMode}
                    label="Time"
                    required
                  >
                    <input
                      type="text"
                      value={serviceForm.time}
                      onChange={(e) =>
                        setServiceForm({
                          ...serviceForm,
                          time: e.target.value,
                        })
                      }
                      placeholder="8:00am - 5:00pm"
                      className={inputClass(
                        darkMode
                      )}
                    />
                  </FormField>
                </div>

                <FormField
                  darkMode={darkMode}
                  label="Description"
                  required
                >
                  <textarea
                    value={serviceForm.desc}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        desc: e.target.value,
                      })
                    }
                    rows={5}
                    placeholder="Short description of the service..."
                    className={`${inputClass(
                      darkMode
                    )} resize-y`}
                  />
                </FormField>
              </div>
            </div>

            <ModalActions
              darkMode={darkMode}
              saving={savingService}
              onCancel={() =>
                setServiceModal(false)
              }
              onSave={saveService}
              saveLabel={
                serviceEditItem
                  ? 'Save Changes'
                  : 'Add Service'
              }
              saveColor="blue"
            />
          </div>
        </ModalOverlay>
      )}



      {deleteEventItem && (
        <DeleteModal
          darkMode={darkMode}
          title="Delete Event?"
          itemName={deleteEventItem.title}
          onCancel={() =>
            setDeleteEventItem(null)
          }
          onConfirm={confirmDeleteEvent}
        />
      )}



      {deleteServiceItem && (
        <DeleteModal
          darkMode={darkMode}
          title="Delete Service?"
          itemName={deleteServiceItem.title}
          onCancel={() =>
            setDeleteServiceItem(null)
          }
          onConfirm={confirmDeleteService}
        />
      )}
    </div>
  )
}



function ModalOverlay({
  darkMode,
  children,
  onClose,
}: {
  darkMode: boolean
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="
        fixed inset-0 z-[1000]
        bg-black/50 backdrop-blur-sm
        flex items-center justify-center
        p-3 sm:p-5
      "
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full flex justify-center"
      >
        {children}
      </div>
    </div>
  )
}

function ModalHeader({
  darkMode,
  title,
  subtitle,
  icon,
  onClose,
}: {
  darkMode: boolean
  title: string
  subtitle?: string
  icon?: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      className={`
        flex items-center justify-between
        gap-4
        px-5 py-4
        border-b
        ${
          darkMode
            ? 'border-white/10'
            : 'border-gray-200'
        }
      `}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div
            className="
              w-9 h-9 rounded-lg
              bg-[#EEF0FB]
              text-[#4E69D3]
              flex items-center justify-center
              flex-shrink-0
            "
          >
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <h2
            className={`
              text-base font-bold
              ${
                darkMode
                  ? 'text-white'
                  : 'text-[#2A2E43]'
              }
            `}
          >
            {title}
          </h2>

          {subtitle && (
            <p
              className={`
                text-xs mt-0.5
                ${
                  darkMode
                    ? 'text-gray-500'
                    : 'text-gray-400'
                }
              `}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className={`
          w-8 h-8 rounded-lg
          flex items-center justify-center
          transition-colors
          flex-shrink-0
          ${
            darkMode
              ? 'bg-[#171333] text-gray-400 hover:text-white hover:bg-[#29214d]'
              : 'bg-gray-50 text-gray-500 hover:text-gray-800 hover:bg-gray-100'
          }
        `}
      >
        <X size={17} />
      </button>
    </div>
  )
}

function ModalFooter({
  darkMode,
  onClose,
}: {
  darkMode: boolean
  onClose: () => void
}) {
  return (
    <div
      className={`
        flex justify-end
        px-5 py-3
        border-t
        ${
          darkMode
            ? 'border-white/10'
            : 'border-gray-200'
        }
      `}
    >
      <button
        type="button"
        onClick={onClose}
        className={`
          px-4 py-2
          rounded-lg
          text-sm font-semibold
          transition-colors
          ${
            darkMode
              ? 'bg-[#171333] text-gray-200 hover:bg-[#29214d]'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }
        `}
      >
        Close
      </button>
    </div>
  )
}

function ModalActions({
  darkMode,
  saving,
  onCancel,
  onSave,
  saveLabel,
  saveColor = 'green',
}: {
  darkMode: boolean
  saving: boolean
  onCancel: () => void
  onSave: () => void
  saveLabel: string
  saveColor?: 'green' | 'blue'
}) {
  return (
    <div
      className={`
        flex justify-end gap-2
        px-5 py-3
        border-t
        ${
          darkMode
            ? 'border-white/10'
            : 'border-gray-200'
        }
      `}
    >
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className={`
          px-4 py-2.5
          rounded-lg
          border
          text-sm font-semibold
          transition-colors
          ${
            darkMode
              ? 'border-white/10 text-gray-300 hover:bg-[#171333]'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }
        `}
      >
        Cancel
      </button>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className={`
          inline-flex items-center gap-2
          px-4 py-2.5
          rounded-lg
          text-sm font-semibold
          text-white
          transition-colors
          ${
            saveColor === 'blue'
              ? 'bg-[#4E69D3] hover:bg-[#3D56B8]'
              : 'bg-[#2EB67D] hover:bg-[#259A6B]'
          }
        `}
      >
        {saving && (
          <Loader2
            size={15}
            className="animate-spin"
          />
        )}

        {saveLabel}
      </button>
    </div>
  )
}

function DeleteModal({
  darkMode,
  title,
  itemName,
  onCancel,
  onConfirm,
}: {
  darkMode: boolean
  title: string
  itemName: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <ModalOverlay
      darkMode={darkMode}
      onClose={onCancel}
    >
      <div
        className={`
          w-full max-w-md
          rounded-xl
          shadow-2xl
          overflow-hidden
          ${
            darkMode
              ? 'bg-[#211a3d]'
              : 'bg-white'
          }
        `}
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div
              className="
                w-10 h-10 rounded-lg
                bg-red-50
                text-red-500
                flex items-center justify-center
                flex-shrink-0
              "
            >
              <Trash2 size={19} />
            </div>

            <div className="min-w-0">
              <h2
                className={`
                  text-base font-bold
                  ${
                    darkMode
                      ? 'text-white'
                      : 'text-[#2A2E43]'
                  }
                `}
              >
                {title}
              </h2>

              <p
                className={`
                  text-sm leading-relaxed mt-1.5
                  ${
                    darkMode
                      ? 'text-gray-400'
                      : 'text-gray-500'
                  }
                `}
              >
                Are you sure you want to delete{' '}
                <strong
                  className={
                    darkMode
                      ? 'text-white'
                      : 'text-gray-800'
                  }
                >
                  {itemName}
                </strong>
                ? This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <div
          className={`
            flex justify-end gap-2
            px-5 py-3
            border-t
            ${
              darkMode
                ? 'border-white/10'
                : 'border-gray-200'
            }
          `}
        >
          <button
            type="button"
            onClick={onCancel}
            className={`
              px-4 py-2.5
              rounded-lg
              text-sm font-semibold
              ${
                darkMode
                  ? 'bg-[#171333] text-gray-300 hover:bg-[#29214d]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="
              px-4 py-2.5
              rounded-lg
              bg-red-500
              hover:bg-red-600
              text-white
              text-sm font-semibold
              transition-colors
            "
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

function FormField({
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
        className={`
          block
          text-xs font-semibold
          mb-1.5
          ${
            darkMode
              ? 'text-gray-400'
              : 'text-gray-600'
          }
        `}
      >
        {label}

        {required && (
          <span className="text-red-500 ml-0.5">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  )
}

function EmptyModalState({
  darkMode,
  title,
  description,
}: {
  darkMode: boolean
  title: string
  description: string
}) {
  return (
    <div className="py-12 text-center">
      <div
        className={`
          w-12 h-12 rounded-full
          mx-auto mb-3
          flex items-center justify-center
          ${
            darkMode
              ? 'bg-[#171333] text-gray-500'
              : 'bg-gray-50 text-gray-300'
          }
        `}
      >
        <CalendarDays size={22} />
      </div>

      <p
        className={`
          text-sm font-semibold
          ${
            darkMode
              ? 'text-gray-300'
              : 'text-gray-600'
          }
        `}
      >
        {title}
      </p>

      <p
        className={`
          text-xs mt-1
          ${
            darkMode
              ? 'text-gray-500'
              : 'text-gray-400'
          }
        `}
      >
        {description}
      </p>
    </div>
  )
}


function inputClass(darkMode: boolean) {
  return `
    w-full
    px-3 py-2.5
    rounded-lg
    border
    outline-none
    text-sm
    transition-colors
    ${
      darkMode
        ? `
          bg-[#171333]
          border-white/10
          text-white
          placeholder:text-gray-600
          focus:border-[#4E69D3]
        `
        : `
          bg-white
          border-gray-200
          text-gray-800
          placeholder:text-gray-400
          focus:border-[#4E69D3]
          focus:ring-1
          focus:ring-[#4E69D3]/20
        `
    }
  `
}

function tableHeader(darkMode: boolean) {
  return `
    px-4 py-3
    text-left
    text-[11px]
    font-bold
    uppercase
    tracking-wide
    border-b
    ${
      darkMode
        ? 'text-gray-400 border-white/10'
        : 'text-gray-500 border-gray-200'
    }
  `
}

function tableCell(darkMode: boolean) {
  return `
    px-4 py-3
    border-b
    ${
      darkMode
        ? 'border-white/10'
        : 'border-gray-100'
    }
  `
}