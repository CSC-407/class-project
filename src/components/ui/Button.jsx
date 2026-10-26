import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/format'

const VARIANTS = {
  primary: 'bg-brand-800 text-white hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 shadow-sm',
  accent: 'bg-accent-500 text-brand-950 hover:bg-accent-400 shadow-sm font-semibold',
  secondary: 'border border-line bg-card text-fg hover:bg-subtle',
  ghost: 'text-fg hover:bg-subtle',
  destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  link: 'text-brand-600 hover:underline dark:text-brand-300 px-0 min-h-0 h-auto',
}
const SIZES = {
  sm: 'h-9 min-h-9 px-3 text-sm gap-1.5',
  md: 'h-11 min-h-11 px-4 text-sm gap-2',
  lg: 'h-12 min-h-12 px-6 text-base gap-2',
  icon: 'size-11 min-h-11 justify-center p-0',
  'icon-sm': 'size-9 min-h-9 justify-center p-0',
}

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className, children, to, href, icon: Icon, iconRight: IconRight, block, ...props },
  ref,
) {
  const cls = cn(
    'inline-flex items-center justify-center rounded-lg font-medium transition-colors select-none whitespace-nowrap',
    'disabled:opacity-55 disabled:pointer-events-none aria-disabled:opacity-55 aria-disabled:pointer-events-none',
    VARIANTS[variant],
    SIZES[size],
    block && 'w-full',
    className,
  )
  const content = (
    <>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : Icon && <Icon className={size === 'lg' ? 'size-5' : 'size-4'} aria-hidden />}
      {children}
      {IconRight && !loading && <IconRight className="size-4" aria-hidden />}
    </>
  )
  if (to) {
    return (
      <Link ref={ref} to={to} className={cls} aria-disabled={disabled || undefined} {...props}>
        {content}
      </Link>
    )
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={cls} {...props}>
        {content}
      </a>
    )
  }
  return (
    <button ref={ref} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  )
})
