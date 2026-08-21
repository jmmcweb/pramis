import { PatientNotification, categoryColors } from './notificationData'

export default function NotificationCard({ notification }: { notification: PatientNotification }) {
  return (
    <article className="bg-card rounded-3xl shadow-card p-4 flex gap-3.5">
      <span
        className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
        style={{ background: categoryColors[notification.category] }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span
            className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full uppercase tracking-[0.5px]"
            style={{ background: categoryColors[notification.category] }}
          >
            {notification.category}
          </span>
          {notification.unread && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
        </div>
        <h2 className="font-poppins text-[15px] font-bold text-body m-0">{notification.title}</h2>
        <p className="text-[13px] text-muted leading-relaxed my-1">{notification.description}</p>
        <span className="text-[11px] text-faint">{notification.time}</span>
      </div>
    </article>
  )
}
