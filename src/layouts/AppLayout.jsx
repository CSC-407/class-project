import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { Menu, Bell, Search, LogOut, UserCog, ShieldCheck, ChevronsLeft, ChevronsRight, Clock, X, FlaskConical, TimerReset } from 'lucide-react'
import { useAuth, IDLE_LIMIT_MS, IDLE_WARNING_S } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { STUDENT_NAV, ADMIN_NAV, PROJECT_NAV, STUDENT_TABS } from './nav'
import { Logo, LogoMark } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { NotificationItem } from '../components/NotificationItem'
import { Avatar, Dropdown, MenuItem, Modal, Button, Drawer, Badge } from '../components/ui'
import { cn, formatDateTime, mmss } from '../lib/format'
import { load, save } from '../lib/storage'
import { api } from '../lib/api'

function NavItems({ groups, collapsed, unread, onNavigate }) {
  return (
    <nav className="space-y-6" aria-label="Main">
      {groups.map((g) => (
        <div key={g.group}>
          {!collapsed && <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-brand-300/80 uppercase">{g.group}</p>}
          <ul className="space-y-0.5">
            {g.items.map((it) => (
              <li key={it.to}>
                <NavLink
                  to={it.to}
                  end={it.end}
                  onClick={onNavigate}
                  title={collapsed ? it.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                      isActive ? 'bg-white/12 text-white' : 'text-brand-100/80 hover:bg-white/6 hover:text-white',
                      collapsed && 'justify-center px-0',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-accent-400" aria-hidden />}
                      <it.icon className="size-[18px] shrink-0" aria-hidden />
                      {collapsed ? <span className="sr-only">{it.label}</span> : <span className="flex-1 truncate">{it.label}</span>}
                      {it.badge === 'unread' && unread > 0 && (
                        <span className={cn('rounded-full bg-accent-500 px-1.5 text-[11px] font-bold text-brand-950 num', collapsed && 'absolute top-1.5 right-1.5 size-2 p-0 text-[0px]')}>
                          {unread}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function IdleTimeout() {
  const { expire } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const last = useRef(Date.now())
  const lastPing = useRef(Date.now())
  const [remaining, setRemaining] = useState(null)

  const doLogout = useCallback(async () => {
    await expire()
    navigate(`/login?expired=1&next=${encodeURIComponent(location.pathname)}`, { replace: true })
  }, [expire, navigate, location.pathname])

  // Keep the server's sliding idle window in step with real activity (at most once a minute).
  const ping = useCallback(() => {
    lastPing.current = Date.now()
    api('/api/auth/ping', { method: 'POST', body: {} }).catch(() => {})
  }, [])

  useEffect(() => {
    const bump = () => {
      if (remaining !== null) return
      last.current = Date.now()
      if (Date.now() - lastPing.current > 60_000) ping()
    }
    const simulate = () => {
      last.current = Date.now() - IDLE_LIMIT_MS + IDLE_WARNING_S * 1000
    }
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }))
    window.addEventListener('sfp:simulate-idle', simulate)
    const t = setInterval(() => {
      const idle = Date.now() - last.current
      const left = (IDLE_LIMIT_MS - idle) / 1000
      if (left <= 0) doLogout()
      else if (left <= IDLE_WARNING_S) setRemaining(left)
      else setRemaining(null)
    }, 1000)
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump))
      window.removeEventListener('sfp:simulate-idle', simulate)
      clearInterval(t)
    }
  }, [remaining, doLogout, ping])

  return (
    <Modal
      open={remaining !== null}
      dismissable={false}
      title="Are you still there?"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={doLogout} icon={LogOut}>Log out now</Button>
          <Button
            data-autofocus
            icon={TimerReset}
            onClick={() => {
              last.current = Date.now()
              setRemaining(null)
              ping()
            }}
          >
            Stay signed in
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center py-2 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <Clock className="size-7" aria-hidden />
        </div>
        <p className="mt-4 text-sm text-muted">For your security, you’ll be logged out automatically in</p>
        <p className="mt-1 font-mono text-3xl font-bold num" aria-live="polite">{mmss(remaining || 0)}</p>
        <p className="mt-2 text-xs text-muted">You’ve been inactive for a while. Sessions end after 10 minutes of inactivity.</p>
      </div>
    </Modal>
  )
}

function NotificationBell() {
  const { notifications, markNotification } = useData()
  const navigate = useNavigate()
  const unread = notifications.filter((n) => !n.read).length
  return (
    <Dropdown
      className="w-[min(92vw,380px)] p-0"
      trigger={({ toggle, open }) => (
        <button onClick={toggle} aria-expanded={open} aria-haspopup="menu" className="relative flex size-11 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-fg" aria-label={`Notifications, ${unread} unread`}>
          <Bell className="size-5" />
          {unread > 0 && <span className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white num">{unread}</span>}
        </button>
      )}
    >
      {({ close }) => (
        <>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-semibold">Notifications</p>
            {unread > 0 && (
              <button onClick={() => markNotification('all')} className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-300">
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-96 space-y-0.5 overflow-y-auto p-1.5">
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">You’re all caught up.</p>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  compact
                  onClick={() => {
                    markNotification(n.id)
                    close()
                    navigate('/app/notifications')
                  }}
                />
              ))
            )}
          </div>
          <Link to="/app/notifications" onClick={close} className="block border-t border-line px-4 py-3 text-center text-sm font-medium text-brand-700 hover:bg-subtle dark:text-brand-300">
            View all notifications
          </Link>
        </>
      )}
    </Dropdown>
  )
}

function GlobalSearch({ isAdmin }) {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  return (
    <form
      role="search"
      className="relative hidden max-w-md flex-1 md:block"
      onSubmit={(e) => {
        e.preventDefault()
        if (!q.trim()) return
        navigate(isAdmin ? `/admin/payments?q=${encodeURIComponent(q.trim())}` : `/app/history?q=${encodeURIComponent(q.trim())}`)
        setQ('')
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        aria-label={isAdmin ? 'Search payments by reference or matric number' : 'Search your payments by reference'}
        placeholder={isAdmin ? 'Search reference or matric number…' : 'Search payment reference…'}
        className="h-10 w-full rounded-lg border border-line bg-subtle pr-3 pl-9 text-sm outline-none focus:border-brand-500 focus:bg-card focus:ring-3 focus:ring-brand-500/20"
      />
    </form>
  )
}

export default function AppLayout() {
  const { user, session, logout, isAdmin } = useAuth()
  const { notifications } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => load('sfp-sidebar-collapsed', false))
  const [drawer, setDrawer] = useState(false)
  const unread = notifications.filter((n) => !n.read).length
  const groups = [...(isAdmin ? ADMIN_NAV(user.role) : STUDENT_NAV), PROJECT_NAV]
  const isStudent = user.role === 'student'

  useEffect(() => {
    save('sfp-sidebar-collapsed', collapsed)
  }, [collapsed])
  useEffect(() => {
    setDrawer(false)
  }, [location.pathname])
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    toast('You have been signed out securely.', { type: 'info' })
    navigate('/login')
  }

  const roleLabel = { student: 'Student', admin: 'Bursary Admin', superadmin: 'Super Admin' }[user.role]

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:shadow-lift">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'no-print fixed inset-y-0 left-0 z-40 hidden flex-col bg-brand-900 transition-[width] duration-200 lg:flex dark:bg-[#0c1626] dark:border-r dark:border-line',
          collapsed ? 'w-[76px]' : 'w-64',
        )}
      >
        <div className={cn('flex h-16 items-center border-b border-white/10', collapsed ? 'justify-center' : 'px-5')}>
          {collapsed ? (
            <Link to={isAdmin ? '/admin' : '/app'} aria-label="Home">
              <LogoMark />
            </Link>
          ) : (
            <Logo to={isAdmin ? '/admin' : '/app'} light />
          )}
        </div>
        <div className={cn('flex-1 overflow-y-auto py-5 scrollbar-thin', collapsed ? 'px-3' : 'px-3')}>
          <NavItems groups={groups} collapsed={collapsed} unread={unread} />
        </div>
        <div className="border-t border-white/10 p-3">
          {!collapsed && (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/6 px-3 py-2 text-xs text-brand-100">
              <FlaskConical className="size-4 text-accent-400" aria-hidden />
              Test mode: no real money moves
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn('flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-brand-100/80 hover:bg-white/6 hover:text-white', collapsed && 'justify-center px-0')}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronsRight className="size-[18px]" /> : <ChevronsLeft className="size-[18px]" />}
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <Drawer open={drawer} onClose={() => setDrawer(false)} side="left" width="max-w-[300px]">
        <div className="flex min-h-full flex-col bg-brand-900 dark:bg-[#0c1626]">
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
            <Logo to={isAdmin ? '/admin' : '/app'} light />
            <button onClick={() => setDrawer(false)} className="flex size-11 items-center justify-center rounded-lg text-brand-100 hover:bg-white/10" aria-label="Close menu">
              <X className="size-5" />
            </button>
          </div>
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
            <Avatar name={user.name} src={user.photo} />
            <div className="min-w-0 text-white">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-brand-200">{user.matric || user.email}</p>
            </div>
          </div>
          <div className="flex-1 px-3 py-5">
            <NavItems groups={groups} unread={unread} onNavigate={() => setDrawer(false)} />
          </div>
          <div className="border-t border-white/10 p-3">
            <button onClick={handleLogout} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-red-300 hover:bg-white/6">
              <LogOut className="size-[18px]" aria-hidden /> Log out
            </button>
          </div>
        </div>
      </Drawer>

      <div className={cn('transition-[padding] duration-200 print:!pl-0', collapsed ? 'lg:pl-[76px]' : 'lg:pl-64')}>
        {/* Top bar */}
        <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-card/85 px-4 backdrop-blur-md sm:px-6">
          <button onClick={() => setDrawer(true)} className="-ml-2 flex size-11 items-center justify-center rounded-lg text-muted hover:bg-subtle lg:hidden" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <div className="lg:hidden">
            <Logo to={isAdmin ? '/admin' : '/app'} compact />
          </div>
          <GlobalSearch isAdmin={isAdmin} />
          <div className="ml-auto flex items-center gap-0.5">
            <span className="mr-2 hidden sm:block">
              <Badge tone="accent" icon={FlaskConical}>Test Mode</Badge>
            </span>
            <ThemeToggle />
            <NotificationBell />
            <Dropdown
              trigger={({ toggle, open }) => (
                <button onClick={toggle} aria-expanded={open} aria-haspopup="menu" className="ml-1 flex min-h-11 items-center gap-2.5 rounded-lg p-1 hover:bg-subtle sm:pr-2.5" aria-label="Account menu">
                  <Avatar name={user.name} src={user.photo} size="sm" />
                  <span className="hidden text-left leading-tight sm:block">
                    <span className="block max-w-36 truncate text-sm font-semibold">{user.name}</span>
                    <span className="block text-xs text-muted">{roleLabel}</span>
                  </span>
                </button>
              )}
            >
              <div className="border-b border-line px-3 pt-2 pb-3">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                  <Clock className="size-3.5" aria-hidden /> Last login: {formatDateTime(session?.previousLogin)}
                </p>
              </div>
              <div className="pt-1.5">
                <MenuItem as={Link} to="/app/profile" icon={UserCog}>Profile & Settings</MenuItem>
                <MenuItem as={Link} to="/app/security" icon={ShieldCheck}>Security & Sessions</MenuItem>
                <MenuItem icon={LogOut} danger onClick={handleLogout}>Log out</MenuItem>
              </div>
            </Dropdown>
          </div>
        </header>

        <main id="main" tabIndex={-1} className={cn('mx-auto w-full max-w-7xl px-4 py-6 outline-none sm:px-6 lg:py-8', isStudent && 'pb-28 lg:pb-8')}>
          <div key={location.pathname} className="animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom tabs (students) */}
      {isStudent && (
        <nav aria-label="Quick navigation" className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur-md lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <ul className="grid grid-cols-4">
            {STUDENT_TABS.map((t) => (
              <li key={t.to}>
                <NavLink
                  to={t.to}
                  end={t.end}
                  className={({ isActive }) => cn('flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold', isActive ? 'text-brand-700 dark:text-brand-200' : 'text-muted')}
                >
                  {({ isActive }) => (
                    <>
                      <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', isActive && 'bg-brand-100 dark:bg-brand-500/20')}>
                        <t.icon className="size-5" aria-hidden />
                      </span>
                      {t.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <IdleTimeout />
    </div>
  )
}
