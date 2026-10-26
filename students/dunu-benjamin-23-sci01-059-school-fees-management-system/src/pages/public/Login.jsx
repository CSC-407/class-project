import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LogIn, User, Timer, MailWarning, Clock } from 'lucide-react'
import AuthLayout from '../../layouts/AuthLayout'
import { Button, Input, PasswordInput, Checkbox, Alert } from '../../components/ui'
import { useAuth, MAX_ATTEMPTS } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { mmss } from '../../lib/format'
import { safeNext } from '../../lib/safeNext'

export default function Login() {
  const { login, getLockout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const [form, setForm] = useState({ identifier: '', password: '', remember: false })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null) // { type, ... }
  const [loading, setLoading] = useState(false)
  const [now, setNow] = useState(Date.now())
  const expired = params.get('expired')
  const next = params.get('next')

  const lockedUntil = status?.type === 'locked' ? status.lockedUntil : null
  const secondsLeft = lockedUntil ? (lockedUntil - now) / 1000 : 0

  useEffect(() => {
    if (!lockedUntil) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [lockedUntil])

  useEffect(() => {
    if (lockedUntil && secondsLeft <= 0) setStatus(null)
  }, [lockedUntil, secondsLeft])

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    if (errors[k]) setErrors((er) => ({ ...er, [k]: '' }))
  }

  const onBlurId = async () => {
    const lock = form.identifier && (await getLockout(form.identifier))
    if (lock) {
      setNow(Date.now())
      setStatus({ type: 'locked', lockedUntil: lock })
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.identifier.trim()) errs.identifier = 'Enter your matric/JAMB number or email'
    if (!form.password) errs.password = 'Enter your password'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setLoading(true)
    setStatus(null)
    const res = await login(form.identifier, form.password, form.remember)
    setLoading(false)
    if (res.ok) {
      toast('Welcome back! You’re signed in securely.', { type: 'success' })
      navigate(safeNext(next, res.role === 'student' ? '/app' : '/admin'), { replace: true })
    } else if (res.otp) {
      sessionStorage.setItem('sfp-otp-pending', JSON.stringify({ email: res.email, devOtp: res.devOtp }))
      navigate(`/login/otp${next ? `?next=${encodeURIComponent(next)}` : ''}`)
    } else if (res.error === 'locked') {
      setNow(Date.now())
      setStatus({ type: 'locked', lockedUntil: res.lockedUntil })
    } else if (res.error === 'unverified') {
      setStatus({ type: 'unverified', email: res.email })
    } else if (res.error === 'suspended' || res.error === 'other') {
      setStatus({ type: 'message', message: res.message })
    } else if (res.error === 'rate_limited') {
      setNow(Date.now())
      setStatus({ type: 'locked', lockedUntil: Date.now() + (res.retryAfter || 60) * 1000 })
    } else {
      setStatus({ type: 'invalid', remaining: res.remaining })
      setForm((f) => ({ ...f, password: '' }))
    }
  }

  return (
    <AuthLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome back</h1>
        <p className="mt-2 text-muted">Log in to view your fees and make payments.</p>
      </div>

      <div className="space-y-3" aria-live="polite">
        {expired && !status && (
          <Alert tone="warning" icon={Clock} title="Your session expired">
            For your security you were logged out after a period of inactivity. Please log in again{next ? ' to continue where you left off' : ''}.
          </Alert>
        )}
        {status?.type === 'invalid' && (
          <Alert tone="danger" title="Invalid login details">
            Check your matric/JAMB number or email and password, then try again.
            {status.remaining <= 3 && (
              <span className="mt-1 block font-medium">
                {status.remaining} attempt{status.remaining === 1 ? '' : 's'} left before your account is temporarily locked.
              </span>
            )}
          </Alert>
        )}
        {status?.type === 'locked' && (
          <Alert tone="danger" icon={Timer} title="Too many attempts">
            For your protection, sign-in is paused after {MAX_ATTEMPTS} failed attempts. Try again in{' '}
            <span className="font-mono font-bold num">{mmss(secondsLeft)}</span>.
            <span className="mt-1 block">
              Forgotten your password? <Link to="/forgot-password" className="font-semibold underline">Reset it</Link>.
            </span>
          </Alert>
        )}
        {status?.type === 'message' && <Alert tone="danger" title="We couldn’t sign you in">{status.message}</Alert>}
        {status?.type === 'unverified' && (
          <Alert tone="warning" icon={MailWarning} title="Verify your email first">
            We sent a verification link to your email when you registered.{' '}
            <Link to={`/verify-email?email=${encodeURIComponent(status.email)}`} className="font-semibold underline">
              Resend or verify now
            </Link>
          </Alert>
        )}
      </div>

      <form onSubmit={submit} noValidate className="mt-6 space-y-5">
        <Input
          label="Matric number, JAMB number, or email"
          icon={User}
          autoComplete="username"
          placeholder="23/SCI01/059 or name@kingsgate.edu.ng"
          value={form.identifier}
          onChange={set('identifier')}
          onBlur={onBlurId}
          error={errors.identifier}
          maxLength={120}
          autoFocus
        />
        <PasswordInput
          autoComplete="current-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          maxLength={128}
          labelRight={
            <Link to="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">
              Forgot password?
            </Link>
          }
        />
        <Checkbox label="Remember me on this device" checked={form.remember} onChange={(v) => setForm((f) => ({ ...f, remember: v }))} />
        <Button type="submit" size="lg" block loading={loading} disabled={!!lockedUntil} icon={LogIn}>
          {loading ? 'Signing in…' : lockedUntil ? `Locked · ${mmss(secondsLeft)}` : 'Log in'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        New student?{' '}
        <Link to="/register" className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
          Create an account
        </Link>
      </p>
      <div className="mt-6 rounded-lg border border-dashed border-line p-3 text-xs text-muted">
        <p className="font-semibold text-fg">Demo logins</p>
        <p className="mt-1">
          Student: <span className="font-mono">21/0345</span> / <span className="font-mono">Student@123</span>
        </p>
        <p>
          Admin: <span className="font-mono">bursar@kingsgate.edu.ng</span> / <span className="font-mono">Admin@123</span> (OTP <span className="font-mono">123456</span>)
        </p>
      </div>
    </AuthLayout>
  )
}
