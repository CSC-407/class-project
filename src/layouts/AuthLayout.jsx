import { Link } from 'react-router-dom'
import { ShieldCheck, Lock, ReceiptText, Zap, ArrowLeft } from 'lucide-react'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { SCHOOL } from '../lib/data'

/** Split-screen layout: brand panel on desktop, single column on mobile. */
export default function AuthLayout({ children, wide = false }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-brand-900 p-10 text-white lg:flex lg:flex-col dark:bg-[#0c1626]">
        <div className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-brand-600/40 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-40 -left-20 size-96 rounded-full bg-accent-500/15 blur-3xl" aria-hidden />
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden>
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M32 0H0v32" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <div className="relative">
          <Logo light />
        </div>
        <div className="relative mt-auto max-w-md">
          <p className="text-sm font-semibold tracking-wider text-accent-300 uppercase">{SCHOOL.name} · Bursary</p>
          <h2 className="mt-3 text-3xl leading-tight font-bold xl:text-4xl">Your fees, payments and receipts in one secure place.</h2>
          <ul className="mt-8 space-y-4 text-sm text-brand-100">
            {[
              [Lock, 'End-to-end TLS encryption. Card details never touch our servers.'],
              [Zap, 'Pay in full or in installments, in under a minute.'],
              [ReceiptText, 'Instant receipts with a QR code anyone can verify.'],
              [ShieldCheck, 'Every sensitive action is recorded in a tamper-evident audit log.'],
            ].map(([Icon, text]) => (
              <li key={text} className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-4 text-accent-300" aria-hidden />
                </span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-12 text-xs text-brand-300">© {new Date().getFullYear()} {SCHOOL.name}. Test Mode: no real payments are processed.</p>
      </aside>

      <div className="flex min-h-screen flex-col">
        <div className="flex h-16 items-center justify-between px-4 sm:px-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <Link to="/" className="hidden items-center gap-1.5 text-sm font-medium text-muted hover:text-fg lg:flex">
            <ArrowLeft className="size-4" aria-hidden /> Back to home
          </Link>
          <ThemeToggle />
        </div>
        <main id="main" className="flex flex-1 items-start justify-center px-4 py-6 sm:items-center sm:px-8 sm:py-10">
          <div className={`animate-fade-up w-full ${wide ? 'max-w-xl' : 'max-w-md'}`}>{children}</div>
        </main>
        <p className="flex items-center justify-center gap-1.5 px-4 pb-6 text-center text-xs text-muted">
          <Lock className="size-3.5" aria-hidden /> Your data is encrypted in transit and at rest.
        </p>
      </div>
    </div>
  )
}
