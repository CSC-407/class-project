import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MailCheck, CheckCircle2, ArrowRight, Info, LinkIcon } from 'lucide-react'
import AuthLayout from '../../layouts/AuthLayout'
import { Button, Alert } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useCountdown } from '../../lib/hooks'
import { mmss } from '../../lib/format'

export default function VerifyEmail() {
  const [params, setParams] = useSearchParams()
  const email = params.get('email') || ''
  const token = params.get('token')
  const { verifyEmail, resendVerification } = useAuth()
  const toast = useToast()
  const { seconds, restart } = useCountdown(60)
  const [state, setState] = useState('idle') // idle | verified | invalid
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const verify = async () => {
    setLoading(true)
    const res = await verifyEmail(token)
    setLoading(false)
    if (res.ok) setState('verified')
    else {
      setState('invalid')
      setError(res.error)
    }
  }

  const resend = async () => {
    if (!email) return
    try {
      const res = await resendVerification(email)
      restart()
      setState('idle')
      if (res.devToken) setParams({ email, token: res.devToken }, { replace: true })
      toast('Verification email sent again.', { type: 'info' })
    } catch (e) {
      toast(e.message, { type: 'error' })
    }
  }

  if (state === 'verified') {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="animate-pop mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <CheckCircle2 className="size-8" aria-hidden />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Email verified</h1>
          <p className="mt-2 text-muted">Your account is active. Log in to see your fees.</p>
          <Button to="/login" size="lg" block className="mt-8" iconRight={ArrowRight}>Continue to login</Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="text-center">
        <div className={`mx-auto flex size-16 items-center justify-center rounded-2xl ${state === 'invalid' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' : 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'}`}>
          {state === 'invalid' ? <LinkIcon className="size-8" aria-hidden /> : <MailCheck className="size-8" aria-hidden />}
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">{state === 'invalid' ? 'Link expired' : 'Check your email to verify'}</h1>
        <p className="mt-3 text-muted">
          {state === 'invalid' ? (
            error
          ) : (
            <>
              We sent a verification link to <span className="font-semibold break-all text-fg">{email || 'your email address'}</span>. The link expires in 24 hours.
            </>
          )}
        </p>
      </div>

      <div className="mt-8 space-y-3">
        {token && state !== 'invalid' && (
          <Button size="lg" block loading={loading} onClick={verify}>
            Open verification link
          </Button>
        )}
        {state === 'invalid' && <Alert tone="danger">Request a new verification email below.</Alert>}
        {email && (
          <div className="text-center text-sm text-muted">
            Didn’t get it? Check your spam folder, or{' '}
            {seconds > 0 ? (
              <span>
                resend in <span className="font-mono font-semibold text-fg num">{mmss(seconds)}</span>
              </span>
            ) : (
              <button onClick={resend} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
                resend the email
              </button>
            )}
          </div>
        )}
      </div>

      {token && (
        <p className="mt-8 flex gap-2 rounded-lg bg-subtle p-3 text-xs text-muted">
          <Info className="size-4 shrink-0" aria-hidden />
          Development mode: emails aren’t sent, so the link from the email is available through the button above. The server still checks the one-time token.
        </p>
      )}
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-medium text-muted hover:text-fg">Back to login</Link>
      </p>
    </AuthLayout>
  )
}
