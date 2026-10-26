import { useState } from 'react'
import { Palette, Plus, Trash2, Download, Mail, Inbox, Settings, LogOut, User } from 'lucide-react'
import {
  Card, CardHeader, Button, Input, PasswordInput, PasswordStrength, Select, SearchInput, OTPInput, Checkbox, Toggle, Badge, StatusChip, Alert, ProgressBar,
  Tabs, Stepper, EmptyState, Skeleton, Pagination, Breadcrumbs, Avatar, Dropdown, MenuItem, Modal, SegmentedControl, Spinner,
} from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import { naira } from '../../lib/format'
import { useDocumentTitle } from '../../lib/hooks'

const BRAND = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
const SEMANTIC = [
  ['Success · Paid', 'bg-emerald-500', '#10b981'],
  ['Warning · Partial / Pending', 'bg-amber-500', '#f59e0b'],
  ['Danger · Owing / Failed', 'bg-red-500', '#ef4444'],
  ['Info', 'bg-sky-500', '#0ea5e9'],
  ['Accent · CTA', 'bg-accent-500', '#f59e0b'],
]
const SURFACES = [['page', 'bg-page'], ['card', 'bg-card'], ['subtle', 'bg-subtle'], ['line', 'bg-line'], ['muted', 'bg-muted'], ['fg', 'bg-fg']]
const TYPE = [
  ['Display', 'text-5xl font-extrabold tracking-tight', '48/1.1 · 800'],
  ['H1', 'text-3xl font-bold tracking-tight', '30/1.2 · 700'],
  ['H2', 'text-xl font-bold tracking-tight', '20/1.4 · 700'],
  ['H3', 'text-base font-semibold', '16/1.5 · 600'],
  ['Body', 'text-sm', '14/1.5 · 400'],
  ['Caption', 'text-xs text-muted', '12/1.4 · 400'],
]

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

