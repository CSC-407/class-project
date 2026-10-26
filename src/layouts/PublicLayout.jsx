import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Menu, X, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { Button } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { SCHOOL } from '../lib/data'
import { cn } from '../lib/format'

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/verify-receipt', label: 'Verify receipt' },
  { to: '/project/security', label: 'Security' },
  { to: '/contact', label: 'Contact' },
]

export function PublicHeader() {
  const [open, setOpen] = useState(false)
  const { user, isAdmin } = useAuth()
  const location = useLocation()
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Main">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'text-brand-700 dark:text-brand-200' : 'text-muted hover:text-fg')}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden items-center gap-2 sm:flex">
            {user ? (
              <Button to={isAdmin ? '/admin' : '/app'}>Go to dashboard</Button>
            ) : (
              <>
                <Button to="/login" variant="ghost">Log in</Button>
                <Button to="/register">Create account</Button>
              </>
            )}
          </div>
          <button onClick={() => setOpen((o) => !o)} className="flex size-11 items-center justify-center rounded-lg text-muted hover:bg-subtle lg:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="animate-fade-up border-t border-line bg-card px-4 pt-2 pb-4 lg:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => cn('flex min-h-11 items-center rounded-lg px-3 text-sm font-medium', isActive ? 'bg-subtle text-fg' : 'text-muted')}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {user ? (
              <Button to={isAdmin ? '/admin' : '/app'} className="col-span-2">Go to dashboard</Button>
            ) : (
              <>
                <Button to="/login" variant="secondary">Log in</Button>
                <Button to="/register">Create account</Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-muted">
            The official fees portal of {SCHOOL.name}. View what you owe, pay securely in full or in installments, and get instant, verifiable receipts.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
            <ShieldCheck className="size-4" aria-hidden /> TLS encrypted · Role-based access · Audit logged
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">About this system</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link to="/project/security" className="hover:text-fg">Security</Link></li>
            <li><Link to="/project/testing" className="hover:text-fg">Testing</Link></li>
            <li><Link to="/project/deployment" className="hover:text-fg">Deployment</Link></li>
            <li><Link to="/project/review" className="hover:text-fg">Review</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Portal</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link to="/verify-receipt" className="hover:text-fg">Verify a receipt</Link></li>
            <li><Link to="/about" className="hover:text-fg">About</Link></li>
            <li><Link to="/terms" className="hover:text-fg">Terms of use</Link></li>
            <li><Link to="/privacy" className="hover:text-fg">Privacy policy</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Contact the Bursary</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li className="flex gap-2"><Mail className="mt-0.5 size-4 shrink-0" aria-hidden /> {SCHOOL.email}</li>
            <li className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0" aria-hidden /> {SCHOOL.phone}</li>
            <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> {SCHOOL.address}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted sm:flex-row sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {SCHOOL.name}. CSC 407 project: Web Application Security, Testing, Deployment and Review.</p>
          <p>Payments on this site run in Test Mode. No real money is charged.</p>
        </div>
      </div>
    </footer>
  )
}

export default function PublicLayout() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2">
        Skip to content
      </a>
      <PublicHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
