export type PatientNotification = {
  id: number
  category: 'Appointment' | 'Records' | 'Account'
  title: string
  description: string
  time: string
  unread: boolean
}

export const initialNotifications: PatientNotification[] = [
  {
    id: 1,
    category: 'Account',
    title: 'Account Approved',
    description:
      'Your account has been approved. You can now book appointments and manage your health records.',
    time: '2 days ago',
    unread: true,
  },
  {
    id: 2,
    category: 'Appointment',
    title: 'Appointment Confirmed',
    description:
      'Your Anti-Rabies Vaccination appointment has been confirmed for tomorrow at 7:00 AM.',
    time: '1 day ago',
    unread: true,
  },
  {
    id: 3,
    category: 'Appointment',
    title: 'Upcoming Appointment Reminder',
    description:
      'You have a Basic Consultation scheduled for Monday at 9:00 AM. Please arrive 15 minutes early.',
    time: '5 hours ago',
    unread: true,
  },
  {
    id: 4,
    category: 'Records',
    title: 'New Record Added',
    description:
      'Your latest blood pressure reading has been added to your medical records.',
    time: '3 hours ago',
    unread: false,
  },
  {
    id: 5,
    category: 'Account',
    title: 'Profile Updated',
    description:
      'Your profile information was successfully updated. No further action is needed.',
    time: '1 week ago',
    unread: false,
  },
]

export const categoryColors: Record<PatientNotification['category'], string> = {
  Appointment: '#4E69D3',
  Records: '#0F588B',
  Account: '#16A34A',
}