export default function DesignSystem() {
  useDocumentTitle('Design System')
  const toast = useToast()
  const [tab, setTab] = useState('one')
  const [otp, setOtp] = useState('12')
  const [pw, setPw] = useState('Kgu2026')
  const [chk, setChk] = useState(true)
  const [tog, setTog] = useState(true)
  const [page, setPage] = useState(2)
  const [modal, setModal] = useState(false)
  const [seg, setSeg] = useState('month')

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="flex items-center gap-2 text-sm font-semibold tracking-wider text-accent-600 uppercase dark:text-accent-400"><Palette className="size-4" aria-hidden /> Handoff</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Design system</h1>
      <p className="mt-2 max-w-2xl text-muted">Tokens and components used across the portal. Toggle the theme in the header to see the dark variants. Spacing follows an 8px grid; radii are 8 to 12px.</p>

      <div className="mt-10">
        <Section title="Colour · Primary (navy)">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-11">
            {BRAND.map((s) => (
              <div key={s}>
                <div className={`h-14 rounded-lg border border-line bg-brand-${s}`} style={{ background: `var(--color-brand-${s})` }} />
                <p className="mt-1 font-mono text-[11px] text-muted">{s}</p>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Colour · Semantic and surfaces">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="space-y-2 p-4">
              {SEMANTIC.map(([n, cls, hex]) => (
                <div key={n} className="flex items-center gap-3"><span className={`size-8 rounded-lg ${cls}`} /><span className="flex-1 text-sm">{n}</span><span className="font-mono text-xs text-muted">{hex}</span></div>
              ))}
            </Card>
            <Card className="grid grid-cols-3 gap-3 p-4">
              {SURFACES.map(([n, cls]) => (
                <div key={n}><div className={`h-12 rounded-lg border border-line ${cls}`} /><p className="mt-1 font-mono text-[11px] text-muted">--{n}</p></div>
              ))}
            </Card>
          </div>
        </Section>
        <Section title="Typography · Plus Jakarta Sans / JetBrains Mono">
          <Card className="divide-y divide-line">
            {TYPE.map(([n, cls, spec]) => (
              <div key={n} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-6">
                <span className="w-20 shrink-0 text-xs text-muted">{n}</span>
                <span className={`flex-1 ${cls}`}>Pay school fees securely</span>
                <span className="font-mono text-xs text-muted">{spec}</span>
              </div>
            ))}
            <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-6">
              <span className="w-20 shrink-0 text-xs text-muted">Money</span>
              <span className="flex-1 text-2xl font-bold num">{naira(1250000)}</span>
              <span className="font-mono text-xs text-muted">tabular-nums</span>
            </div>
            <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-6">
              <span className="w-20 shrink-0 text-xs text-muted">Mono</span>
              <span className="flex-1 font-mono">SFP-2026-000123 · 21/0345</span>
              <span className="font-mono text-xs text-muted">refs, matric</span>
            </div>
          </Card>
        </Section>
        <Section title="Spacing scale (8px grid)">
          <Card className="flex flex-wrap items-end gap-4 p-5">
            {[4, 8, 12, 16, 24, 32, 48, 64].map((s) => (
              <div key={s} className="text-center"><div className="rounded bg-brand-500" style={{ width: s, height: s }} /><p className="mt-1 font-mono text-[11px] text-muted">{s}</p></div>
            ))}
          </Card>
        </Section>
        <Section title="Buttons">
          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap gap-2">
              <Button icon={Plus}>Primary</Button>
              <Button variant="accent">Accent CTA</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive" icon={Trash2}>Destructive</Button>
              <Button disabled>Disabled</Button>
              <Button loading>Loading</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Small</Button><Button>Medium</Button><Button size="lg">Large</Button>
              <Button size="icon" variant="secondary" aria-label="Download"><Download className="size-4" /></Button>
              <Button variant="link">Link button</Button>
            </div>
          </Card>
        </Section>
        <Section title="Inputs">
          <Card className="grid gap-5 p-5 md:grid-cols-2">
            <Input label="Text input" placeholder="Chinedu Okafor" hint="Helper text" />
            <Input label="With error" value="chinedu@" readOnly error="Enter a valid email, like name@example.com" />
            <div className="space-y-3"><PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} /><PasswordStrength value={pw} /></div>
            <Select label="Select" options={['Engineering', 'Sciences', 'Law']} placeholder="Select faculty" />
            <Input label="Date" type="date" />
            <div><p className="mb-1.5 text-sm font-medium">Search</p><SearchInput value="" onChange={() => {}} placeholder="Search reference" /></div>
            <Input label="Read-only (locked)" value="21/0345" locked mono />
            <div><p className="mb-1.5 text-sm font-medium">OTP</p><OTPInput value={otp} onChange={setOtp} /></div>
            <Checkbox label="Checkbox" description="With description" checked={chk} onChange={setChk} />
            <Toggle label="Toggle" description="Switch control" checked={tog} onChange={setTog} />
          </Card>
        </Section>
        <Section title="Badges and status chips">
          <Card className="flex flex-wrap gap-2 p-5">
            {['paid', 'partial', 'unpaid', 'overdue', 'success', 'pending', 'failed', 'verified', 'refunded', 'suspended', 'implemented'].map((s) => <StatusChip key={s} status={s} />)}
            <Badge tone="brand">Brand</Badge><Badge tone="accent">Test Mode</Badge>
          </Card>
        </Section>
        <Section title="Alerts and toasts">
          <div className="space-y-3">
            <Alert tone="info" title="Info">Your fee schedule has been updated.</Alert>
            <Alert tone="success" title="Success">Payment confirmed.</Alert>
            <Alert tone="warning" title="Warning">Hostel fee is due in 3 days.</Alert>
            <Alert tone="danger" title="Error">Your card was declined.</Alert>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => toast('Payment confirmed: ₦150,000.00')}>Success toast</Button>
              <Button variant="secondary" onClick={() => toast('Card declined', { type: 'error' })}>Error toast</Button>
              <Button variant="secondary" onClick={() => setModal(true)}>Open modal</Button>
            </div>
          </div>
        </Section>
        <Section title="Navigation">
          <Card className="space-y-6 p-5">
            <Breadcrumbs items={[{ label: 'Receipts', to: '/design-system' }, { label: 'RCP-2026-000163' }]} />
            <Tabs value={tab} onChange={setTab} tabs={[{ value: 'one', label: 'Profile' }, { value: 'two', label: 'Security', count: 2 }, { value: 'three', label: 'Appearance' }]} />
            <SegmentedControl label="Range" value={seg} onChange={setSeg} options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]} />
            <Stepper steps={['Select items', 'Review', 'Payment method', 'Checkout']} current={1} />
            <Pagination page={page} pages={8} setPage={setPage} total={80} pageSize={10} />
          </Card>
        </Section>
        <Section title="Feedback: progress, skeleton, empty state">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="space-y-4 p-5"><ProgressBar value={65} label="Demo" /><ProgressBar value={100} tone="success" label="Demo" /><ProgressBar value={30} tone="danger" size="sm" label="Demo" /><Spinner /></Card>
            <Card className="space-y-3 p-5"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-40" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /></Card>
            <Card><EmptyState icon={Inbox} title="No payments yet" action={<Button size="sm">Pay your first fee</Button>}>Your payments will appear here.</EmptyState></Card>
          </div>
        </Section>
        <Section title="Avatar and dropdown">
          <Card className="flex flex-wrap items-center gap-4 p-5">
            <Avatar name="Aisha Bello" size="sm" /><Avatar name="Tunde Adeyemi" /><Avatar name="Chinedu Okafor" size="lg" />
            <Dropdown align="left" trigger={({ toggle, open }) => <Button variant="secondary" onClick={toggle} aria-expanded={open}>Dropdown menu</Button>}>
              <MenuItem icon={User}>Profile</MenuItem><MenuItem icon={Settings}>Settings</MenuItem><MenuItem icon={Mail}>Messages</MenuItem><MenuItem icon={LogOut} danger>Log out</MenuItem>
            </Dropdown>
          </Card>
        </Section>
        <Card>
          <CardHeader title="Handoff notes" />
          <ul className="list-disc space-y-1.5 p-5 pl-10 text-sm text-muted">
            <li>Radius: 8px inputs and buttons, 12px cards, 16px modals and sheets.</li>
            <li>Touch targets are at least 44×44px (h-11) on mobile; small buttons are 36px for desktop tables only.</li>
            <li>Focus: 2px ring in the brand colour with 2px offset on every interactive element.</li>
            <li>Status always pairs an icon with a text label, never colour alone.</li>
            <li>Money uses tabular numerals; references and matric numbers use the mono font.</li>
            <li>Motion is 200 to 300ms ease-out and turned off when the user prefers reduced motion.</li>
          </ul>
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Confirm refund" description="This action is recorded in the audit log." footer={<><Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button><Button variant="destructive" onClick={() => setModal(false)}>Issue refund</Button></>}>
        <p className="text-sm text-muted">Refund ₦60,000.00 to Chinedu Okafor for SFP-2026-000140?</p>
      </Modal>
    </div>
  )
}
