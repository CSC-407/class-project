import { useState } from 'react'
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2 } from 'lucide-react'
import { Card, Input, Textarea, Select, Button, Alert } from '../../components/ui'
import { SCHOOL } from '../../lib/data'
import { validators } from '../../lib/validation'
import { api } from '../../lib/api'
import { useDocumentTitle } from '../../lib/hooks'

export function ContactForm({ compact }) {
  const [form, setForm] = useState({ name: '', email: '', topic: '', message: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(null)
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setErrors((er) => ({ ...er, [k]: '' }))
  }
  const submit = async (e) => {
    e.preventDefault()
    const errs = {
      name: form.name.trim() ? '' : 'Enter your name',
      email: validators.email(form.email),
      topic: form.topic ? '' : 'Choose a topic',
      message: form.message.trim().length < 10 ? 'Tell us a bit more (at least 10 characters)' : '',
    }
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return
    setLoading(true)
    try {
      const res = await api('/api/contact', { method: 'POST', body: form })
      setSent(res.ticket)
    } catch (err) {
      setErrors({ ...err.fields, message: err.fields?.message || (Object.keys(err.fields || {}).length ? '' : err.message) })
    } finally {
      setLoading(false)
    }
  }
  if (sent) {
    return (
      <Alert tone="success" icon={CheckCircle2} title="Message sent">
        Thanks, {form.name.split(' ')[0]}. The Bursary usually replies within one working day. Your ticket number is{' '}
        <span className="font-mono font-semibold">{sent}</span>.
      </Alert>
    )
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className={compact ? 'space-y-4' : 'grid gap-4 sm:grid-cols-2'}>
        <Input label="Your name" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" maxLength={80} />
        <Input label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" maxLength={120} />
      </div>
      <Select label="Topic" placeholder="Select a topic" options={['Payment not reflecting', 'Wrong fee amount', 'Receipt issue', 'Refund request', 'Account access', 'Other']} value={form.topic} onChange={set('topic')} error={errors.topic} />
      <Textarea label="Message" rows={5} value={form.message} onChange={set('message')} error={errors.message} maxLength={2000} hint={`${form.message.length}/2000`} />
      <Button type="submit" loading={loading} icon={Send}>Send message</Button>
    </form>
  )
}

export default function Contact() {
  useDocumentTitle('Contact')
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.4fr]">
      <div>
        <p className="text-sm font-semibold tracking-wider text-accent-600 uppercase dark:text-accent-400">Contact</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Talk to the Bursary</h1>
        <p className="mt-4 text-muted">Questions about a fee, a payment that hasn’t reflected, or a receipt? We’re here to help.</p>
        <ul className="mt-8 space-y-5">
          {[
            [Mail, 'Email', SCHOOL.email],
            [Phone, 'Phone', SCHOOL.phone],
            [MapPin, 'Office', `${SCHOOL.bursary}, Senate Building, ${SCHOOL.address}`],
            [Clock, 'Hours', SCHOOL.hours],
          ].map(([Icon, k, v]) => (
            <li key={k} className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold">{k}</p>
                <p className="text-sm text-muted">{v}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Send us a message</h2>
        <p className="mb-6 text-sm text-muted">Include your matric number and payment reference if you have one.</p>
        <ContactForm />
      </Card>
    </div>
  )
}
