import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import bcrypt from 'bcrypt'

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function nextReferenceId(prefix: string, table: string, column: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ next: number }>>(
    `SELECT COALESCE(MAX(CAST(SPLIT_PART("${column}", '-', 2) AS INTEGER)), 1000) + 1 AS next
     FROM "${table}"
     WHERE "${column}" LIKE $1`,
    `${prefix}-%`,
  )
  return `${prefix}-${rows[0]?.next || 1001}`
}

const defaultServices = [
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

const defaultEvents = [
  { title: 'Anti-Rabies Vaccination', dateOffset: 0, time: '7:00am to 9:00am', type: 'vaccination', status: 'Scheduled' },
  { title: 'Blood Donation Program', dateOffset: 1, time: '3:00pm to 5:00pm', type: 'donation', status: 'Scheduled' },
  { title: 'Mental Health Screening', dateOffset: 2, time: '3:00pm to 5:00pm', type: 'screening', status: 'Scheduled' },
  { title: 'Basic Consultation', dateOffset: 4, time: '8:00am to 5:00pm', type: 'consultation', status: 'Scheduled' },
  { title: 'Maternal and Child Care', dateOffset: 4, time: '8:00am to 12:00pm', type: 'maternal', status: 'Scheduled' },
  { title: 'Dental Care', dateOffset: 6, time: '8:00am to 5:00pm', type: 'dental', status: 'Scheduled' },
  { title: 'Immunization and Vaccination', dateOffset: 8, time: '8:00am to 5:00pm', type: 'vaccination', status: 'Scheduled' },
  { title: 'Family Planning & Reproductive Health', dateOffset: 10, time: '8:00am to 5:00pm', type: 'family', status: 'Scheduled' },
  { title: 'Blood Donation Program', dateOffset: 14, time: '3:00pm to 5:00pm', type: 'donation', status: 'Scheduled' },
  { title: 'Anti-Rabies Vaccination', dateOffset: 18, time: '7:00am to 9:00am', type: 'vaccination', status: 'Scheduled' },
  { title: 'Mental Health Screening', dateOffset: 24, time: '3:00pm to 5:00pm', type: 'screening', status: 'Scheduled' },

  { title: 'Free Blood Pressure Screening', dateOffset: -30, time: '8:00am to 12:00pm', type: 'screening', status: 'Done' },
  { title: 'Community Health Fair', dateOffset: -28, time: '9:00am to 4:00pm', type: 'consultation', status: 'Done' },
  { title: 'Dental Mission', dateOffset: -26, time: '8:00am to 3:00pm', type: 'dental', status: 'Done' },
  { title: 'COVID-19 Booster Shot Drive', dateOffset: -24, time: '8:00am to 5:00pm', type: 'vaccination', status: 'Done' },
  { title: 'Wellness Webinar', dateOffset: -22, time: '10:00am to 11:30am', type: 'screening', status: 'Cancelled' },
  { title: 'Zumba Fitness Event', dateOffset: -20, time: '6:00am to 8:00am', type: 'family', status: 'Cancelled' },
  { title: 'Nutrition Seminar', dateOffset: -18, time: '1:00pm to 3:00pm', type: 'maternal', status: 'Cancelled' },
  { title: 'Eye Check-up Campaign', dateOffset: -16, time: '8:00am to 5:00pm', type: 'consultation', status: 'Done' },
  { title: 'Blood Letting Activity', dateOffset: -14, time: '9:00am to 4:00pm', type: 'donation', status: 'Cancelled' },
]

async function main() {
  const defaultEmail = 'admin@domain.com'
  const passwordHash = await bcrypt.hash('defaultpass', 10)

  const admin = await prisma.user.upsert({
    where: { email: defaultEmail },
    update: {},
    create: {
      id: 'ADM-1000',
      email: defaultEmail,
      password: passwordHash,
      role: 'SUPERADMIN',
    },
  })

  const staff = await prisma.user.upsert({
    where: { email: 'staff@domain.com' },
    update: {},
    create: {
      id: 'MS-1000',
      email: 'staff@domain.com',
      password: passwordHash,
      role: 'STAFF',
    },
  })

  console.log('✅ Seeded admin user:', admin.email)
  console.log('✅ Seeded staff user:', staff.email)

  const existingServices = await prisma.service.findMany()
  if (existingServices.length === 0) {
    for (const item of defaultServices) {
      await prisma.service.create({
        data: {
          serviceid: await nextReferenceId('SVC', 'Service', 'serviceid'),
          name: item.title,
          description: JSON.stringify({
            desc: item.desc,
            subtitle: item.subtitle,
            time: item.time,
            icon: item.icon,
          }),
          availability: true,
        },
      })
    }
    console.log(`✅ Seeded ${defaultServices.length} clinic services`)
  }

  const existingEvents = await prisma.event.findMany()
  const hasScheduledEvents = existingEvents.some((e) => {
    try {
      const meta = JSON.parse(e.description)
      return (meta.status || (e.status ? 'Scheduled' : 'Done')) === 'Scheduled'
    } catch {
      return Boolean(e.status)
    }
  })

  if (existingEvents.length === 0) {
    const now = new Date()
    for (const item of defaultEvents) {
      const d = new Date(now)
      d.setDate(d.getDate() + item.dateOffset)
      await prisma.event.create({
        data: {
          eventid: await nextReferenceId('EVT', 'Event', 'eventid'),
          name: item.title,
          description: JSON.stringify({
            time: item.time,
            type: item.type,
            status: item.status,
          }),
          startDate: d,
          endDate: d,
          status: item.status === 'Scheduled',
        },
      })
    }
    console.log(`✅ Seeded ${defaultEvents.length} clinic events`)
  } else if (!hasScheduledEvents) {
    const now = new Date()
    const scheduledDefaults = defaultEvents.filter(
      (item) => item.status === 'Scheduled',
    )
    for (const item of scheduledDefaults) {
      const d = new Date(now)
      d.setDate(d.getDate() + item.dateOffset)
      await prisma.event.create({
        data: {
          eventid: await nextReferenceId('EVT', 'Event', 'eventid'),
          name: item.title,
          description: JSON.stringify({
            time: item.time,
            type: item.type,
            status: item.status,
          }),
          startDate: d,
          endDate: d,
          status: true,
        },
      })
    }
    console.log(`✅ Topped up ${scheduledDefaults.length} scheduled events`)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
