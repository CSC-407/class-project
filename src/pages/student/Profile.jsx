import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Camera, Pencil, Save, X, User, ShieldCheck, Bell, Palette, Sun, Moon, Monitor, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import { Card, CardHeader, PageHeader, Tabs, Input, Button, Avatar, Toggle, Alert, Textarea } from '../../components/ui'
import { validators } from '../../lib/validation'
import { cn } from '../../lib/format'
import { api } from '../../lib/api'
import { SecurityPanel } from './SecuritySessions'
import { useDocumentTitle } from '../../lib/hooks'


const MAX_PHOTO = 2 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function ProfileTab() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const fileRef = useRef(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ phone: user.phone || '', address: user.address || '' })
  const [errors, setErrors] = useState({})
  const [photoError, setPhotoError] = useState('')
  const [saving, setSaving] = useState(false)
  const isStudent = user.role === 'student'

  const onPhoto = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!PHOTO_TYPES.includes(file.type)) return setPhotoError('Upload a JPG, PNG or WebP image.')
    if (file.size > MAX_PHOTO) return setPhotoError(`That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The maximum is 2 MB.`)
    setPhotoError('')
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const res = await api('/api/me/photo', { method: 'PUT', body: { photo: reader.result } })
        setUser(res.user)
        toast('Profile photo updated')
      } catch (err) {
        setPhotoError(err.message)
      }
    }
    reader.readAsDataURL(file)
  }

  const saveProfile = async () => {
    const errs = { phone: validators.phone(form.phone) }
    setErrors(errs)
    if (errs.phone) return
    setSaving(true)
    try {
      const res = await api('/api/me/profile', { method: 'PATCH', body: { phone: form.phone.trim(), address: form.address.trim() } })
      setUser(res.user)
      setEditing(false)
      toast('Your profile has been updated')
    } catch (err) {
      setErrors({ phone: err.fields?.phone || err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <Card className="flex flex-col items-center p-6 text-center">
        <div className="relative">
          <Avatar name={user.name} src={user.photo} size="xl" />
          <button onClick={() => fileRef.current?.click()} className="absolute right-0 bottom-0 flex size-10 items-center justify-center rounded-full border-2 border-card bg-brand-700 text-white shadow hover:bg-brand-600" aria-label="Upload new photo">
            <Camera className="size-4" />
          </button>
          <input ref={fileRef} type="file" accept={PHOTO_TYPES.join(',')} className="sr-only" onChange={onPhoto} aria-label="Profile photo file" />
        </div>
        <p className="mt-4 text-lg font-semibold">{user.name}</p>
        <p className="font-mono text-sm text-muted">{user.matric || user.staffId}</p>
        <p className="mt-1 text-sm text-muted">{isStudent ? `${user.level} Level · ${user.department}` : user.title}</p>
        <p className="mt-4 text-xs text-muted">JPG, PNG or WebP · max 2 MB</p>
        {photoError && <Alert tone="danger" className="mt-3 text-left">{photoError}</Alert>}
        {user.photo && (
          <Button variant="ghost" size="sm" icon={Trash2} className="mt-2" onClick={async () => { const res = await api('/api/me/photo', { method: 'PUT', body: { photo: null } }); setUser(res.user) }}>Remove photo</Button>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Personal and academic details"
          description="Fields with a lock are managed by the Registry. Contact them to change these."
          action={
            !editing ? (
              <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
            ) : null
          }
        />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Input label="Full name" value={user.name} locked />
          <Input label="Email address" value={user.email} locked />
          {isStudent ? (
            <>
              <Input label="Matric number" value={user.matric} locked mono />
              <Input label="Level" value={`${user.level} Level`} locked />
              <Input label="Faculty" value={user.faculty} locked />
              <Input label="Department" value={user.department} locked />
            </>
          ) : (
            <>
              <Input label="Staff ID" value={user.staffId} locked mono />
              <Input label="Job title" value={user.title} locked />
            </>
          )}
          <Input
            label="Phone number"
            type="tel"
            value={editing ? form.phone : user.phone || ''}
            readOnly={!editing}
            onChange={(e) => { setForm((f) => ({ ...f, phone: e.target.value })); setErrors({}) }}
            error={errors.phone}
          />
          <Textarea
            label="Home address"
            className="sm:col-span-2"
            rows={2}
            value={editing ? form.address : user.address || '—'}
            readOnly={!editing}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            maxLength={200}
          />
        </div>
        {editing && (
          <div className="flex flex-col-reverse gap-2 border-t border-line p-5 sm:flex-row sm:justify-end">
            <Button variant="secondary" icon={X} onClick={() => { setEditing(false); setForm({ phone: user.phone || '', address: user.address || '' }); setErrors({}) }}>Cancel</Button>
            <Button icon={Save} loading={saving} onClick={saveProfile}>Save changes</Button>
          </div>
        )}
      </Card>
    </div>
  )
}

function NotificationsTab() {
  const toast = useToast()
  const [prefs, setPrefs] = useState({ emailReminders: true, smsReminders: false, emailReceipts: true, securityAlerts: true, announcements: true })
  useEffect(() => {
    api('/api/me/prefs').then((r) => setPrefs((p) => ({ ...p, ...r.prefs }))).catch(() => {})
  }, [])
  const set = (k) => async (v) => {
    setPrefs((p) => ({ ...p, [k]: v }))
    try {
      const r = await api('/api/me/prefs', { method: 'PUT', body: { [k]: v } })
      setPrefs((p) => ({ ...p, ...r.prefs }))
      toast('Notification preferences saved', { duration: 2000 })
    } catch (err) {
      setPrefs((p) => ({ ...p, [k]: !v }))
      toast(err.message, { type: 'error' })
    }
  }
  return (
    <Card>
      <CardHeader title="Notification preferences" description="Choose how we contact you. Security alerts can’t be turned off." />
      <div className="divide-y divide-line px-5 pb-2">
        <div className="py-4"><Toggle label="Email due-date reminders" description="7 days and 1 day before a fee is due" checked={prefs.emailReminders} onChange={set('emailReminders')} /></div>
        <div className="py-4"><Toggle label="SMS due-date reminders" description="Sent to your registered phone number" checked={prefs.smsReminders} onChange={set('smsReminders')} /></div>
        <div className="py-4"><Toggle label="Email receipts" description="Get a copy of every receipt by email" checked={prefs.emailReceipts} onChange={set('emailReceipts')} /></div>
        <div className="py-4"><Toggle label="Bursary announcements" description="Fee schedule changes and deadlines" checked={prefs.announcements} onChange={set('announcements')} /></div>
        <div className="py-4"><Toggle label="Security alerts" description="New sign-ins and password changes (always on)" checked disabled onChange={() => {}} /></div>
      </div>
    </Card>
  )
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme()
  const opts = [
    ['light', Sun, 'Light', 'Bright and clear'],
    ['dark', Moon, 'Dark', 'Easier on the eyes at night'],
    ['system', Monitor, 'System', 'Match your device'],
  ]
  return (
    <Card>
      <CardHeader title="Appearance" description="Choose how the portal looks to you." />
      <div role="radiogroup" aria-label="Theme" className="grid gap-3 p-5 sm:grid-cols-3">
        {opts.map(([v, Icon, label, sub]) => (
          <button
            key={v}
            role="radio"
            aria-checked={theme === v}
            onClick={() => setTheme(v)}
            className={cn('rounded-xl border p-4 text-left transition-colors', theme === v ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-500/10' : 'border-line hover:bg-subtle')}
          >
            <div className={cn('mb-3 flex h-20 items-end gap-1.5 overflow-hidden rounded-lg border border-line p-2', v === 'dark' ? 'bg-[#0a111d]' : v === 'light' ? 'bg-[#f5f7fb]' : 'bg-gradient-to-r from-[#f5f7fb] from-50% to-[#0a111d] to-50%')} aria-hidden>
              <span className="h-full w-5 rounded bg-brand-800" />
              <span className={cn('h-10 flex-1 rounded', v === 'dark' ? 'bg-[#111a2a]' : 'bg-white')} />
            </div>
            <span className="flex items-center gap-2 font-medium"><Icon className="size-4" aria-hidden /> {label}</span>
            <span className="text-sm text-muted">{sub}</span>
          </button>
        ))}
      </div>
    </Card>
  )
}

export default function Profile() {
  useDocumentTitle('Profile & Settings')
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'profile'
  return (
    <>
      <PageHeader title="Profile & Settings" description="Manage your details, security and preferences." breadcrumbs={[{ label: 'Profile & Settings' }]} />
      <Tabs
        className="mb-6"
        value={tab}
        onChange={(t) => setParams({ tab: t })}
        tabs={[
          { value: 'profile', label: 'Profile', icon: User },
          { value: 'security', label: 'Security', icon: ShieldCheck },
          { value: 'notifications', label: 'Notifications', icon: Bell },
          { value: 'appearance', label: 'Appearance', icon: Palette },
        ]}
      />
      {tab === 'profile' && <ProfileTab />}
      {tab === 'security' && <SecurityPanel />}
      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'appearance' && <AppearanceTab />}
    </>
  )
}
