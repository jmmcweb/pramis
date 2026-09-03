'use server'

import prisma from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { requireUser, requireAdmin } from '@/lib/actions/guard'
import { nextReferenceId } from '@/lib/referenceId'

export type EventItem = {
  id?: string
  title: string
  date: string
  time: string
  type: string
  status?: 'Scheduled' | 'Done' | 'Cancelled'
  description?: string
  active?: boolean
  createdAt?: Date
  updatedAt?: Date
}

// Fetches the list of events from the database. If no events are found, it seeds the database with default events. The function returns a structured response containing the success status, message, and arrays of EventItem objects representing all events, scheduled events, and archived events.
function parseEvent(e: any): EventItem {
  let meta: {
    time?: string
    type?: string
    status?: 'Scheduled' | 'Done' | 'Cancelled'
    notes?: string
  } = {}
  try {
    if (e.description && e.description.startsWith('{')) {
      meta = JSON.parse(e.description)
    } else if (e.description) {
      meta = { notes: e.description }
    }
  } catch {
    meta = { notes: e.description || '' }
  }

  const isoDate =
    e.startDate instanceof Date
      ? e.startDate.toISOString().split('T')[0]
      : String(e.startDate).split('T')[0]

  return {
    id: e.eventid,
    title: e.name,
    date: isoDate,
    time: meta.time || '8:00am - 5:00pm',
    type: meta.type || 'consultation',
    status: (meta.status || (e.status ? 'Scheduled' : 'Done')) as
      | 'Scheduled'
      | 'Done'
      | 'Cancelled',
    description: meta.notes || '',
    active: e.status,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }
}

// Formats the event description as a JSON string containing time, type, status, and notes. This function is used to standardize the event description before storing it in the database.
function formatDescription(meta: {
  time?: string
  type?: string
  status?: string
  notes?: string
}) {
  return JSON.stringify({
    time: meta.time || '8:00am - 5:00pm',
    type: meta.type || 'consultation',
    status: meta.status || 'Scheduled',
    notes: meta.notes || '',
  })
}

// Defines the default set of events to seed the database with if no events are found.
const defaultSeedEvents = [
  {
    title: 'Anti-Rabies Vaccination',
    dateOffset: 0,
    time: '7:00am to 9:00am',
    type: 'vaccination',
    status: 'Scheduled',
  },
  {
    title: 'Blood Donation Program',
    dateOffset: 1,
    time: '3:00pm to 5:00pm',
    type: 'donation',
    status: 'Scheduled',
  },
  {
    title: 'Mental Health Screening',
    dateOffset: 2,
    time: '3:00pm to 5:00pm',
    type: 'screening',
    status: 'Scheduled',
  },
  {
    title: 'Basic Consultation',
    dateOffset: 4,
    time: '8:00am to 5:00pm',
    type: 'consultation',
    status: 'Scheduled',
  },
  {
    title: 'Maternal and Child Care',
    dateOffset: 4,
    time: '8:00am to 12:00pm',
    type: 'maternal',
    status: 'Scheduled',
  },
  {
    title: 'Dental Care',
    dateOffset: 6,
    time: '8:00am to 5:00pm',
    type: 'dental',
    status: 'Scheduled',
  },
  {
    title: 'Immunization and Vaccination',
    dateOffset: 8,
    time: '8:00am to 5:00pm',
    type: 'vaccination',
    status: 'Scheduled',
  },
  {
    title: 'Family Planning & Reproductive Health',
    dateOffset: 10,
    time: '8:00am to 5:00pm',
    type: 'family',
    status: 'Scheduled',
  },
  {
    title: 'Blood Donation Program',
    dateOffset: 14,
    time: '3:00pm to 5:00pm',
    type: 'donation',
    status: 'Scheduled',
  },
  {
    title: 'Anti-Rabies Vaccination',
    dateOffset: 18,
    time: '7:00am to 9:00am',
    type: 'vaccination',
    status: 'Scheduled',
  },
  {
    title: 'Mental Health Screening',
    dateOffset: 24,
    time: '3:00pm to 5:00pm',
    type: 'screening',
    status: 'Scheduled',
  },
  {
    title: 'Free Blood Pressure Screening',
    dateOffset: -30,
    time: '8:00am to 12:00pm',
    type: 'screening',
    status: 'Done',
  },
  {
    title: 'Community Health Fair',
    dateOffset: -28,
    time: '9:00am to 4:00pm',
    type: 'consultation',
    status: 'Done',
  },
  {
    title: 'Dental Mission',
    dateOffset: -26,
    time: '8:00am to 3:00pm',
    type: 'dental',
    status: 'Done',
  },
  {
    title: 'COVID-19 Booster Shot Drive',
    dateOffset: -24,
    time: '8:00am to 5:00pm',
    type: 'vaccination',
    status: 'Done',
  },
  {
    title: 'Wellness Webinar',
    dateOffset: -22,
    time: '10:00am to 11:30am',
    type: 'screening',
    status: 'Cancelled',
  },
  {
    title: 'Zumba Fitness Event',
    dateOffset: -20,
    time: '6:00am to 8:00am',
    type: 'family',
    status: 'Cancelled',
  },
  {
    title: 'Nutrition Seminar',
    dateOffset: -18,
    time: '1:00pm to 3:00pm',
    type: 'maternal',
    status: 'Cancelled',
  },
  {
    title: 'Eye Check-up Campaign',
    dateOffset: -16,
    time: '8:00am to 5:00pm',
    type: 'consultation',
    status: 'Done',
  },
  {
    title: 'Blood Letting Activity',
    dateOffset: -14,
    time: '9:00am to 4:00pm',
    type: 'donation',
    status: 'Cancelled',
  },
]

