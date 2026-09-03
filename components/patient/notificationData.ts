import type { NotificationCategory } from '@/lib/actions/notifications'

// This file defines the structure and types for patient notifications in the Meditrack application. It includes the PatientNotification type, which represents a notification with properties such as id, category, title, description, time, and unread status. Additionally, it defines a mapping of notification categories to their corresponding colors for UI representation.
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