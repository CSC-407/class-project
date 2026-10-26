import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LockKeyhole, CheckCircle2, LinkIcon, ArrowRight } from 'lucide-react'
import AuthLayout from '../../layouts/AuthLayout'
import { Button, PasswordInput, PasswordStrength } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { passwordError } from '../../lib/validation'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const { resetPassword } = useAuth()
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [invalid, setInvalid] = useState(false)

  if (!token || token === 'expired' || invalid) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <LinkIcon className="size-8" aria-hidden />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">This link has expired</h1>
          <p className="mt-3 text-muted">Password reset links work once and expire after 30 minutes. Request a new one to continue.</p>
          <Button to="/forgot-password" size="lg" block className="mt-8">Request a new link</Button>
        </div>
      </AuthLayout>
    )
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="animate-pop mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <CheckCircle2 className="size-8" aria-hidden />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Password updated</h1>
          <p className="mt-3 text-muted">Your password has been changed and all other sessions have been signed out. Log in with your new password.</p>
          <Button to="/login" size="lg" block className="mt-8" iconRight={ArrowRight}>Continue to login</Button>
        </div>
      </AuthLayout>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = { pw: passwordError(pw), confirm: !confirm ? 'Confirm your new password' : confirm !== pw ? 'Passwords do not match' : '' }
    setErrors(errs)
    if (errs.pw || errs.confirm) return
    setLoading(true)
    const res = await resetPassword(token, pw)
    setLoading(false)
    if (res.ok) setDone(true)
    else if (res.error === 'expired') setInvalid(true)
    else setErrors({ pw: res.fields?.password || res.message })
  }

  return (
    <AuthLayout>
      <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
        <LockKeyhole className="size-7" aria-hidden />
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">Set a new password</h1>
      <p className="mt-2 text-muted">Choose a strong password you haven’t used before.</p>
      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <div className="space-y-3">
          <PasswordInput label="New password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} error={errors.pw} autoFocus />
          <PasswordStrength value={pw} />
        </div>
        <PasswordInput label="Confirm new password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        <Button type="submit" size="lg" block loading={loading}>Update password</Button>
      </form>
    </AuthLayout>
  )
}
