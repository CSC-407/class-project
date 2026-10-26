import {
  LayoutDashboard, Wallet, CreditCard, History, ReceiptText, Bell, UserCog, ShieldCheck, LifeBuoy,
  Users, Layers, Banknote, AlertOctagon, FileBarChart, ScrollText, KeyRound, Activity, Shield, FlaskConical, Rocket, ClipboardCheck,
} from 'lucide-react'

export const STUDENT_NAV = [
  {
    group: 'Overview',
    items: [
      { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/app/fees', label: 'My Fees', icon: Wallet },
      { to: '/app/pay', label: 'Make Payment', icon: CreditCard },
      { to: '/app/history', label: 'Payment History', icon: History },
      { to: '/app/receipts', label: 'Receipts', icon: ReceiptText },
    ],
  },
  {
    group: 'Account',
    items: [
      { to: '/app/notifications', label: 'Notifications', icon: Bell, badge: 'unread' },
      { to: '/app/profile', label: 'Profile & Settings', icon: UserCog },
      { to: '/app/security', label: 'Security & Sessions', icon: ShieldCheck },
      { to: '/app/help', label: 'Help & FAQ', icon: LifeBuoy },
    ],
  },
]

export const ADMIN_NAV = (role) => [
  {
    group: 'Bursary',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/students', label: 'Students', icon: Users },
      { to: '/admin/fees', label: 'Fee Structures', icon: Layers },
      { to: '/admin/payments', label: 'Payments', icon: Banknote },
      { to: '/admin/debtors', label: 'Debtors', icon: AlertOctagon },
      { to: '/admin/reports', label: 'Reports', icon: FileBarChart },
      { to: '/admin/audit', label: 'Audit Log', icon: ScrollText },
    ],
  },
  ...(role === 'superadmin'
    ? [
        {
          group: 'System',
          items: [
            { to: '/admin/users', label: 'Users & Roles', icon: KeyRound },
            { to: '/admin/system', label: 'System Health', icon: Activity },
          ],
        },
      ]
    : []),
  {
    group: 'Account',
    items: [
      { to: '/app/notifications', label: 'Notifications', icon: Bell, badge: 'unread' },
      { to: '/app/profile', label: 'Profile & Settings', icon: UserCog },
      { to: '/app/security', label: 'Security & Sessions', icon: ShieldCheck },
    ],
  },
]

export const PROJECT_NAV = {
  group: 'About This System',
  items: [
    { to: '/project/security', label: 'Security', icon: Shield },
    { to: '/project/testing', label: 'Testing', icon: FlaskConical },
    { to: '/project/deployment', label: 'Deployment', icon: Rocket },
    { to: '/project/review', label: 'Review', icon: ClipboardCheck },
  ],
}

export const STUDENT_TABS = [
  { to: '/app', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/app/fees', label: 'Fees', icon: Wallet },
  { to: '/app/pay', label: 'Pay', icon: CreditCard },
  { to: '/app/history', label: 'History', icon: History },
]
