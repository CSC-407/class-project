import { GraduationCap, Target, ShieldCheck, Users, ArrowRight } from 'lucide-react'
import { Card, Button } from '../../components/ui'
import { SCHOOL } from '../../lib/data'
import { useDocumentTitle } from '../../lib/hooks'

export default function About() {
  useDocumentTitle('About')
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-sm font-semibold tracking-wider text-accent-600 uppercase dark:text-accent-400">About</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">A clearer, safer way to handle school fees</h1>
      <p className="mt-4 max-w-3xl text-lg text-muted">
        The {SCHOOL.name} Fees Payment Management System replaces paper receipts and long bursary queues. Students see exactly what they owe and pay online.
        Bursary staff track every naira in real time, with a full audit trail.
      </p>
      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {[
          [Target, 'The problem', 'Students didn’t know exactly what they owed. Paper receipts got lost. Staff struggled to reconcile installments, and nobody could say who changed what.'],
          [GraduationCap, 'For students', 'A single dashboard for fees, balances, due dates and receipts. Pay in full or in installments by card, transfer or USSD.'],
          [Users, 'For the Bursary', 'Fee structures per faculty, department and level. Live collection dashboards, debtor ageing, one-click reports and reconciliation.'],
          [ShieldCheck, 'Security by design', 'Role-based access, hashed passwords, rate limiting, CSRF/XSS protection and an immutable audit log are built in from day one.'],
        ].map(([Icon, title, body]) => (
          <Card key={title} className="p-6">
            <Icon className="size-6 text-brand-600 dark:text-brand-300" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted">{body}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-10 p-6 sm:p-8">
        <h2 className="text-lg font-semibold">About this project</h2>
        <p className="mt-2 text-sm text-muted">
          This application was built for the CSC 407 course “Building Web Applications: Web Application Security, Testing, Deployment and Review”. Alongside the working
          product, it documents its own security controls, test results, deployment pipeline and a critical review.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button to="/project/security" variant="secondary" size="sm">Security</Button>
          <Button to="/project/testing" variant="secondary" size="sm">Testing</Button>
          <Button to="/project/deployment" variant="secondary" size="sm">Deployment</Button>
          <Button to="/project/review" variant="secondary" size="sm" iconRight={ArrowRight}>Review</Button>
        </div>
      </Card>
    </div>
  )
}
