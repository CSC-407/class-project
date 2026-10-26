import { Link } from 'react-router-dom'
import { cn } from '../lib/format'

export function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-9 shrink-0', className)} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-brand-800 dark:fill-brand-500" />
      <path d="M16 7l10 5-10 5-10-5 10-5z" fill="#f59e0b" />
      <path d="M10 15v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ to = '/', compact = false, className, light }) {
  return (
    <Link to={to} className={cn('flex items-center gap-2.5 rounded-lg', className)} aria-label="Kingsgate University Fees Portal, home">
      <LogoMark />
      {!compact && (
        <span className="leading-tight">
          <span className={cn('block text-[15px] font-bold tracking-tight', light ? 'text-white' : 'text-fg')}>Kingsgate Fees</span>
          <span className={cn('block text-[11px] font-medium', light ? 'text-brand-200' : 'text-muted')}>Payment Management System</span>
        </span>
      )}
    </Link>
  )
}
