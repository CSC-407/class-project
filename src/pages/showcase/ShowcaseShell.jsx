import { NavLink } from 'react-router-dom'
import { Shield, FlaskConical, Rocket, ClipboardCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/format'

const LINKS = [
  { to: '/project/security', label: 'Security', icon: Shield },
  { to: '/project/testing', label: 'Testing', icon: FlaskConical },
  { to: '/project/deployment', label: 'Deployment', icon: Rocket },
  { to: '/project/review', label: 'Review', icon: ClipboardCheck },
]

/** Wraps a showcase page. Adds page padding in the public shell and a sub-nav between the four pages. */
export function ShowcaseShell({ eyebrow, title, description, icon: Icon, aside, children }) {
  const { user } = useAuth()
  return (
    <div className={cn(!user && 'mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12')}>
      <nav aria-label="About this system" className="-mx-4 mb-6 overflow-x-auto px-4 scrollbar-thin sm:mx-0 sm:px-0">
        <ul className="inline-flex gap-1 rounded-xl border border-line bg-card p-1 shadow-soft">
          {LINKS.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                className={({ isActive }) =>
                  cn('flex min-h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-medium whitespace-nowrap transition-colors', isActive ? 'bg-brand-800 text-white dark:bg-brand-500' : 'text-muted hover:bg-subtle hover:text-fg')
                }
              >
                <l.icon className="size-4" aria-hidden /> {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <header className="relative mb-8 overflow-hidden rounded-2xl bg-brand-900 p-6 text-white sm:p-10 dark:bg-[#0c1626] dark:ring-1 dark:ring-line">
        <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-brand-500/40 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-accent-500/15 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-sm font-semibold tracking-wider text-accent-300 uppercase">
              {Icon && <Icon className="size-4" aria-hidden />} {eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-3 text-brand-100 sm:text-lg">{description}</p>
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </div>
      </header>
      {children}
    </div>
  )
}

export function SectionTitle({ title, description, action, id }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id={id} className="text-xl font-bold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}
