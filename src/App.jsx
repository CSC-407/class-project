import { Component, lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import AppLayout from './layouts/AppLayout'
import PublicLayout from './layouts/PublicLayout'
import { Spinner } from './components/ui'
import ErrorPage from './pages/public/ErrorPage'
import { safeNext } from './lib/safeNext'

const page = (loader) => lazy(loader)

// Public
const Landing = page(() => import('./pages/public/Landing'))
const Login = page(() => import('./pages/public/Login'))
const OtpVerify = page(() => import('./pages/public/OtpVerify'))
const Register = page(() => import('./pages/public/Register'))
const VerifyEmail = page(() => import('./pages/public/VerifyEmail'))
const ForgotPassword = page(() => import('./pages/public/ForgotPassword'))
const ResetPassword = page(() => import('./pages/public/ResetPassword'))
const About = page(() => import('./pages/public/About'))
const Contact = page(() => import('./pages/public/Contact'))
const Legal = page(() => import('./pages/public/Legal'))
const VerifyReceipt = page(() => import('./pages/public/VerifyReceipt'))
const DesignSystem = page(() => import('./pages/public/DesignSystem'))

// Student
const Dashboard = page(() => import('./pages/student/Dashboard'))
const MyFees = page(() => import('./pages/student/MyFees'))
const MakePayment = page(() => import('./pages/student/MakePayment'))
const PaymentHistory = page(() => import('./pages/student/PaymentHistory'))
const Receipts = page(() => import('./pages/student/Receipts'))
const Receipt = page(() => import('./pages/student/Receipt'))
const Profile = page(() => import('./pages/student/Profile'))
const SecuritySessions = page(() => import('./pages/student/SecuritySessions'))
const Notifications = page(() => import('./pages/student/Notifications'))
const Help = page(() => import('./pages/student/Help'))

// Admin
const AdminDashboard = page(() => import('./pages/admin/AdminDashboard'))
const Students = page(() => import('./pages/admin/Students'))
const StudentDetail = page(() => import('./pages/admin/StudentDetail'))
const FeeStructures = page(() => import('./pages/admin/FeeStructures'))
const Payments = page(() => import('./pages/admin/Payments'))
const Debtors = page(() => import('./pages/admin/Debtors'))
const Reports = page(() => import('./pages/admin/Reports'))
const AuditLog = page(() => import('./pages/admin/AuditLog'))
const UserRoles = page(() => import('./pages/admin/UserRoles'))
const SystemHealth = page(() => import('./pages/admin/SystemHealth'))

// Project showcase
const SecurityPage = page(() => import('./pages/showcase/SecurityPage'))
const TestingPage = page(() => import('./pages/showcase/TestingPage'))
const DeploymentPage = page(() => import('./pages/showcase/DeploymentPage'))
const ReviewPage = page(() => import('./pages/showcase/ReviewPage'))

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="size-7" />
    </div>
  )
}

/** Client-side guard. The API enforces the same rules on every request. */
function RequireAuth() {
  const { user, booting, expired } = useAuth()
  const location = useLocation()
  if (booting) return <PageLoader />
  if (!user) return <Navigate to={`/login?${expired ? 'expired=1&' : ''}next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  return <Outlet />
}

function RequireRole({ roles }) {
  const { user } = useAuth()
  if (!roles.includes(user.role)) return <ErrorPage code={403} inApp />
  return <Outlet />
}

/** Admin landing on a student-only page goes to the admin dashboard instead. */
function StudentOnly() {
  const { user } = useAuth()
  if (user.role !== 'student') return <Navigate to="/admin" replace />
  return <Outlet />
}

function GuestOnly() {
  const { user, booting } = useAuth()
  const location = useLocation()
  if (booting) return <PageLoader />
  if (user) {
    const next = new URLSearchParams(location.search).get('next')
    return <Navigate to={safeNext(next, user.role === 'student' ? '/app' : '/admin')} replace />
  }
  return <Outlet />
}

/** Showcase pages sit inside the app shell when signed in, and the public shell otherwise. */
function ShellSwitch() {
  const { user, booting } = useAuth()
  if (booting) return <PageLoader />
  return user ? <AppLayout /> : <PublicLayout />
}

function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  if (!offline) return null
  return (
    <div role="alert" className="no-print fixed inset-x-0 top-0 z-[150] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-semibold text-brand-950">
      <WifiOff className="size-4" aria-hidden /> You’re offline. Payments are paused until your connection returns.
    </div>
  )
}

class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error) {
    // In production this goes to the error tracker (e.g. Sentry), never to the UI.
    console.error(error)
  }
  render() {
    if (this.state.error) return <ErrorPage code={500} onRetry={() => this.setState({ error: null })} />
    return this.props.children
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <BrowserRouter>
              <OfflineBanner />
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route element={<PublicLayout />}>
                      <Route path="/" element={<Landing />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/terms" element={<Legal kind="terms" />} />
                      <Route path="/privacy" element={<Legal kind="privacy" />} />
                      <Route path="/verify-receipt" element={<VerifyReceipt />} />
                      <Route path="/design-system" element={<DesignSystem />} />
                    </Route>

                    <Route element={<GuestOnly />}>
                      <Route path="/login" element={<Login />} />
                      <Route path="/login/otp" element={<OtpVerify />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                    </Route>
                    <Route path="/verify-email" element={<VerifyEmail />} />

                    <Route path="/project" element={<ShellSwitch />}>
                      <Route index element={<Navigate to="security" replace />} />
                      <Route path="security" element={<SecurityPage />} />
                      <Route path="testing" element={<TestingPage />} />
                      <Route path="deployment" element={<DeploymentPage />} />
                      <Route path="review" element={<ReviewPage />} />
                    </Route>

                    <Route element={<RequireAuth />}>
                      <Route element={<AppLayout />}>
                        <Route element={<StudentOnly />}>
                          <Route path="/app" element={<Dashboard />} />
                          <Route path="/app/fees" element={<MyFees />} />
                          <Route path="/app/pay" element={<MakePayment />} />
                          <Route path="/app/history" element={<PaymentHistory />} />
                          <Route path="/app/receipts" element={<Receipts />} />
                          <Route path="/app/receipts/:id" element={<Receipt />} />
                        </Route>
                        <Route path="/app/profile" element={<Profile />} />
                        <Route path="/app/security" element={<SecuritySessions />} />
                        <Route path="/app/notifications" element={<Notifications />} />
                        <Route path="/app/help" element={<Help />} />

                        <Route element={<RequireRole roles={['admin', 'superadmin']} />}>
                          <Route path="/admin" element={<AdminDashboard />} />
                          <Route path="/admin/students" element={<Students />} />
                          <Route path="/admin/students/:id" element={<StudentDetail />} />
                          <Route path="/admin/fees" element={<FeeStructures />} />
                          <Route path="/admin/payments" element={<Payments />} />
                          <Route path="/admin/debtors" element={<Debtors />} />
                          <Route path="/admin/reports" element={<Reports />} />
                          <Route path="/admin/audit" element={<AuditLog />} />
                        </Route>
                        <Route element={<RequireRole roles={['superadmin']} />}>
                          <Route path="/admin/users" element={<UserRoles />} />
                          <Route path="/admin/system" element={<SystemHealth />} />
                        </Route>
                        <Route path="/admin/*" element={<ErrorPage code={404} inApp />} />
                      </Route>
                    </Route>

                    <Route path="/error/:code" element={<ErrorPage />} />
                    <Route path="*" element={<ErrorPage code={404} />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
