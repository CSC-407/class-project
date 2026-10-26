import { useState } from 'react'
import { Monitor, Smartphone, Laptop, LogOut, KeyRound, ShieldCheck, Clock, MapPin, TimerReset, CheckCircle2, XCircle } from 'lucide-react'
import { useAuth, IDLE_LIMIT_MS } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { Card, CardHeader, PageHeader, PasswordInput, PasswordStrength, Button, Toggle, Badge, ConfirmDialog, Alert, StatusChip, Skeleton } from '../../components/ui'
import { passwordError } from '../../lib/validation'
import { formatDateTime, relativeTime } from '../../lib/format'
import { api, useApi } from '../../lib/api'
import { useDocumentTitle } from '../../lib/hooks'

function ChangePassword() {
  const { changePassword } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setErrors((er) => ({ ...er, [k]: '' }))
  }
  const submit = async (e) => {
    e.preventDefault()
    const errs = {
      current: form.current ? '' : 'Enter your current password',
      next: passwordError(form.next),
      confirm: !form.confirm ? 'Confirm your new password' : form.confirm !== form.next ? 'Passwords do not match' : '',
    }
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return
    setLoading(true)
    const res = await changePassword(form.current, form.next)
    setLoading(false)
    if (res.ok) {
      setForm({ current: '', next: '', confirm: '' })
      toast(`Password changed.${res.revoked ? ` ${res.revoked} other device${res.revoked > 1 ? 's were' : ' was'} signed out.` : ''}`, { title: 'Password updated' })
    } else {
      setErrors({ current: res.fields?.current, next: res.fields?.next, confirm: '', ...(!res.fields?.current && !res.fields?.next && { next: res.message }) })
    }
  }
  return (
    <Card>
      <CardHeader title="Change password" icon={KeyRound} description="Use at least 8 characters with upper and lower case letters, a number and a symbol." />
      <form onSubmit={submit} noValidate className="space-y-4 p-5">
        <PasswordInput label="Current password" autoComplete="current-password" value={form.current} onChange={set('current')} error={errors.current} />
        <div className="space-y-3">
          <PasswordInput label="New password" autoComplete="new-password" value={form.next} onChange={set('next')} error={errors.next} />
          {form.next && <PasswordStrength value={form.next} />}
        </div>
        <PasswordInput label="Confirm new password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <Button type="submit" loading={loading}>Update password</Button>
      </form>
    </Card>
  )
}

