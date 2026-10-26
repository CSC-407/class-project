import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import AuthLayout from '../../layouts/AuthLayout'
import { Button, OTPInput, Alert } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { safeNext } from '../../lib/safeNext'
import { useCountdown } from '../../lib/hooks'
import { mmss } from '../../lib/format'

function readPending() {
  try {
    return JSON.parse(sessionStorage.getItem('sfp-otp-pending') || 'null')
  } catch {
    return null
  }
}

export default function OtpVerify() {
  const { verifyOtp, resendOtp } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [locked, setLocked] = useState(false)
  const [pending, setPending] = useState(readPending)
  const { seconds, restart } = useCountdown(45)

  const submit = async (value = code) => {
    if (value.length !== 6) return setError('Enter all 6 digits')
    setLoading(true)
    setError('')
    const res = await verifyOtp(value)
    setLoading(false)
    if (res.ok) {
      sessionStorage.removeItem('sfp-otp-pending')
      toast('Two-factor verification passed.', { type: 'success' })
      navigate(safeNext(params.get('next'), res.role === 'student' ? '/app' : '/admin'), { replace: true })
    } else if (res.error === 'expired') {
      sessionStorage.removeItem('sfp-otp-pending')
      navigate('/login?expired=1', { replace: true })
    } else if (res.error === 'locked') {
      setLocked(true)
      setCode('')
    } else {
      setError(res.message || 'That code is incorrect or has expired. Check your email and try again.')
      setCode('')
    }
  }

  useEffect(() => {
    if (code.length === 6 && !loading) submit(code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  if (!pending) return <Navigate to="/login" replace />

  return (
    <AuthLayout>
      <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Back to login
      </Link>
      <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
        <ShieldCheck className="size-7" aria-hidden />
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">Two-step verification</h1>
      <p className="mt-2 text-muted">
        Enter the 6-digit code we sent to <span className="font-medium text-fg">{pending.email}</span>. It expires in 10 minutes.
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <OTPInput value={code} onChange={(v) => { setCode(v); setError('') }} error={!!error} disabled={loading || locked} />
        {error && <Alert tone="danger">{error}</Alert>}
        {locked && <Alert tone="danger" title="Too many incorrect codes">Request a new code to continue.</Alert>}
        <Button type="submit" size="lg" block loading={loading} disabled={locked}>Verify and continue</Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted">
        {seconds > 0 ? (
          <p>
            Resend code in <span className="font-mono font-semibold text-fg num">{mmss(seconds)}</span>
          </p>
        ) : (
          <button
            onClick={async () => {
              try {
                const res = await resendOtp()
                const next = { ...pending, devOtp: res.devOtp }
                sessionStorage.setItem('sfp-otp-pending', JSON.stringify(next))
                setPending(next)
                setLocked(false)
                restart()
                toast('A new code has been sent.', { type: 'info' })
              } catch {
                navigate('/login?expired=1', { replace: true })
              }
            }}
            className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            Resend code
          </button>
        )}
      </div>
      {pending.devOtp && (
        <p className="mt-6 rounded-lg bg-subtle p-3 text-center text-xs text-muted">
          Development mode (email isn’t sent). Your code: <span className="font-mono font-semibold text-fg">{pending.devOtp}</span>
        </p>
      )}
    </AuthLayout>
  )
}
