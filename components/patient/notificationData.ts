import type { NotificationCategory } from '@/lib/actions/notifications'

export type PatientNotification = {
  id: string
  category: NotificationCategory
  title: string
  description: string
  time: string
  unread: boolean
}

export const categoryColors: Record<NotificationCategory, string> = {
  Appointment: '#4E69D3',
  Records: '#0F588B',
  Account: '#16A34A',
  'Approval Request': '#F59E0B',
}