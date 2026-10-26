import { Card } from '../../components/ui'
import { SCHOOL } from '../../lib/data'
import { useDocumentTitle } from '../../lib/hooks'

const CONTENT = {
  terms: {
    title: 'Terms of use',
    sections: [
      ['Using the portal', `This portal is provided by ${SCHOOL.name} so that students can view and pay fees and staff can manage fee records. Use it only for these purposes.`],
      ['Your account', 'Keep your password private. You are responsible for activity on your account. Tell the Bursary straight away if you suspect unauthorised access.'],
      ['Payments', 'Payments are processed by a licensed payment gateway. A payment only counts once it is confirmed and a receipt is issued. In this demo, all payments are simulated (Test Mode).'],
      ['Refunds', 'Refunds follow the University’s refund policy and are processed through the original payment method after Bursary approval.'],
      ['Acceptable use', 'Do not attempt to access other users’ data, probe the system for vulnerabilities without permission, or interfere with its operation. Such attempts are logged.'],
    ],
  },
  privacy: {
    title: 'Privacy policy',
    sections: [
      ['What we collect', 'Your name, matric number, contact details, academic details, and payment records. We do not store card numbers; card data is handled only by the payment gateway.'],
      ['Why we collect it', 'To show your fees, process payments, issue receipts, send reminders and meet the University’s financial reporting duties.'],
      ['How we protect it', 'Data is encrypted in transit (TLS) and at rest. Access is limited by role and every sensitive action is recorded in an audit log.'],
      ['How long we keep it', 'Financial records are kept for seven years, as required for audit. You can ask for a copy of your data at any time.'],
      ['Your rights', 'Under the Nigeria Data Protection Act 2023 you can access, correct or ask for deletion of your personal data, subject to legal retention requirements.'],
    ],
  },
}

export default function Legal({ kind }) {
  const c = CONTENT[kind]
  useDocumentTitle(c.title)
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="text-3xl font-bold tracking-tight">{c.title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated 1 September 2026</p>
      <Card className="mt-8 divide-y divide-line">
        {c.sections.map(([h, p], i) => (
          <section key={h} className="p-6">
            <h2 className="font-semibold">
              {i + 1}. {h}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{p}</p>
          </section>
        ))}
      </Card>
    </div>
  )
}
