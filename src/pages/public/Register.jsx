import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, Lock } from 'lucide-react'
import AuthLayout from '../../layouts/AuthLayout'
import { Button, Input, PasswordInput, PasswordStrength, Select, Checkbox, Alert } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { FACULTIES, LEVELS } from '../../lib/data'
import { validators, passwordError } from '../../lib/validation'

const EMPTY = { name: '', matric: '', email: '', phone: '', faculty: '', department: '', level: '', password: '', confirm: '', terms: false }

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [touched, setTouched] = useState({})
  const [serverError, setServerError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const summaryRef = useRef(null)

  const validate = (f) => ({
    name: validators.name(f.name),
    matric: validators.matric(f.matric),
    email: validators.email(f.email),
    phone: validators.phone(f.phone),
    faculty: validators.required('faculty')(f.faculty),
    department: validators.required('department')(f.department),
    level: validators.required('level')(f.level),
    password: passwordError(f.password),
    confirm: !f.confirm ? 'Confirm your password' : f.confirm !== f.password ? 'Passwords do not match' : '',
    terms: f.terms ? '' : 'You must accept the terms to continue',
  })
  const errors = validate(form)
  const show = (k) => (touched[k] || submitted ? errors[k] : '')

  const set = (k) => (e) => {
    const v = e.target.value
    setForm((f) => ({ ...f, [k]: v, ...(k === 'faculty' ? { department: '' } : {}) }))
    if (serverError?.field === k) setServerError(null)
  }
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }))

  const submit = async (e) => {
    e.preventDefault()
    setSubmitted(true)
    const failing = Object.entries(errors).filter(([, v]) => v)
    if (failing.length) {
      setTimeout(() => summaryRef.current?.focus(), 0)
      return
    }
    if (!navigator.onLine) {
      setServerError({ message: 'You appear to be offline. Check your connection and try again.' })
      return
    }
    setLoading(true)
    const res = await register(form)
    setLoading(false)
    if (res.error === 'matric') setServerError({ field: 'matric', message: 'An account with this matric/JAMB number already exists.' })
    else if (res.error === 'email') setServerError({ field: 'email', message: 'An account with this email already exists.' })
    else if (res.error) setServerError({ message: res.message })
    else navigate(`/verify-email?email=${encodeURIComponent(res.email)}${res.devToken ? `&token=${encodeURIComponent(res.devToken)}` : ''}`)
  }

  const failing = Object.entries(errors).filter(([, v]) => v)
  const labels = { name: 'Full name', matric: 'Matric/JAMB number', email: 'Email', phone: 'Phone number', faculty: 'Faculty', department: 'Department', level: 'Level', password: 'Password', confirm: 'Confirm password', terms: 'Terms' }

  return (
    <AuthLayout wide>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Create your account</h1>
        <p className="mt-2 text-muted">Use the details on your admission letter. It takes about two minutes.</p>
      </div>

      {submitted && failing.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} className="mb-5 outline-none">
          <Alert tone="danger" title={`Please fix ${failing.length} field${failing.length > 1 ? 's' : ''} to continue`}>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {failing.slice(0, 5).map(([k, v]) => (
                <li key={k}>
                  <span className="font-medium">{labels[k]}:</span> {v}
                </li>
              ))}
            </ul>
          </Alert>
        </div>
      )}
      {serverError && (
        <Alert tone="danger" className="mb-5" title="We couldn’t create your account">
          {serverError.message}{' '}
          {serverError.field && (
            <>
              <Link to="/login" className="font-semibold underline">Log in</Link> or <Link to="/forgot-password" className="font-semibold underline">reset your password</Link>.
            </>
          )}
        </Alert>
      )}

      <form onSubmit={submit} noValidate className="space-y-5">
        <Input label="Full name" required autoComplete="name" placeholder="e.g. Chinedu Okafor" value={form.name} onChange={set('name')} onBlur={blur('name')} error={show('name')} maxLength={80} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Matric number / JAMB number"
            required
            mono
            placeholder="23/SCI01/059 or JAMB number"
            value={form.matric}
            onChange={set('matric')}
            onBlur={blur('matric')}
            error={serverError?.field === 'matric' ? 'This matric/JAMB number is already registered' : show('matric')}
            hint="e.g. 23/SCI01/059 or 14-character JAMB number"
            maxLength={40}
          />
          <Input label="Phone number" required type="tel" autoComplete="tel" placeholder="0803 412 7788" value={form.phone} onChange={set('phone')} onBlur={blur('phone')} error={show('phone')} maxLength={16} />
        </div>
        <Input
          label="Email address"
          required
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={form.email}
          onChange={set('email')}
          onBlur={blur('email')}
          error={serverError?.field === 'email' ? 'This email is already registered' : show('email')}
          maxLength={120}
        />
        <div className="grid gap-5 sm:grid-cols-3">
          <Select label="Faculty" required placeholder="Select" options={Object.keys(FACULTIES)} value={form.faculty} onChange={set('faculty')} onBlur={blur('faculty')} error={show('faculty')} />
          <Select
            label="Department"
            required
            placeholder={form.faculty ? 'Select' : 'Select faculty first'}
            options={form.faculty ? FACULTIES[form.faculty] : []}
            disabled={!form.faculty}
            value={form.department}
            onChange={set('department')}
            onBlur={blur('department')}
            error={show('department')}
          />
          <Select label="Level" required placeholder="Select" options={LEVELS.map((l) => ({ value: l, label: `${l} Level` }))} value={form.level} onChange={set('level')} onBlur={blur('level')} error={show('level')} />
        </div>
        <div className="space-y-3">
          <PasswordInput required autoComplete="new-password" value={form.password} onChange={set('password')} onBlur={blur('password')} error={show('password')} maxLength={128} />
          <PasswordStrength value={form.password} />
        </div>
        <PasswordInput
          label="Confirm password"
          required
          autoComplete="new-password"
          value={form.confirm}
          onChange={set('confirm')}
          onBlur={blur('confirm')}
          error={show('confirm')}
          hint={form.confirm && form.confirm === form.password ? '✓ Passwords match' : undefined}
          maxLength={128}
        />
        <div>
          <Checkbox
            checked={form.terms}
            onChange={(v) => setForm((f) => ({ ...f, terms: v }))}
            label={
              <>
                I agree to the{' '}
                <Link to="/terms" target="_blank" className="font-medium text-brand-700 underline dark:text-brand-300">Terms of use</Link> and{' '}
                <Link to="/privacy" target="_blank" className="font-medium text-brand-700 underline dark:text-brand-300">Privacy policy</Link>
              </>
            }
          />
          {show('terms') && <p className="mt-1.5 pl-8 text-sm text-red-600 dark:text-red-400" role="alert">{errors.terms}</p>}
        </div>
        <Button type="submit" size="lg" block loading={loading} icon={UserPlus}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
          <Lock className="size-3.5" aria-hidden /> Your password is hashed before it’s stored. We never see it.
        </p>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-700 hover:underline dark:text-brand-300">Log in</Link>
      </p>
    </AuthLayout>
  )
}
