import { useState } from 'react'
import { UserPlus, ShieldCheck, MoreVertical, UserCog, Ban, CheckCircle2, KeyRound } from 'lucide-react'
import { api, useApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { Card, CardHeader, PageHeader, Button, Table, Th, Td, Avatar, Badge, StatusChip, Modal, Input, Select, ConfirmDialog, Dropdown, MenuItem, Alert } from '../../components/ui'
import { PermissionsMatrix } from '../../components/PermissionsMatrix'
import { formatDateTime } from '../../lib/format'
import { validators } from '../../lib/validation'
import { useDocumentTitle } from '../../lib/hooks'

const ROLE_LABEL = { admin: 'Admin', superadmin: 'Super Admin' }

export default function UserRoles() {
  useDocumentTitle('Users & Roles')
  const { data, loading, error, reload } = useApi('/api/admin/users', { pick: (r) => r.users })
  const users = data || []
  const [busy, setBusy] = useState(false)
  const { user } = useAuth()
  const toast = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'admin' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null) // { type, u, role? }

  const create = async (e) => {
    e.preventDefault()
    const errs = {
      name: validators.name(form.name),
      email: validators.email(form.email) || (!form.email.trim().toLowerCase().endsWith('@kingsgate.edu.ng') ? 'Staff accounts must use a @kingsgate.edu.ng email' : ''),
    }
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return
    setSaving(true)
    try {
      await api('/api/admin/users', { method: 'POST', body: form })
      toast(`Invitation sent to ${form.email}`)
      setCreateOpen(false)
      setForm({ name: '', email: '', role: 'admin' })
      reload({ silent: true })
    } catch (err) {
      setErrors(Object.keys(err.fields).length ? err.fields : { email: err.message })
    } finally {
      setSaving(false)
    }
  }

  const apply = async () => {
    const { type, u, role } = confirm
    setBusy(true)
    try {
      if (type === 'role') {
        await api(`/api/admin/users/${u.id}`, { method: 'PATCH', body: { role } })
        toast(`${u.name} is now ${ROLE_LABEL[role]}`)
      } else {
        const status = type === 'deactivate' ? 'deactivated' : 'active'
        await api(`/api/admin/users/${u.id}`, { method: 'PATCH', body: { status } })
        toast(`${u.name} ${status === 'active' ? 'reactivated' : 'deactivated and signed out'}`)
      }
      reload({ silent: true })
    } catch (e) {
      toast(e.message, { type: 'error' })
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Users & Roles"
        description="Manage Bursary staff accounts and what each role can do."
        breadcrumbs={[{ label: 'Users & Roles' }]}
        actions={<Button icon={UserPlus} onClick={() => setCreateOpen(true)}>Create admin</Button>}
      />

      <Card>
        <CardHeader title="Staff accounts" description={`${users.filter((u) => u.status === 'active').length} active of ${users.length}`} />
        <Table className="mt-3">
          <thead><tr><Th>User</Th><Th>Role</Th><Th className="hidden md:table-cell">2FA</Th><Th className="hidden lg:table-cell">Last login</Th><Th>Status</Th><Th align="right"><span className="sr-only">Actions</span></Th></tr></thead>
          <tbody>
            {users.map((u) => {
              const self = u.email === user.email
              return (
                <tr key={u.id} className="hover:bg-subtle/60">
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} size="sm" />
                      <div className="min-w-0"><p className="font-medium">{u.name}{self && <span className="ml-1.5 text-xs text-muted">(you)</span>}</p><p className="truncate text-xs text-muted">{u.email}</p></div>
                    </div>
                  </Td>
                  <Td><Badge tone={u.role === 'superadmin' ? 'accent' : 'brand'} icon={u.role === 'superadmin' ? KeyRound : ShieldCheck}>{ROLE_LABEL[u.role]}</Badge></Td>
                  <Td className="hidden md:table-cell"><StatusChip status={u.twoFactor ? 'active' : 'pending'} label={u.twoFactor ? 'Enabled' : 'Setup pending'} /></Td>
                  <Td className="hidden lg:table-cell whitespace-nowrap text-muted">{u.lastLogin ? formatDateTime(u.lastLogin) : 'Never'}</Td>
                  <Td><StatusChip status={u.status} /></Td>
                  <Td align="right">
                    {!self && (
                      <Dropdown trigger={({ toggle, open }) => <button onClick={toggle} aria-expanded={open} className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-subtle" aria-label={`Actions for ${u.name}`}><MoreVertical className="size-4" /></button>}>
                        <MenuItem icon={UserCog} onClick={() => setConfirm({ type: 'role', u, role: u.role === 'admin' ? 'superadmin' : 'admin' })}>
                          Change to {u.role === 'admin' ? 'Super Admin' : 'Admin'}
                        </MenuItem>
                        {u.status === 'active' ? (
                          <MenuItem icon={Ban} danger onClick={() => setConfirm({ type: 'deactivate', u })}>Deactivate</MenuItem>
                        ) : (
                          <MenuItem icon={CheckCircle2} onClick={() => setConfirm({ type: 'activate', u })}>Reactivate</MenuItem>
                        )}
                      </Dropdown>
                    )}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Permissions matrix" description="Enforced on the server for every request, not just hidden in the UI." icon={ShieldCheck} />
        <div className="mt-3"><PermissionsMatrix /></div>
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create admin account" description="They’ll get an email invite to set a password and enrol in 2FA.">
        <form onSubmit={create} noValidate className="space-y-4">
          <Input label="Full name" required value={form.name} onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors({}) }} error={errors.name} />
          <Input label="Staff email" required type="email" placeholder="name@kingsgate.edu.ng" value={form.email} onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setErrors({}) }} error={errors.email} />
          <Select label="Role" options={[{ value: 'admin', label: 'Admin (Bursary staff)' }, { value: 'superadmin', label: 'Super Admin (system owner)' }]} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
          {form.role === 'superadmin' && <Alert tone="warning">Super Admins can manage all accounts and system settings. Grant this role sparingly.</Alert>}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving} icon={UserPlus}>Send invite</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={apply}
        loading={busy}
        tone={confirm?.type === 'deactivate' || confirm?.role === 'superadmin' ? 'danger' : 'primary'}
        title={confirm?.type === 'role' ? `Change ${confirm.u.name}’s role?` : confirm?.type === 'deactivate' ? `Deactivate ${confirm?.u.name}?` : `Reactivate ${confirm?.u.name}?`}
        confirmLabel={confirm?.type === 'role' ? 'Change role' : confirm?.type === 'deactivate' ? 'Deactivate' : 'Reactivate'}
      >
        {confirm?.type === 'role'
          ? `${confirm.u.name} will change from ${ROLE_LABEL[confirm.u.role]} to ${ROLE_LABEL[confirm.role]}. Their permissions update at their next request.`
          : confirm?.type === 'deactivate'
            ? 'They’ll be signed out everywhere and won’t be able to sign in. Their audit history is kept.'
            : 'They’ll be able to sign in again with their existing password and 2FA.'}
      </ConfirmDialog>
    </>
  )
}
