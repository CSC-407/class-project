import { useState } from 'react'
import { ChevronDown, Mail, Phone, Clock, SearchX, MapPin } from 'lucide-react'
import { Card, CardHeader, PageHeader, SearchInput, EmptyState } from '../../components/ui'
import { ContactForm } from '../public/Contact'
import { SCHOOL } from '../../lib/data'
import { cn } from '../../lib/format'
import { useDocumentTitle } from '../../lib/hooks'

const FAQS = [
  ['Payments', 'How long does it take for my payment to reflect?', 'Card and USSD payments reflect instantly. Bank transfers usually reflect within 5 minutes, but can take up to 24 hours if your bank delays confirmation. Your balance updates automatically once confirmed.'],
  ['Payments', 'Can I pay my fees in installments?', 'Yes. Fees marked “Installments allowed” (such as tuition and hostel) can be paid in parts. The minimum installment is ₦10,000, or the remaining balance if it’s smaller. Other fees must be paid in full.'],
  ['Payments', 'My payment failed but I was debited. What should I do?', 'Failed payments are reversed by your bank automatically, usually within 24 to 72 hours. If you haven’t been refunded after 3 working days, contact the Bursary with your payment reference (SFP-…).'],
  ['Payments', 'Why is there a service charge?', 'The payment gateway charges 1.5% per transaction, capped at ₦2,000. It is shown clearly before you pay and is itemised on your receipt.'],
  ['Receipts', 'How do I download my receipt?', 'Go to Receipts, open the receipt and select “Download PDF”. You can also print it or email a copy to yourself.'],
  ['Receipts', 'How can someone confirm my receipt is genuine?', 'Every receipt has a QR code and a receipt number. Anyone can scan the code, or enter the number on the public “Verify receipt” page, to confirm it with our records.'],
  ['Account', 'I forgot my password. How do I reset it?', 'On the login page, select “Forgot password?” and enter your registered email. You’ll get a reset link that is valid for 30 minutes.'],
  ['Account', 'Why was my account locked?', 'After 5 failed sign-in attempts, sign-in is paused for 5 minutes to protect against password guessing. Wait for the timer or reset your password.'],
  ['Account', 'How do I change my name or matric number?', 'These details come from the Registry and can’t be edited here. Visit the Registry with your admission letter to request a correction.'],
  ['Security', 'Is it safe to pay with my card here?', 'Yes. Card details are entered on the payment gateway’s secure page and never reach our servers. We only keep the last 4 digits for your records.'],
]

export default function Help() {
  useDocumentTitle('Help & FAQ')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(0)
  const rows = FAQS.filter(([c, qq, a]) => !q || `${c} ${qq} ${a}`.toLowerCase().includes(q.toLowerCase()))
  const cats = [...new Set(rows.map((r) => r[0]))]

  return (
    <>
      <PageHeader title="Help & FAQ" description="Answers to common questions about fees, payments and receipts." breadcrumbs={[{ label: 'Help & FAQ' }]} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <SearchInput value={q} onChange={(v) => { setQ(v); setOpen(-1) }} placeholder="Search questions, e.g. “installment”" label="Search FAQs" className="mb-5" />
          {rows.length === 0 ? (
            <Card><EmptyState icon={SearchX} title="No answers found">Try different words, or send the Bursary a message.</EmptyState></Card>
          ) : (
            cats.map((c) => (
              <section key={c} className="mb-6">
                <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">{c}</h2>
                <Card className="divide-y divide-line">
                  {rows.filter((r) => r[0] === c).map(([, question, answer]) => {
                    const idx = FAQS.findIndex((f) => f[1] === question)
                    const isOpen = open === idx
                    return (
                      <div key={question}>
                        <h3>
                          <button
                            onClick={() => setOpen(isOpen ? -1 : idx)}
                            aria-expanded={isOpen}
                            aria-controls={`faq-${idx}`}
                            className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-3 text-left text-sm font-medium hover:bg-subtle/60"
                          >
                            {question}
                            <ChevronDown className={cn('size-5 shrink-0 text-muted transition-transform', isOpen && 'rotate-180')} aria-hidden />
                          </button>
                        </h3>
                        {isOpen && (
                          <div id={`faq-${idx}`} className="animate-fade-up px-5 pb-4 text-sm leading-relaxed text-muted">
                            {answer}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </Card>
              </section>
            ))
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Contact the Bursary" />
            <ul className="space-y-3 p-5 text-sm">
              <li className="flex gap-3"><Mail className="size-4 shrink-0 text-muted" aria-hidden /> {SCHOOL.email}</li>
              <li className="flex gap-3"><Phone className="size-4 shrink-0 text-muted" aria-hidden /> {SCHOOL.phone}</li>
              <li className="flex gap-3"><Clock className="size-4 shrink-0 text-muted" aria-hidden /> {SCHOOL.hours}</li>
              <li className="flex gap-3"><MapPin className="size-4 shrink-0 text-muted" aria-hidden /> Senate Building, Ground Floor</li>
            </ul>
          </Card>
          <Card>
            <CardHeader title="Send a message" description="We usually reply within one working day." />
            <div className="p-5"><ContactForm compact /></div>
          </Card>
        </div>
      </div>
    </>
  )
}
