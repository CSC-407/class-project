import { CheckCircle2, XCircle, CalendarClock, Megaphone, ShieldAlert, AlertTriangle } from 'lucide-react'
import { cn, relativeTime } from '../lib/format'

export const NOTIF_TYPES = {
  success: { icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300', label: 'Payment confirmed' },
  failed: { icon: XCircle, cls: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300', label: 'Payment failed' },
  reminder: { icon: CalendarClock, cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300', label: 'Reminder' },
  overdue: { icon: AlertTriangle, cls: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300', label: 'Overdue' },
  announcement: { icon: Megaphone, cls: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300', label: 'Announcement' },
  security: { icon: ShieldAlert, cls: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200', label: 'Security alert' },
}

export function NotificationItem({ n, onClick, compact }) {
  const t = NOTIF_TYPES[n.type] || NOTIF_TYPES.announcement
  const Icon = t.icon
  return (
    <button
      onClick={onClick}
      className={cn('flex w-full items-start gap-3 rounded-lg text-left transition-colors hover:bg-subtle', compact ? 'p-2.5' : 'p-4', !n.read && 'bg-brand-50/50 dark:bg-brand-500/5')}
    >
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', t.cls)}>
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className={cn('text-sm', n.read ? 'font-medium' : 'font-semibold')}>{n.title}</span>
          {!n.read && (
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent-500">
              <span className="sr-only">Unread</span>
            </span>
          )}
        </span>
        <span className={cn('block text-sm text-muted', compact && 'line-clamp-2')}>{n.body}</span>
        <span className="mt-1 block text-xs text-muted">
          <span className="sr-only">{t.label}, </span>
          {relativeTime(n.at)}
        </span>
      </span>
    </button>
  )
}
