import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, Mail, MailCheck, ArrowLeft, Info } from 'lucide-react'
import AuthLayout from '../../layouts/AuthLayout'
import { Button, Input } from '../../components/ui'
import { validators } from '../../lib/validation'
import { useAuth } from '../../context/AuthContext'
import { useCountdown } from '../../lib/hooks'
import { mmss } from '../../lib/format'
import { useToast } from '../../context/ToastContext'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [devToken, setDevToken] = useState(null)
  const { forgotPassword } = useAuth()
  const { seconds, restart } = useCountdown(0)
  const toast = useToast()

  const submit = async (e) => {
    e.preventDefault()
    const err = validators.email(email)
    setError(err)
    if (err) return
    setLoading(true)
    try {
      const res = await forgotPassword(email.trim())
      setDevToken(res.devToken || null)
      setSent(true)
      restart(60)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
            <MailCheck className="size-8" aria-hidden />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">Check your inbox</h1>
          <p className="mt-3 text-muted">
            If an account exists for <span className="font-semibold break-all text-fg">{email}</span>, you’ll get an email with a link to reset your password. The link expires in 30 minutes.
          </p>
        </div>
        <div className="mt-8 space-y-3">
          {devToken && (
            <Button to={`/reset-password?token=${encodeURIComponent(devToken)}`} size="lg" block>
              Open reset link (development mode)
            </Button>
          )}
          <Button to="/reset-password?token=expired" variant="secondary" size="lg" block>
            Try an invalid link
          </Button>
          <p className="text-center text-sm text-muted">
            {seconds > 0 ? (
              <>Resend available in <span className="font-mono font-semibold text-fg num">{mmss(seconds)}</span></>
            ) : (
              <button onClick={async () => { const res = await forgotPassword(email.trim()).catch(() => null); if (res?.devToken) setDevToken(res.devToken); restart(60); toast('Reset link sent again.', { type: 'info' }) }} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
                Resend email
              </button>
            )}
          </p>
        </div>
        <p className="mt-8 flex gap-2 rounded-lg bg-subtle p-3 text-xs text-muted">
          <Info className="size-4 shrink-0" aria-hidden />
          We show the same message whether or not the email is registered. This stops attackers from finding out who has an account.
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Back to login
      </Link>
      <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
        <KeyRound className="size-7" aria-hidden />
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">Forgot your password?</h1>
      <p className="mt-2 text-muted">Enter the email you registered with and we’ll send you a reset link.</p>
      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <Input
          label="Email address"
          type="email"
          icon={Mail}
          autoComplete="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError('') }}
          onBlur={() => email && setError(validators.email(email))}
          error={error}
          autoFocus
        />
        <Button type="submit" size="lg" block loading={loading}>Send reset link</Button>
      </form>
    </AuthLayout>
  )
}