// Fetches the list of events from the database. If no events are found, it seeds the database with default events. The function returns a structured response containing the success status, message, and arrays of EventItem objects representing all events, scheduled events, and archived events.
export async function getEvents() {
  try {
    let rawEvents = await (prisma as any).event.findMany({
      orderBy: { startDate: 'asc' },
    })

    if (rawEvents.length === 0) {
      const now = new Date()
      const created = []
      for (const item of defaultSeedEvents) {
        const d = new Date(now)
        d.setDate(d.getDate() + item.dateOffset)
        const isScheduled = item.status === 'Scheduled'

        const ev = await (prisma as any).event.create({
          data: {
            eventid: await nextReferenceId('EVT'),
            name: item.title,
            description: formatDescription({
              time: item.time,
              type: item.type,
              status: item.status,
            }),
            startDate: d,
            endDate: d,
            status: isScheduled,
          },
        })
        created.push(ev)
      }
      rawEvents = created
    }

    const parsed = rawEvents.map(parseEvent)
    const scheduled = parsed.filter((e: any) => e.status === 'Scheduled')
    const archive = parsed.filter(
      (e: any) => e.status === 'Done' || e.status === 'Cancelled',
    )

    return {
      success: true,
      message: 'Events fetched successfully',
      events: parsed,
      scheduled,
      archive,
    }
  } catch (error) {
    console.error('[getEvents | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch events from database.',
      events: [],
      scheduled: [],
      archive: [],
    }
  }
}

// Creates a new event in the database. The function checks user authorization and validates the input data before creating the event. It returns a structured response containing the success status, message, and the created EventItem object.

export async function createEvent(data: {
  title: string
  date: string
  time?: string
  type?: string
  status?: 'Scheduled' | 'Done' | 'Cancelled'
  description?: string
}) {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Unauthorized' }
  }

  if (!data.title || !data.title.trim()) {
    return { success: false, message: 'Event title is required.' }
  }
  if (!data.date) {
    return { success: false, message: 'Date is required.' }
  }

  const eventDate = new Date(`${data.date}T00:00:00`)
  if (isNaN(eventDate.getTime())) {
    return { success: false, message: 'Invalid date format.' }
  }

  const eventStatus = data.status || 'Scheduled'
  const isScheduled = eventStatus === 'Scheduled'

  try {
    const created = await (prisma as any).event.create({
      data: {
        eventid: await nextReferenceId('EVT'),
        name: data.title.trim(),
        description: formatDescription({
          time: data.time || '8:00am - 5:00pm',
          type: data.type || 'consultation',
          status: eventStatus,
          notes: data.description || '',
        }),
        startDate: eventDate,
        endDate: eventDate,
        status: isScheduled,
      },
    })

    revalidateTag('events', 'max')

    return {
      success: true,
      message: 'Event created successfully in database.',
      event: parseEvent(created),
    }
  } catch (error) {
    console.error('[createEvent | Prisma | Error]:', error)
    return { success: false, message: 'Failed to create event in database.' }
  }
}

// Updates an existing event in the database. The function checks user authorization and validates the input data before updating the event. It returns a structured response containing the success status, message, and the updated EventItem object.
export async function updateEvent(data: {
  id: string
  title?: string
  date?: string
  time?: string
  type?: string
  status?: 'Scheduled' | 'Done' | 'Cancelled'
  description?: string
}) {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Unauthorized' }
  }

  if (!data.id) {
    return { success: false, message: 'Event ID is required.' }
  }

  try {
    const updateData: any = {}
    if (data.title && data.title.trim()) updateData.name = data.title.trim()
    if (data.date) {
      const eventDate = new Date(`${data.date}T00:00:00`)
      if (!isNaN(eventDate.getTime())) {
        updateData.startDate = eventDate
        updateData.endDate = eventDate
      }
    }

    if (data.status !== undefined) {
      updateData.status = data.status === 'Scheduled'
    }

    const eventStatus = data.status || 'Scheduled'
    updateData.description = formatDescription({
      time: data.time || '8:00am - 5:00pm',
      type: data.type || 'consultation',
      status: eventStatus,
      notes: data.description || '',
    })

    const updated = await (prisma as any).event.update({
      where: { eventid: data.id },
      data: updateData,
    })

    revalidateTag('events', 'max')

    return {
      success: true,
      message: 'Event updated successfully.',
      event: parseEvent(updated),
    }
  } catch (error) {
    console.error('[updateEvent | Prisma | Error]:', error)
    return { success: false, message: 'Failed to update event in database.' }
  }
}

// Deletes an event from the database based on the provided event ID. The function checks user authorization and validates the input data before performing the deletion. It returns a structured response containing the success status and message indicating the result of the operation.
export async function deleteEvent(id: string) {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Unauthorized' }
  }

  if (!id) {
    return { success: false, message: 'Event ID is required.' }
  }

  try {
    await (prisma as any).event.delete({
      where: { eventid: id },
    })

    revalidateTag('events', 'max')

    return { success: true, message: 'Event deleted successfully from database.' }
  } catch (error) {
    console.error('[deleteEvent | Prisma | Error]:', error)
    return { success: false, message: 'Failed to delete event from database.' }
  }
}
