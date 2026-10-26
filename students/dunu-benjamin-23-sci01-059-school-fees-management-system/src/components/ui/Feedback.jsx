import { CheckCircle2, Clock, XCircle, AlertTriangle, Info, CircleDashed, Ban, ShieldAlert, ShieldCheck, Loader2, CircleDot, RotateCcw, Flag } from 'lucide-react'
import { cn } from '../../lib/format'
import { Button } from './Button'

const TONES = {
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25',
  danger: 'bg-red-50 text-red-800 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/25',
  info: 'bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/25',
  neutral: 'bg-subtle text-muted ring-line',
  brand: 'bg-brand-50 text-brand-800 ring-brand-600/20 dark:bg-brand-500/15 dark:text-brand-200 dark:ring-brand-400/25',
  accent: 'bg-accent-50 text-accent-700 ring-accent-500/30 dark:bg-accent-500/10 dark:text-accent-300',
}

export function Badge({ tone = 'neutral', icon: Icon, children, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset', TONES[tone], className)}>
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </span>
  )
}

// Status is never colour alone: every chip pairs an icon with a text label.
const STATUS = {
  paid: { tone: 'success', icon: CheckCircle2, label: 'Paid' },
  success: { tone: 'success', icon: CheckCircle2, label: 'Successful' },
  verified: { tone: 'success', icon: ShieldCheck, label: 'Verified' },
  active: { tone: 'success', icon: CheckCircle2, label: 'Active' },
  pass: { tone: 'success', icon: CheckCircle2, label: 'Pass' },
  implemented: { tone: 'success', icon: ShieldCheck, label: 'Implemented' },
  published: { tone: 'success', icon: CheckCircle2, label: 'Published' },
  fixed: { tone: 'success', icon: CheckCircle2, label: 'Fixed' },
  partial: { tone: 'warning', icon: CircleDot, label: 'Partial' },
  pending: { tone: 'warning', icon: Clock, label: 'Pending' },
  unverified: { tone: 'warning', icon: Clock, label: 'Unverified' },
  draft: { tone: 'warning', icon: CircleDashed, label: 'Draft' },
  open: { tone: 'warning', icon: CircleDot, label: 'Open' },
  unpaid: { tone: 'neutral', icon: CircleDashed, label: 'Unpaid' },
  archived: { tone: 'neutral', icon: CircleDashed, label: 'Archived' },
  deactivated: { tone: 'neutral', icon: Ban, label: 'Deactivated' },
  'n/a': { tone: 'neutral', icon: CircleDashed, label: 'N/A' },
  overdue: { tone: 'danger', icon: AlertTriangle, label: 'Overdue' },
  owing: { tone: 'danger', icon: AlertTriangle, label: 'Owing' },
  failed: { tone: 'danger', icon: XCircle, label: 'Failed' },
  fail: { tone: 'danger', icon: XCircle, label: 'Fail' },
  failure: { tone: 'danger', icon: XCircle, label: 'Failure' },
  suspended: { tone: 'danger', icon: Ban, label: 'Suspended' },
  flagged: { tone: 'danger', icon: Flag, label: 'Flagged' },
  refunded: { tone: 'info', icon: RotateCcw, label: 'Refunded' },
  critical: { tone: 'danger', icon: ShieldAlert, label: 'Critical' },
  high: { tone: 'danger', icon: AlertTriangle, label: 'High' },
  error: { tone: 'danger', icon: XCircle, label: 'Error' },
  medium: { tone: 'warning', icon: AlertTriangle, label: 'Medium' },
  warning: { tone: 'warning', icon: AlertTriangle, label: 'Warning' },
  low: { tone: 'info', icon: Info, label: 'Low' },
  info: { tone: 'info', icon: Info, label: 'Info' },
}

export function StatusChip({ status, label, className }) {
  const s = STATUS[status] || { tone: 'neutral', icon: CircleDashed, label: status }
  return (
    <Badge tone={s.tone} icon={s.icon} className={className}>
      {label || s.label}
    </Badge>
  )
}

const ALERT = {
  info: { icon: Info, cls: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200' },
  success: { icon: CheckCircle2, cls: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200' },
  warning: { icon: AlertTriangle, cls: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200' },
  danger: { icon: XCircle, cls: 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200' },
}

export function Alert({ tone = 'info', title, children, action, icon, className }) {
  const a = ALERT[tone]
  const Icon = icon || a.icon
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-xl border p-4 text-sm', a.cls, className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  )
}

export function Spinner({ className, label = 'Loading' }) {
  return (
    <span role="status" className="inline-flex items-center">
      <Loader2 className={cn('size-5 animate-spin text-brand-600 dark:text-brand-300', className)} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} aria-hidden />
}

export function SkeletonCards({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-line bg-card p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-8 w-36" />
          <Skeleton className="mt-3 h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn('h-5', c === 0 ? 'w-24' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ProgressBar({ value, className, tone = 'brand', size = 'md', label }) {
  const pct = Math.max(0, Math.min(100, value))
  const colors = { brand: 'bg-brand-600 dark:bg-brand-400', success: 'bg-emerald-500', warning: 'bg-amber-500', danger: 'bg-red-500', accent: 'bg-accent-500' }
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('w-full overflow-hidden rounded-full bg-subtle', size === 'lg' ? 'h-4' : size === 'sm' ? 'h-1.5' : 'h-2.5', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', colors[tone])} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function EmptyState({ icon: Icon = CircleDashed, title, children, action, className }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 scale-150 rounded-full bg-brand-100/60 blur-xl dark:bg-brand-500/10" aria-hidden />
        <div className="relative flex size-16 items-center justify-center rounded-2xl border border-line bg-card shadow-soft">
          <Icon className="size-7 text-brand-600 dark:text-brand-300" aria-hidden />
        </div>
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', children = 'We couldn’t load this data. Check your connection and try again.', onRetry }) {
  return (
    <EmptyState icon={AlertTriangle} title={title} action={onRetry && <Button variant="secondary" icon={RotateCcw} onClick={onRetry}>Try again</Button>}>
      {children}
    </EmptyState>
  )
}