export function SecurityPanel() {
  const { user, session, setUser } = useAuth()
  const toast = useToast()
  const sessions = useApi('/api/me/sessions', { pick: (r) => r.sessions })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const isStaff = user.role !== 'student'
  const others = (sessions.data || []).filter((s) => !s.current)
  const current = (sessions.data || []).find((s) => s.current)

  const logoutOthers = async () => {
    setLoading(true)
    try {
      const res = await api('/api/me/sessions/revoke-others', { method: 'POST', body: {} })
      toast(`${res.count} other session${res.count === 1 ? '' : 's'} signed out.`)
      sessions.reload({ silent: true })
    } catch (e) {
      toast(e.message, { type: 'error' })
    } finally {
      setLoading(false)
      setConfirmOpen(false)
    }
  }

  const toggle2fa = async (v) => {
    try {
      const res = await api('/api/me/2fa', { method: 'PATCH', body: { enabled: v } })
      setUser(res.user)
      toast(v ? 'Two-factor authentication turned on. You’ll need a code at your next sign-in.' : 'Two-factor authentication turned off', { type: v ? 'success' : 'warning' })
    } catch (e) {
      toast(e.message, { type: 'error' })
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChangePassword />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Two-factor authentication" icon={ShieldCheck} action={<StatusChip status={user.twoFactor || isStaff ? 'active' : 'unpaid'} label={user.twoFactor || isStaff ? 'On' : 'Off'} />} />
          <div className="p-5">
            <Toggle
              label="Require a one-time code at sign-in"
              description={isStaff ? 'Required for all staff accounts and can’t be turned off.' : 'We’ll email you a 6-digit code each time you sign in.'}
              checked={!!user.twoFactor || isStaff}
              disabled={isStaff}
              onChange={toggle2fa}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Last login" icon={Clock} />
          <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-muted">Previous sign-in</dt><dd className="font-medium">{session.previousLogin ? formatDateTime(session.previousLogin) : 'First sign-in'}</dd></div>
            <div><dt className="text-xs text-muted">This session started</dt><dd className="font-medium">{formatDateTime(session.createdAt)}</dd></div>
            <div><dt className="text-xs text-muted">Session ID</dt><dd className="font-mono text-xs">{session.id.slice(-6)}••••</dd></div>
            <div><dt className="text-xs text-muted">Auto sign-out</dt><dd className="font-medium">After {Math.round(IDLE_LIMIT_MS / 60000)} min idle</dd></div>
          </dl>
        </Card>
      </div>

      <Card className="xl:col-span-2">
        <CardHeader
          title="Active sessions"
          description="Devices currently signed in to your account."
          icon={Monitor}
          action={others.length > 0 && <Button variant="secondary" size="sm" icon={LogOut} onClick={() => setConfirmOpen(true)}>Log out other devices</Button>}
        />
        {sessions.loading ? (
          <div className="space-y-3 p-5"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-2/3" /></div>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            <li className="flex items-center gap-4 px-5 py-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><Laptop className="size-5" aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">{current?.device || session.device} <Badge tone="success">This device</Badge></p>
                <p className="text-xs text-muted"><MapPin className="inline size-3" aria-hidden /> IP {current?.ip || '—'} · Active now</p>
              </div>
            </li>
            {others.map((s) => (
              <li key={s.id} className="flex items-center gap-4 px-5 py-4">
                <span className="flex size-10 items-center justify-center rounded-lg bg-subtle text-muted"><Smartphone className="size-5" aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{s.device}</p>
                  <p className="text-xs text-muted">IP {s.ip} · last active {relativeTime(s.lastActive)}</p>
                </div>
              </li>
            ))}
            {others.length === 0 && <li className="px-5 py-3 text-sm text-muted">No other devices are signed in.</li>}
          </ul>
        )}
        <div className="h-2" />
      </Card>

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={logoutOthers} loading={loading} title="Log out other devices?" confirmLabel="Log out others" tone="danger">
        This will end {others.length} other session{others.length > 1 ? 's' : ''} immediately. Anyone using those devices will need your password to sign in again.
      </ConfirmDialog>
    </div>
  )
}

const ACTION_TEXT = {
  LOGIN_SUCCESS: 'Signed in',
  LOGIN_FAILED: 'Failed sign-in attempt',
  LOGOUT: 'Signed out',
  OTP_FAILED: 'Incorrect one-time code entered',
  PASSWORD_CHANGED: 'Password changed',
  PASSWORD_CHANGE_FAILED: 'Failed password change (wrong current password)',
  PASSWORD_RESET: 'Password reset',
  SESSIONS_REVOKED: 'Signed out other devices',
  PAYMENT_CONFIRMED: 'Payment confirmed',
  PAYMENT_FAILED: 'Payment failed',
  PAYMENT_INITIATED: 'Payment started',
  RECEIPT_VIEWED: 'Receipt viewed',
  ACCESS_DENIED: 'Blocked from a restricted page',
  PROFILE_UPDATED: 'Profile updated',
  '2FA_ENABLED': 'Two-factor authentication turned on',
  '2FA_DISABLED': 'Two-factor authentication turned off',
}

export default function SecuritySessions() {
  useDocumentTitle('Security & Sessions')
  const activity = useApi('/api/me/activity', { pick: (r) => r.activity })
  return (
    <>
      <PageHeader
        title="Security & Sessions"
        description="Keep your account safe and see where you’re signed in."
        breadcrumbs={[{ label: 'Security & Sessions' }]}
        actions={
          <Button variant="secondary" icon={TimerReset} onClick={() => window.dispatchEvent(new Event('sfp:simulate-idle'))}>
            Demo: simulate idle timeout
          </Button>
        }
      />
      <Alert tone="info" className="mb-6" title="How we protect your session">
        Your session uses a Secure, HttpOnly, SameSite cookie that scripts can’t read. It ends after {Math.round(IDLE_LIMIT_MS / 60000)} minutes of inactivity, and changing your password signs out every other device.
      </Alert>
      <SecurityPanel />
      <Card className="mt-6">
        <CardHeader title="Recent account activity" description="Security-relevant events on your account, from the audit log" />
        {activity.loading ? (
          <div className="space-y-3 p-5"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-3/4" /></div>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {(activity.data || []).map((a) => {
              const ok = a.result === 'success'
              const Icon = ok ? CheckCircle2 : XCircle
              return (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                  <Icon className={ok ? 'size-5 text-emerald-600 dark:text-emerald-400' : 'size-5 text-red-600 dark:text-red-400'} aria-hidden />
                  <span className="min-w-0 flex-1">
                    {ACTION_TEXT[a.action] || a.action.replaceAll('_', ' ').toLowerCase()}
                    <span className="block truncate text-xs text-muted">{a.target} · IP {a.ip}</span>
                    <span className="sr-only">{ok ? ' (success)' : ' (failure)'}</span>
                  </span>
                  <span className="text-xs whitespace-nowrap text-muted">{relativeTime(a.at)}</span>
                </li>
              )
            })}
            {activity.data?.length === 0 && <li className="px-5 py-3 text-sm text-muted">No activity yet.</li>}
          </ul>
        )}
        <div className="h-2" />
      </Card>
    </>
  )
}
