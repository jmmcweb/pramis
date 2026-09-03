// Guarded, exported entry point: verifies the caller is a user
'use server'

import prisma from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { requireUser, requireAdmin } from '@/lib/actions/guard'
import { nextReferenceId } from '@/lib/referenceId'

export type ServiceItem = {
  id?: string
  title: string
  subtitle: string
  time: string
  icon: string
  desc: string
  availability?: boolean
  createdAt?: Date
  updatedAt?: Date
}

// Parses a raw service object from the database and converts it into a structured ServiceItem. It extracts metadata from the service description, such as subtitle, time, and icon, and returns a ServiceItem with the relevant properties. If the description is not in JSON format, it defaults to using the raw description as the service description.
function parseService(s: any): ServiceItem {
  let meta: { desc?: string; subtitle?: string; time?: string; icon?: string } =
    {}
  try {
    if (s.description && s.description.startsWith('{')) {
      meta = JSON.parse(s.description)
    } else if (s.description) {
      meta = { desc: s.description }
    }
  } catch {
    meta = { desc: s.description || '' }
  }

  return {
    id: s.serviceid,
    title: s.name,
    desc: meta.desc || s.description || '',
    subtitle: meta.subtitle || 'Monday to Friday',
    time: meta.time || '8:00am - 5:00pm',
    icon: meta.icon || '🩺',
    availability: s.availability ?? true,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }
}

function formatServiceDescription(meta: {
  desc?: string
  subtitle?: string
  time?: string
  icon?: string
}) {
  return JSON.stringify({
    desc: meta.desc || '',
    subtitle: meta.subtitle || 'Monday to Friday',
    time: meta.time || '8:00am - 5:00pm',
    icon: meta.icon || '🩺',
  })
}

const defaultSeedServices = [
  {
    title: 'Basic Consultation',
    subtitle: 'Monday to Friday',
    time: '8:00am - 5:00pm',
    icon: '👩‍⚕️',
    desc: 'General medical consultation for patients of all ages. Includes check-ups, diagnosis, and treatment recommendations.',
  },
  {
    title: 'Pre-natal Care',
    subtitle: 'Tuesday',
    time: '8:00am - 5:00pm',
    icon: '🤰',
    desc: 'Comprehensive care for pregnant women including check-ups, nutritional counseling, and monitoring of fetal development.',
  },
  {
    title: 'National Immunization Program (NIP)',
    subtitle: 'Wednesday to Friday',
    time: '8:00am - 5:00pm',
    icon: '💉',
    desc: 'Routine immunization for infants, children, and adults following the national vaccination schedule.',
  },
  {
    title: 'Hypertension Detection and Management (HDM)',
    subtitle: 'Monday to Friday',
    time: '8:00am - 5:00pm',
    icon: '🩸',
    desc: 'Blood pressure screening, monitoring, and treatment for hypertensive patients.',
  },
  {
    title: 'Visual Inspection with Acetic Acid (VIA)',
    subtitle: 'Thursday',
    time: '8:00am - 5:00pm',
    icon: '🔬',
    desc: 'Cervical cancer screening procedure for early detection of abnormalities.',
  },
  {
    title: 'Family Planning',
    subtitle: 'Thursday',
    time: '8:00am - 5:00pm',
    icon: '🧬',
    desc: 'Counseling and services for various family planning methods, reproductive health education, and informed choice.',
  },
  {
    title: 'Pills and Condoms',
    subtitle: 'Monday to Friday',
    time: '8:00am - 5:00pm',
    icon: '💊',
    desc: 'Distribution and counseling on oral contraceptive pills and condoms for safe and responsible family planning.',
  },
  {
    title: 'Adolescent Health and Development Program',
    subtitle: 'Saturday',
    time: '8:00am - 12:00pm',
    icon: '🧑',
    desc: 'Health services and education tailored for adolescents including reproductive health, mental health, and life skills.',
  },
]

// Fetches the list of services from the database. If no services are found, it seeds the database with default services. The function returns a success status, message, and an array of ServiceItem objects representing the available services. If an error occurs during the database query or seeding process, it logs the error and returns a failure status with an empty services array.
export async function getServices() {
  try {
    let rawServices = await (prisma as any).service.findMany({
      orderBy: { createdAt: 'asc' },
    })

    if (rawServices.length === 0) {
      const created = []
      for (const item of defaultSeedServices) {
        const s = await (prisma as any).service.create({
          data: {
            serviceid: await nextReferenceId('SVC'),
            name: item.title,
            description: formatServiceDescription({
              desc: item.desc,
              subtitle: item.subtitle,
              time: item.time,
              icon: item.icon,
            }),
            availability: true,
          },
        })
        created.push(s)
      }
      rawServices = created
    }

    return {
      success: true,
      message: 'Services fetched successfully',
      services: rawServices.map(parseService),
    }
  } catch (error) {
    console.error('[getServices | Prisma | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch services from database.',
      services: [],
    }
  }
}

export async function createService(data: {
  title: string
  subtitle?: string
  time?: string
  icon?: string
  desc?: string
  availability?: boolean
}) {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Unauthorized' }
  }

  if (!data.title || !data.title.trim()) {
    return { success: false, message: 'Service title is required.' }
  }

  try {
    const created = await (prisma as any).service.create({
      data: {
        serviceid: await nextReferenceId('SVC'),
        name: data.title.trim(),
        description: formatServiceDescription({
          desc: data.desc || '',
          subtitle: data.subtitle || 'Monday to Friday',
          time: data.time || '8:00am - 5:00pm',
          icon: data.icon || '🩺',
        }),
        availability: data.availability !== undefined ? data.availability : true,
      },
    })

    revalidateTag('services', 'max')

    return {
      success: true,
      message: 'Service created successfully in database.',
      service: parseService(created),
    }
  } catch (error) {
    console.error('[createService | Prisma | Error]:', error)
    return { success: false, message: 'Failed to create service in database.' }
  }
}

export async function updateService(data: {
  id: string
  title?: string
  subtitle?: string
  time?: string
  icon?: string
  desc?: string
  availability?: boolean
}) {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Unauthorized' }
  }

  if (!data.id) {
    return { success: false, message: 'Service ID is required.' }
  }

  try {
    const updateData: any = {}
    if (data.title && data.title.trim()) updateData.name = data.title.trim()
    if (data.availability !== undefined) updateData.availability = data.availability

    updateData.description = formatServiceDescription({
      desc: data.desc || '',
      subtitle: data.subtitle || 'Monday to Friday',
      time: data.time || '8:00am - 5:00pm',
      icon: data.icon || '🩺',
    })

    const updated = await (prisma as any).service.update({
      where: { serviceid: data.id },
      data: updateData,
    })

    revalidateTag('services', 'max')

    return {
      success: true,
      message: 'Service updated successfully in database.',
      service: parseService(updated),
    }
  } catch (error) {
    console.error('[updateService | Prisma | Error]:', error)
    return { success: false, message: 'Failed to update service in database.' }
  }
}

export async function deleteService(id: string) {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Unauthorized' }
  }

  if (!id) {
    return { success: false, message: 'Service ID is required.' }
  }

  try {
    await (prisma as any).service.delete({
      where: { serviceid: id },
    })

    revalidateTag('services', 'max')

    return { success: true, message: 'Service deleted successfully from database.' }
  } catch (error) {
    console.error('[deleteService | Prisma | Error]:', error)
    return { success: false, message: 'Failed to delete service from database.' }
  }
}
