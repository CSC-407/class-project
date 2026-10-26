import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ShieldOff, SearchX, ServerCrash, LogIn, FileWarning, WifiOff, ArrowLeft, Home, RotateCcw } from 'lucide-react'
import { Button } from '../../components/ui'
import { Logo } from '../../components/Logo'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'

const PAGES = {
  400: { icon: FileWarning, title: 'Bad request', body: 'We couldn’t process that request. The link may be broken or the form data was invalid.' },
  401: { icon: LogIn, title: 'Please sign in', body: 'You need to be signed in to view this page. Your session may have ended.' },
  403: { icon: ShieldOff, title: 'Access denied', body: 'You don’t have permission to view this page. The attempt has been recorded in the audit log.' },
  404: { icon: SearchX, title: 'Page not found', body: 'The page you’re looking for doesn’t exist or has moved. Check the address and try again.' },
  500: { icon: ServerCrash, title: 'Something went wrong on our side', body: 'An unexpected error occurred. Our team has been notified. No payment was affected, so it’s safe to try again.' },
  offline: { icon: WifiOff, title: 'You’re offline', body: 'Check your internet connection. Any payment in progress is safe and will resume when you reconnect.' },
}

export default function ErrorPage({ code: codeProp, inApp, onRetry }) {
  const params = useParams()
  const code = codeProp ?? (PAGES[params.code] ? params.code : 404)
  const p = PAGES[code]
  const Icon = p.icon
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const logged = useRef(false)
  const home = user ? (user.role === 'student' ? '/app' : '/admin') : '/'

  useEffect(() => {
    if (String(code) === '403' && user && !logged.current) {
      logged.current = true
      api('/api/audit/client-denied', { method: 'POST', body: { path: location.pathname } }).catch(() => {})
    }
  }, [code, user, location.pathname])

  const content = (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center sm:py-24">
      <div className="relative">
        <div className="absolute inset-0 scale-[1.8] rounded-full bg-brand-100/70 blur-2xl dark:bg-brand-500/10" aria-hidden />
        <div className="relative flex size-20 items-center justify-center rounded-3xl border border-line bg-card shadow-soft">
          <Icon className={`size-9 ${code == 403 ? 'text-red-600 dark:text-red-400' : 'text-brand-600 dark:text-brand-300'}`} aria-hidden />
        </div>
      </div>
      {code !== 'offline' && <p className="mt-8 font-mono text-sm font-semibold tracking-widest text-muted">ERROR {code}</p>}
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{p.title}</h1>
      <p className="mt-3 text-muted">{p.body}</p>
      {code == 403 && location.pathname && (
        <p className="mt-4 rounded-lg bg-subtle px-3 py-2 font-mono text-xs text-muted">
          {location.pathname} · role: {user?.role || 'guest'}
        </p>
      )}
      <div className="mt-8 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        {code == 500 || code === 'offline' ? (
          <Button icon={RotateCcw} onClick={onRetry || (() => window.location.reload())}>Try again</Button>
        ) : code == 401 ? (
          <Button to={`/login?next=${encodeURIComponent(location.pathname)}`} icon={LogIn}>Log in</Button>
        ) : (
          <Button to={home} icon={Home}>{user ? 'Back to dashboard' : 'Go to home'}</Button>
        )}
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(-1)}>Go back</Button>
      </div>
    </div>
  )

  if (inApp) return content
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center border-b border-line bg-card px-4 sm:px-6">
        <Logo />
      </header>
      <main id="main" className="flex-1">{content}</main>
    </div>
  )
}
